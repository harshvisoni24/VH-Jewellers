import crypto from "crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../middleware/auth";
import { couponDiscount, finalPrice } from "../utils/pricing";
import { getSettings } from "../utils/settings";

/**
 * Public storefront API (mounted at /api/shop). No login: buyers keep their cart in the browser and
 * give their details at checkout. Everything that matters (prices, stock, coupon, delivery fee, totals)
 * is recalculated here from the database; the browser only says which products and how many.
 */
export const shop = Router();

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const hourly = (limit: number) => rateLimit({ windowMs: 60 * 60_000, limit, message: { error: "Too many attempts. Please try again in a little while." } });
const ci = (value: string) => ({ equals: value, mode: "insensitive" as const });
const PAID_STATES = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

/** A checkout creates (or reuses, matched by email) a customer record with an unusable password: there is no buyer login. */
async function customerFor(tx: Prisma.TransactionClient, c: { name: string; email: string; phone: string }, unusablePasswordHash: string) {
  const existing = await tx.user.findFirst({ where: { email: ci(c.email) } });
  if (existing) {
    if (existing.role !== "BUYER") throw new HttpError(409, "This email address can't be used for checkout. Please use a different one.");
    if (!existing.isActive) throw new HttpError(403, "This customer account has been disabled. Please contact the store.");
    return existing;
  }
  return tx.user.create({ data: { name: c.name, email: c.email, phone: c.phone, passwordHash: unusablePasswordHash, role: "BUYER" } });
}
const throwaway = () => bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);

// ---------- Cart / wishlist pricing ----------
shop.get("/cart-items", async (req, res) => {
  const ids = String(req.query.ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
  const products = ids.length ? await prisma.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, include: { images: { orderBy: { position: "asc" }, take: 1 } } }) : [];
  const st = await getSettings(prisma);
  res.json({
    items: products.map((p) => ({ id: p.id, name: p.name, stock: p.stock, imageUrl: p.images[0]?.url, pricePaise: p.pricePaise, discountPercent: p.discountPercent, finalPricePaise: finalPrice(p) })),
    delivery: { freeAbovePaise: Number(st.freeDeliveryAbovePaise), feePaise: Number(st.deliveryFeePaise) },
  });
});

// ---------- Place an order (guest checkout, cash on delivery) ----------
const orderBody = z.object({
  customer: z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/) }),
  address: z.object({ line1: z.string().trim().min(3).max(120), line2: z.string().trim().max(120).optional(), city: z.string().trim().min(2).max(60), state: z.string().trim().min(2).max(60), pincode: z.string().trim().regex(/^\d{6}$/) }),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(10) })).min(1).max(30),
  couponCode: z.string().trim().max(40).optional(),
});

shop.post("/orders", hourly(30), async (req, res) => {
  const b = orderBody.safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Please check your details and try again.", details: b.error.flatten() });
  const { customer, address, couponCode } = b.data;
  const wanted = new Map<string, number>();
  for (const i of b.data.items) wanted.set(i.productId, (wanted.get(i.productId) ?? 0) + i.quantity);
  if ([...wanted.values()].some((q) => q > 10)) return res.status(422).json({ error: "You can order up to 10 of one item." });
  const passwordHash = await throwaway();
  try {
    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: [...wanted.keys()] } } });
      const byId = new Map(products.map((p) => [p.id, p]));
      let subtotal = 0;
      const lines = [...wanted].map(([productId, quantity]) => {
        const p = byId.get(productId);
        if (!p || p.status !== "ACTIVE") throw new HttpError(409, `${p?.name ?? "An item in your cart"} is no longer available. Please remove it from your cart.`);
        const price = finalPrice(p);
        subtotal += price * quantity;
        return { p, quantity, price };
      });
      // Atomic guard: the update only succeeds if enough stock is still there, so two buyers can't oversell the last piece.
      for (const { p, quantity } of lines) {
        const r = await tx.product.updateMany({ where: { id: p.id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
        if (r.count === 0) throw new HttpError(409, `${p.name} just went out of stock or has fewer pieces left than your cart. Please update your cart.`);
      }
      const user = await customerFor(tx, customer, passwordHash);
      let discount = 0, couponId: string | undefined;
      if (couponCode) {
        const c = await tx.coupon.findUnique({ where: { code: couponCode.toUpperCase() }, include: { _count: { select: { usages: true } } } });
        const now = new Date();
        if (!c || !c.isActive || c.startsAt > now || c.endsAt < now || subtotal < c.minOrderPaise || (c.usageLimit !== null && c._count.usages >= c.usageLimit))
          throw new HttpError(422, "This coupon can't be applied to your order.");
        discount = couponDiscount(c, subtotal);
        couponId = c.id;
        await tx.couponUsage.create({ data: { couponId: c.id, userId: user.id } });
      }
      const st = await getSettings(tx);
      const delivery = subtotal - discount >= Number(st.freeDeliveryAbovePaise) ? 0 : Number(st.deliveryFeePaise);
      const total = subtotal - discount + delivery;
      const addr = await tx.address.create({ data: { userId: user.id, fullName: customer.name, phone: customer.phone, line1: address.line1, line2: address.line2 || null, city: address.city, state: address.state, pincode: address.pincode } });
      const orderNumber = `VH-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(1).toString("hex").toUpperCase()}`;
      return tx.order.create({
        data: { orderNumber, userId: user.id, addressId: addr.id, couponId, subtotalPaise: subtotal, discountPaise: discount, deliveryPaise: delivery, totalPaise: total,
          items: { create: lines.map((l) => ({ productId: l.p.id, productNameSnapshot: l.p.name, quantity: l.quantity, priceAtPurchasePaise: l.price })) },
          payments: { create: { gateway: "cod", method: "COD", gatewayOrderId: `cod_${orderNumber}`, amountPaise: total } } },
        include: { items: true },
      });
    });
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await prisma.notification.createMany({ data: admins.map((a) => ({ userId: a.id, type: "NEW_ORDER", message: `New order ${order.orderNumber} received.` })) });
    res.status(201).json({ orderNumber: order.orderNumber, status: order.status, paymentMethod: "COD", createdAt: order.createdAt,
      subtotalPaise: order.subtotalPaise, discountPaise: order.discountPaise, deliveryPaise: order.deliveryPaise, totalPaise: order.totalPaise,
      items: order.items.map((i) => ({ name: i.productNameSnapshot, quantity: i.quantity, pricePaise: i.priceAtPurchasePaise })) });
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return res.status(409).json({ error: "We couldn't place the order. Please try once more." });
    throw e;
  }
});

// ---------- Track an order: order number + the email used at checkout ----------
shop.get("/track", rateLimit({ windowMs: 15 * 60_000, limit: 30, message: { error: "Too many lookups. Please try again in a few minutes." } }), async (req, res) => {
  const q = z.object({ orderNumber: z.string().trim().min(3).max(40), email: z.string().trim().email() }).safeParse(req.query);
  if (!q.success) return res.status(422).json({ error: "Enter your order number and the email you used at checkout." });
  const o = await prisma.order.findFirst({ where: { orderNumber: ci(q.data.orderNumber), user: { email: ci(q.data.email) } },
    select: { orderNumber: true, status: true, createdAt: true, subtotalPaise: true, discountPaise: true, deliveryPaise: true, totalPaise: true,
      items: { select: { productNameSnapshot: true, quantity: true, priceAtPurchasePaise: true } }, payments: { select: { method: true, status: true } },
      address: { select: { fullName: true, city: true, state: true, pincode: true } } } });
  if (!o) return res.status(404).json({ error: "We couldn't find an order with those details. Check the order number and email." });
  res.json({ ...o, items: o.items.map((i) => ({ name: i.productNameSnapshot, quantity: i.quantity, pricePaise: i.priceAtPurchasePaise })) });
});

// ---------- Reviews: proven by order number + email (only real customers can review) ----------
shop.post("/products/:id/reviews", hourly(20), async (req, res) => {
  const b = z.object({ orderNumber: z.string().trim().min(3).max(40), email: z.string().trim().email(), rating: z.number().int().min(1).max(5),
    title: z.string().trim().min(2).max(100), comment: z.string().trim().min(5).max(2000) }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Add your order number, email, a rating, a title and a short comment." });
  const productId = req.params.id;
  const order = await prisma.order.findFirst({ where: { orderNumber: ci(b.data.orderNumber), user: { email: ci(b.data.email) }, status: { in: [...PAID_STATES] }, items: { some: { productId } } }, select: { userId: true } });
  if (!order) return res.status(403).json({ error: "We couldn't match that order number and email to a confirmed purchase of this product." });
  const { orderNumber: _o, email: _e, ...review } = b.data;
  await prisma.$transaction(async (tx) => {
    await tx.review.upsert({ where: { userId_productId: { userId: order.userId, productId } }, update: review, create: { ...review, userId: order.userId, productId, verifiedPurchase: true } });
    const agg = await tx.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true });
    await tx.product.update({ where: { id: productId }, data: { ratingAvg: agg._avg.rating ?? 0, reviewCount: agg._count } });
  });
  res.status(201).json({ ok: true });
});

// ---------- Questions: anyone can ask; shown as "Customer" so no personal details are collected ----------
const ASKER_EMAIL = "customer-questions@vhjewellers.invalid"; // placeholder owner for guest questions; excluded from the Customers list
shop.post("/products/:id/questions", hourly(20), async (req, res) => {
  const b = z.object({ question: z.string().trim().min(5).max(500) }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Write a question of at least 5 characters." });
  const product = await prisma.product.findFirst({ where: { id: req.params.id, status: "ACTIVE" }, select: { id: true } });
  if (!product) return res.status(404).json({ error: "Product not found." });
  const asker = await prisma.user.upsert({ where: { email: ASKER_EMAIL }, update: {}, create: { name: "Customer", email: ASKER_EMAIL, passwordHash: await throwaway(), role: "BUYER", isActive: false } });
  await prisma.question.create({ data: { question: b.data.question, productId: product.id, userId: asker.id } });
  res.status(201).json({ ok: true });
});