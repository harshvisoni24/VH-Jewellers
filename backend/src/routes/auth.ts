import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env";
import { prisma, requireAuth } from "../middleware/auth";
import { isValidMobile, normalizePhone } from "../utils/phone";
import { sendOtpSms } from "../utils/sms";

const router = Router();
const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: env.NODE_ENV === "production", maxAge: 7 * 864e5 };
const sign = (id: string) => jwt.sign({ sub: id }, env.JWT_SECRET, { expiresIn: "7d" });

const registerSchema = z.object({
  name: z.string().min(2), email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().transform(normalizePhone).refine(isValidMobile, "Enter a valid 10-digit mobile number."),
});
const loginSchema = z.object({
  email: z.string().email(), password: z.string().min(1),
  portal: z.enum(["BUYER", "ADMIN"]), // which login door the user came through
});

// Public registration can only ever create BUYER accounts.
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Check the highlighted fields.", details: parsed.error.flatten() });
  const { name, email, password, phone } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: "An account with this email already exists." });
  if (await prisma.user.findFirst({ where: { phone: { endsWith: phone } } })) return res.status(409).json({ error: "An account with this mobile number already exists." });
  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash: await bcrypt.hash(password, 12), role: "BUYER", cart: { create: {} }, wishlist: { create: {} } },
    select: { id: true, name: true, email: true, role: true },
  });
  res.cookie("token", sign(user.id), cookieOpts);
  res.status(201).json(user);
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Enter a valid email and password." });
  const { email, password, portal } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  // Same message for wrong password or wrong portal, so the form doesn't reveal which accounts are admins.
  if (!ok || user.role !== portal) return res.status(401).json({ error: "Email or password is incorrect." });
  res.cookie("token", sign(user.id), cookieOpts);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

// ---- Forgot password via mobile OTP (works for buyers and sellers who have a mobile number on file) ----
// OTPs are kept in memory (10 min expiry, 5 attempts). They are lost if the server restarts, and the user can simply request a new one.
const otpStore = new Map<string, { hash: string; expires: number; attempts: number; lastSent: number }>();
const hashOtp = (phone: string, otp: string) => crypto.createHmac("sha256", env.JWT_SECRET).update(`${phone}:${otp}`).digest("hex");
const otpLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10 });
const findByPhone = (phone: string) => prisma.user.findMany({ where: { phone: { endsWith: phone }, isActive: true }, select: { id: true }, take: 2 });

router.post("/forgot-password", otpLimiter, async (req, res) => {
  const parsed = z.object({ phone: z.string().transform(normalizePhone).refine(isValidMobile) }).safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Enter a valid 10-digit mobile number." });
  const { phone } = parsed.data;
  const prev = otpStore.get(phone);
  const users = await findByPhone(phone);
  // Only send when exactly one account uses this number and the 60s cooldown has passed.
  if (users.length === 1 && !(prev && Date.now() - prev.lastSent < 60_000)) {
    const otp = String(crypto.randomInt(100000, 1000000));
    otpStore.set(phone, { hash: hashOtp(phone, otp), expires: Date.now() + 10 * 60_000, attempts: 0, lastSent: Date.now() });
    try { await sendOtpSms(phone, otp); } catch (e) { console.error("OTP SMS failed:", (e as Error).message); otpStore.delete(phone); }
  }
  // Same answer whether or not the number is registered, so the form can't be used to find accounts.
  res.json({ message: "If this mobile number is registered, an OTP has been sent." });
});

router.post("/reset-password", otpLimiter, async (req, res) => {
  const parsed = z.object({ phone: z.string().transform(normalizePhone).refine(isValidMobile), otp: z.string().regex(/^\d{6}$/), password: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Enter the 6-digit OTP and a password of at least 8 characters." });
  const { phone, otp, password } = parsed.data;
  const bad = () => res.status(400).json({ error: "Invalid or expired OTP." });
  const rec = otpStore.get(phone);
  if (!rec || rec.expires < Date.now()) { otpStore.delete(phone); return bad(); }
  if (++rec.attempts > 5) { otpStore.delete(phone); return bad(); }
  if (!crypto.timingSafeEqual(Buffer.from(hashOtp(phone, otp)), Buffer.from(rec.hash))) return bad();
  const users = await findByPhone(phone);
  if (users.length !== 1) { otpStore.delete(phone); return bad(); }
  await prisma.user.update({ where: { id: users[0].id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  otpStore.delete(phone);
  res.clearCookie("token", cookieOpts);
  res.json({ message: "Password changed. Please log in with your new password." });
});

// ---- One-time seller sign-up: allowed only while NO seller (ADMIN) account exists ----
// In production a SELLER_SETUP_KEY is required, so a stranger cannot claim the seller account on a fresh deployment.
const keyRequired = env.NODE_ENV === "production" || !!env.SELLER_SETUP_KEY;
const sha = (s: string) => crypto.createHash("sha256").update(s).digest();

router.get("/seller-signup", async (_req, res) => {
  const noSeller = (await prisma.user.count({ where: { role: "ADMIN" } })) === 0;
  res.json({ open: noSeller && !(keyRequired && !env.SELLER_SETUP_KEY), needsKey: keyRequired });
});

const sellerSchema = z.object({
  name: z.string().min(2), email: z.string().email(), password: z.string().min(8),
  phone: z.string().transform(normalizePhone).refine(isValidMobile, "Enter a valid 10-digit mobile number."),
  setupKey: z.string().optional(),
});

router.post("/seller-register", otpLimiter, async (req, res) => {
  const parsed = sellerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Check your name, email, 10-digit mobile number and a password of at least 8 characters." });
  const { name, email, password, phone, setupKey } = parsed.data;
  if (keyRequired && (!env.SELLER_SETUP_KEY || !crypto.timingSafeEqual(sha(setupKey ?? ""), sha(env.SELLER_SETUP_KEY))))
    return res.status(403).json({ error: "Invalid setup key." });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    // Serializable transaction: two simultaneous requests cannot both create a seller.
    const user = await prisma.$transaction(async (tx) => {
      if ((await tx.user.count({ where: { role: "ADMIN" } })) > 0) throw new Error("CLOSED");
      if (await tx.user.findUnique({ where: { email } })) throw new Error("EMAIL");
      if (await tx.user.findFirst({ where: { phone: { endsWith: phone } } })) throw new Error("PHONE");
      return tx.user.create({ data: { name, email, phone, passwordHash, role: "ADMIN" }, select: { id: true, name: true, email: true, role: true } });
    }, { isolationLevel: "Serializable" });
    res.status(201).json(user); // no login cookie here: the seller logs in on the next screen
  } catch (e) {
    const m = (e as Error).message;
    if (m === "CLOSED") return res.status(403).json({ error: "A seller account already exists. Please log in." });
    if (m === "EMAIL") return res.status(409).json({ error: "An account with this email already exists." });
    if (m === "PHONE") return res.status(409).json({ error: "An account with this mobile number already exists." });
    console.error("Seller sign-up failed:", m);
    res.status(500).json({ error: "Could not create the seller account. Try again." });
  }
});

// ---- Logged-in user changes their own login email and/or password (needs the current password) ----
router.post("/change-credentials", requireAuth, otpLimiter, async (req, res) => {
  const parsed = z.object({
    currentPassword: z.string().min(1),
    newEmail: z.string().email().optional(),
    newPassword: z.string().min(8).optional(),
    newPhone: z.string().transform(normalizePhone).refine(isValidMobile).optional(),
  }).safeParse(req.body);
  if (!parsed.success || (!parsed.data.newEmail && !parsed.data.newPassword && !parsed.data.newPhone))
    return res.status(422).json({ error: "Enter your current password and a valid new email, a 10-digit mobile number and/or a new password of at least 8 characters." });
  const { currentPassword, newEmail, newPassword, newPhone } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ error: "Current password is incorrect." });
  const data: { email?: string; passwordHash?: string; phone?: string } = {};
  if (newEmail && newEmail.toLowerCase() !== user.email.toLowerCase()) {
    if (await prisma.user.findUnique({ where: { email: newEmail } })) return res.status(409).json({ error: "An account with this email already exists." });
    data.email = newEmail;
  }
  if (newPhone) {
    if (await prisma.user.findFirst({ where: { phone: { endsWith: newPhone }, NOT: { id: user.id } } })) return res.status(409).json({ error: "This mobile number is already used by another account." });
    data.phone = newPhone;
  }
  if (newPassword) data.passwordHash = await bcrypt.hash(newPassword, 12);
  if (!Object.keys(data).length) return res.status(422).json({ error: "Nothing to change." });
  const updated = await prisma.user.update({ where: { id: user.id }, data, select: { id: true, name: true, email: true, role: true } });
  res.json(updated);
});

router.post("/logout", (_req, res) => { res.clearCookie("token", cookieOpts); res.status(204).end(); });

router.get("/me", requireAuth, async (req, res) => {
  res.json(await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true, role: true } }));
});

export default router;
