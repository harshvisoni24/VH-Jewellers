import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { prisma, requireAuth } from "../middleware/auth";

const router = Router();
const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: env.NODE_ENV === "production", maxAge: 7 * 864e5 };
const sign = (id: string) => jwt.sign({ sub: id }, env.JWT_SECRET, { expiresIn: "7d" });

const registerSchema = z.object({
  name: z.string().min(2), email: z.string().email(),
  password: z.string().min(8), phone: z.string().optional(),
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

router.post("/logout", (_req, res) => { res.clearCookie("token", cookieOpts); res.status(204).end(); });

router.get("/me", requireAuth, async (req, res) => {
  res.json(await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true, role: true } }));
});

export default router;
