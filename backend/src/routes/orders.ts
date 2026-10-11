import { Router } from "express";
import { OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma, requireAuth } from "../middleware/auth";
import { couponDiscount, finalPrice } from "../utils/pricing";
import { getSettings } from "../utils/settings";

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const final = finalPrice;
const FREE_DELIVERY_ABOVE = 1_000_000; // ₹10,000 in paise
const DELIVERY_FEE = 25_000;

const body = z.object({
  couponCode: z.string().optional(),
  addressId: z.string().optional(),
  address: z.object({ fullName: z.string().min(2), phone: z.string().min(10), line1: z.string().min(3), line2: z.string().optional(),
    city: z.string().min(2), state: z.string().min(2), pincode: z.string().regex(/^\d{6}$/) }).optional(),
}).refine((b) => b.address || b.addressId, "Choose or enter a delivery address.");

const restoreStock = async (tx: Prisma.TransactionClient, orderId: string) => {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const i of items) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
};

const router = Router();
router.use(requireAuth);

// Prices, discounts, stock and coupons are all recalculated here from the database. Nothing from the browser is trusted.
router.post("/", async (req, res) => {
  const b = body.safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Check your delivery address.", details: b.error.flatten() });
  const userId = req.user!.id;
  try {
    const order = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId }, include: { items: { include: { product: true } } } });
      if (!cart?.items.length) throw new HttpError(409, "Your cart is empty.");
      let subtotal = 0;
      const lines = cart.items.map((i) => {
        if (i.product.status !== "ACTIVE") throw new HttpError(409, `${i.product.name} is no longer available.`);
        const price = final(i.product);
        subtotal += price * i.quantity;
        return { i, price };
      });
      // Atomic guard: the update only succeeds if enough stock is still there, so two buyers can't oversell the last piece.
      for (const { i } of lines) {
        const r = await tx.product.updateMany({ where: { id: i.productId, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
        if (r.count === 0) throw new HttpError(409, `${i.product.name} just went out of stock.`);
      }
      let discount = 0, couponId: string | undefined;
      if (b.data.couponCode) {
        const c = await tx.coupon.findUnique({ where: { code: b.data.couponCode.toUpperCase() }, include: { _count: { select: { usages: true } } } });
        const now = new Date();
        if (!c || !c.isActive || c.startsAt > now || c.endsAt < now || subtotal < c.minOrderPaise || (c.usageLimit !== null && c._count.usages >= c.usageLimit))
          throw new HttpError(422, "This coupon can't be applied to your order.");
        discount = couponDiscount(c, subtotal);
        couponId = c.id;
        await tx.couponUsage.create({ data: { couponId: c.id, userId } });
      }
      const st = await getSettings(tx);
      const delivery = subtotal - discount >= Number(st.freeDeliveryAbovePaise) ? 0 : Number(st.deliveryFeePaise);
      const address = b.data.addressId ? await tx.address.findFirst({ where: { id: b.data.addressId, userId } }) : await tx.address.create({ data: { ...b.data.address!, userId } });
      if (!address) throw new HttpError(404, "Address not found.");
      const orderNumber = `VH-${Date.now().toString(36).toUpperCase()}`;
      const created = await tx.order.create({ data: { orderNumber, userId, addressId: address.id, couponId, subtotalPaise: subtotal,
        discountPaise: discount, deliveryPaise: delivery, totalPaise: subtotal - discount + delivery,
        items: { create: lines.map((l) => ({ productId: l.i.productId, productNameSnapshot: l.i.product.name, quantity: l.i.quantity, priceAtPurchasePaise: l.price })) },
        payments: { create: { gateway: "razorpay", gatewayOrderId: `order_${orderNumber}`, amountPaise: subtotal - discount + delivery } } },
        include: { items: true } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await prisma.notification.createMany({ data: admins.map((a) => ({ userId: a.id, type: "NEW_ORDER", message: `New order ${order.orderNumber} received.` })) });
    res.status(201).json(order);
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

router.get("/", async (req, res) =>
  res.json(await prisma.order.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, include: { items: true } })));

router.get("/:id", async (req, res) => {
  const o = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user!.id }, include: { items: true, payments: true, address: true } });
  o ? res.json(o) : res.status(404).json({ error: "Order not found." });
});

router.post("/:id/cancel", async (req, res) => {
  const o = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!o) return res.status(404).json({ error: "Order not found." });
  if (!["PENDING", "PAID", "PROCESSING"].includes(o.status)) return res.status(409).json({ error: "This order can no longer be cancelled." });
  await prisma.$transaction(async (tx) => { await tx.order.update({ where: { id: o.id }, data: { status: "CANCELLED" } }); await restoreStock(tx, o.id); });
  res.json({ status: "CANCELLED" });
});

router.post("/:id/return", async (req, res) => {
  const o = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!o) return res.status(404).json({ error: "Order not found." });
  if (o.status !== "DELIVERED") return res.status(409).json({ error: "Only delivered orders can be returned." });
  await prisma.order.update({ where: { id: o.id }, data: { status: "RETURN_REQUESTED" } });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await prisma.notification.createMany({ data: admins.map((a) => ({ userId: a.id, type: "RETURN_REQUEST", message: `Return requested for order ${o.orderNumber}.` })) });
  res.json({ status: "RETURN_REQUESTED" });
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const inr = (p: number) => "₹" + (p / 100).toLocaleString("en-IN");

// Printable invoice. Use the browser's Print / Save as PDF.
router.get("/:id/invoice", async (req, res) => {
  const o = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user!.id, status: { notIn: ["PENDING", "CANCELLED"] } }, include: { items: true, address: true, user: true } });
  if (!o) return res.status(404).send("Invoice not available for this order.");
  const st = await getSettings(prisma);
  const rows = o.items.map((i) => `<tr><td>${esc(i.productNameSnapshot)}</td><td>${i.quantity}</td><td>${inr(i.priceAtPurchasePaise)}</td><td>${inr(i.priceAtPurchasePaise * i.quantity)}</td></tr>`).join("");
  res.type("html").send(`<!doctype html><meta charset="utf-8"><title>Invoice ${esc(o.orderNumber)}</title><body style="font-family:sans-serif;max-width:720px;margin:2rem auto">
<h1>${esc(st.storeName)}</h1><p>${esc(st.storeAddress)}<br>${st.gstin ? "GSTIN: " + esc(st.gstin) : ""}</p><h2>Invoice ${esc(o.orderNumber)}</h2>
<p>Date: ${o.createdAt.toLocaleDateString("en-IN")}<br>Billed to: ${esc(o.address.fullName)}, ${esc(o.address.line1)}, ${esc(o.address.city)}, ${esc(o.address.state)} ${esc(o.address.pincode)}</p>
<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr>${rows}</table>
<p>Subtotal ${inr(o.subtotalPaise)}<br>Discount −${inr(o.discountPaise)}<br>Delivery ${inr(o.deliveryPaise)}<br><strong>Total ${inr(o.totalPaise)}</strong></p><p>Use your browser's Print option to save as PDF.</p></body>`);
});

/** Admin-only (mounted behind requireRole). */
export const adminOrders = Router();
adminOrders.get("/", async (_req, res) =>
  res.json(await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true, email: true } }, items: true, payments: { select: { status: true } } } })));

adminOrders.patch("/:id/status", async (req, res) => {
  const b = z.object({ status: z.nativeEnum(OrderStatus) }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Invalid status." });
  const o = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!o) return res.status(404).json({ error: "Order not found." });
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: o.id }, data: { status: b.data.status } });
    if (b.data.status === "CANCELLED" && o.status !== "CANCELLED") await restoreStock(tx, o.id);
    if (b.data.status === "RETURNED" && o.status !== "RETURNED") await restoreStock(tx, o.id);
    if (b.data.status === "DELIVERED") await tx.payment.updateMany({ where: { orderId: o.id, gateway: "cod", status: { not: "PAID" } }, data: { status: "PAID" } });
    if (b.data.status === "REFUNDED") await tx.payment.updateMany({ where: { orderId: o.id }, data: { status: "REFUNDED" } });
    await tx.notification.create({ data: { userId: o.userId, type: "ORDER_STATUS", message: `Your order ${o.orderNumber} is now ${b.data.status.replace(/_/g, " ").toLowerCase()}.` } });
  });
  res.json({ status: b.data.status });
});

export default router;
