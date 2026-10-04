import { Router } from "express";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { prisma } from "../middleware/auth";
import { getSettings } from "../utils/settings";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_r, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname).toLowerCase()) }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(f.mimetype) && /\.(jpe?g|png|webp)$/i.test(f.originalname)),
});

export const adminExtras = Router(); // mounted behind requireAuth + requireRole("ADMIN")

adminExtras.get("/customers", async (_req, res) => {
  const [users, spend] = await Promise.all([
    prisma.user.findMany({ where: { role: "BUYER" }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, phone: true, createdAt: true, isActive: true, _count: { select: { orders: true } } } }), // passwordHash is never selected
    prisma.order.groupBy({ by: ["userId"], where: { status: { notIn: ["PENDING", "CANCELLED", "REFUNDED"] } }, _sum: { totalPaise: true } }),
  ]);
  const byUser = new Map(spend.map((s) => [s.userId, s._sum.totalPaise ?? 0]));
  res.json(users.map((u) => ({ ...u, orders: u._count.orders, totalSpentPaise: byUser.get(u.id) ?? 0 })));
});

adminExtras.patch("/customers/:id", async (req, res) => {
  const b = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Invalid request." });
  await prisma.user.updateMany({ where: { id: req.params.id, role: "BUYER" }, data: { isActive: b.data.isActive } });
  res.json({ ok: true });
});

adminExtras.get("/inventory", async (_req, res) => {
  const products = await prisma.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { stock: "asc" }, select: { id: true, sku: true, name: true, stock: true, reservedStock: true } });
  res.json(products.map((p) => { const available = p.stock - p.reservedStock;
    return { ...p, available, status: available <= 0 ? "OUT OF STOCK" : available <= 3 ? "LOW STOCK" : "IN STOCK" }; }));
});

adminExtras.get("/coupons", async (_req, res) => res.json(await prisma.coupon.findMany({ orderBy: { endsAt: "desc" }, include: { _count: { select: { usages: true } } } })));

adminExtras.post("/coupons", async (req, res) => {
  const b = z.object({ code: z.string().min(3).transform((s) => s.toUpperCase()), discountType: z.enum(["PERCENTAGE", "FIXED"]), discountValue: z.number().int().positive(),
    minOrderPaise: z.number().int().min(0).default(0), maxDiscountPaise: z.number().int().positive().optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date(), usageLimit: z.number().int().positive().optional() })
    .refine((c) => c.discountType === "FIXED" || c.discountValue <= 100, "Percentage can't exceed 100").safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Check the coupon details.", details: b.error.flatten() });
  if (await prisma.coupon.findUnique({ where: { code: b.data.code } })) return res.status(409).json({ error: "That coupon code already exists." });
  res.status(201).json(await prisma.coupon.create({ data: b.data }));
});

adminExtras.patch("/coupons/:id", async (req, res) => {
  const b = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Invalid request." });
  res.json(await prisma.coupon.update({ where: { id: req.params.id }, data: b.data }));
});

adminExtras.get("/summary", async (_req, res) => {
  const paid = { status: { notIn: ["PENDING", "CANCELLED", "REFUNDED"] as OrderStatus[] } };
  const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
  const m1 = new Date(m0); m1.setMonth(m1.getMonth() - 1);
  const [sales, orders, customers, products, pending, lowStock, recent, thisM, lastM] = await Promise.all([
    prisma.order.aggregate({ where: paid, _sum: { totalPaise: true } }), prisma.order.count(),
    prisma.user.count({ where: { role: "BUYER" } }), prisma.product.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.order.count({ where: { status: { in: ["PENDING", "PAID", "PROCESSING"] } } }),
    prisma.product.findMany({ where: { status: "ACTIVE", stock: { lte: 3 } }, orderBy: { stock: "asc" }, take: 8, select: { id: true, name: true, stock: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } } } }),
    prisma.order.aggregate({ where: { ...paid, createdAt: { gte: m0 } }, _sum: { totalPaise: true } }),
    prisma.order.aggregate({ where: { ...paid, createdAt: { gte: m1, lt: m0 } }, _sum: { totalPaise: true } }),
  ]);
  const a = thisM._sum.totalPaise ?? 0, b = lastM._sum.totalPaise ?? 0;
  res.json({ totalSalesPaise: sales._sum.totalPaise ?? 0, orders, customers, products, pending, lowStock,
    recentOrders: recent.map((o) => ({ id: o.id, orderNumber: o.orderNumber, customer: o.user.name, totalPaise: o.totalPaise, status: o.status })),
    thisMonthPaise: a, lastMonthPaise: b, growthPercent: b ? Math.round(((a - b) / b) * 10000) / 100 : null });
});

adminExtras.get("/categories", async (_req, res) => res.json(await prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } })));

adminExtras.post("/categories", async (req, res) => {
  const b = z.object({ name: z.string().min(2).max(40) }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Enter a category name." });
  const slug = b.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (await prisma.category.findFirst({ where: { OR: [{ slug }, { name: b.data.name }] } })) return res.status(409).json({ error: "That category already exists." });
  res.status(201).json(await prisma.category.create({ data: { name: b.data.name, slug } }));
});

adminExtras.delete("/categories/:id", async (req, res) => {
  if (await prisma.product.count({ where: { categoryId: req.params.id } })) return res.status(409).json({ error: "Move or delete this category's products first." });
  await prisma.category.deleteMany({ where: { id: req.params.id } });
  res.status(204).end();
});

adminExtras.get("/reviews", async (_req, res) => res.json(await prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: 100,
  select: { id: true, rating: true, title: true, comment: true, createdAt: true, user: { select: { name: true } }, product: { select: { name: true } } } })));

adminExtras.delete("/reviews/:id", async (req, res) => {
  const r = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!r) return res.status(404).json({ error: "Review not found." });
  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: r.id } });
    const agg = await tx.review.aggregate({ where: { productId: r.productId }, _avg: { rating: true }, _count: true });
    await tx.product.update({ where: { id: r.productId }, data: { ratingAvg: agg._avg.rating ?? 0, reviewCount: agg._count } });
  });
  res.status(204).end();
});

// Full product (any status) for the edit screen, plus image management.
adminExtras.get("/products/:id", async (req, res) => {
  const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: { images: { orderBy: { position: "asc" } } } });
  p ? res.json(p) : res.status(404).json({ error: "Product not found." });
});

adminExtras.post("/products/:id/images", async (req, res) => {
  const b = z.object({ url: z.string().url() }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Enter a valid image URL." });
  const count = await prisma.productImage.count({ where: { productId: req.params.id } });
  res.status(201).json(await prisma.productImage.create({ data: { productId: req.params.id, url: b.data.url, isMain: count === 0, position: count } }));
});

adminExtras.delete("/images/:id", async (req, res) => { await prisma.productImage.deleteMany({ where: { id: req.params.id } }); res.status(204).end(); });

adminExtras.post("/products/:id/images/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(422).json({ error: "Choose a JPG, PNG or WebP image under 5 MB." });
  const count = await prisma.productImage.count({ where: { productId: req.params.id } });
  res.status(201).json(await prisma.productImage.create({ data: { productId: req.params.id, url: `/uploads/${req.file.filename}`, isMain: count === 0, position: count } }));
});

adminExtras.get("/questions", async (_req, res) => res.json(await prisma.question.findMany({ orderBy: { createdAt: "desc" }, take: 100,
  select: { id: true, question: true, answer: true, createdAt: true, user: { select: { name: true } }, product: { select: { name: true } } } })));

adminExtras.patch("/questions/:id", async (req, res) => {
  const b = z.object({ answer: z.string().min(1).max(1000) }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Write an answer." });
  res.json(await prisma.question.update({ where: { id: req.params.id }, data: { answer: b.data.answer } }));
});

adminExtras.get("/settings", async (_req, res) => {
  const s = await getSettings(prisma);
  res.json({ storeName: s.storeName, supportEmail: s.supportEmail, gstin: s.gstin, storeAddress: s.storeAddress, freeDeliveryAbove: Number(s.freeDeliveryAbovePaise) / 100, deliveryFee: Number(s.deliveryFeePaise) / 100 });
});

adminExtras.put("/settings", async (req, res) => {
  const b = z.object({ storeName: z.string().min(2), supportEmail: z.string().email().or(z.literal("")), gstin: z.string().max(20), storeAddress: z.string().max(300),
    freeDeliveryAbove: z.number().min(0), deliveryFee: z.number().min(0) }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Check the settings values." });
  const d = b.data;
  const entries = { storeName: d.storeName, supportEmail: d.supportEmail, gstin: d.gstin, storeAddress: d.storeAddress,
    freeDeliveryAbovePaise: String(Math.round(d.freeDeliveryAbove * 100)), deliveryFeePaise: String(Math.round(d.deliveryFee * 100)) };
  await prisma.$transaction(Object.entries(entries).map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })));
  res.json({ ok: true });
});
