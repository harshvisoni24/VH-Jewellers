import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma, requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const finalPrice = (p: { pricePaise: number; discountPercent: number }) => Math.round((p.pricePaise * (100 - p.discountPercent)) / 100);
const withFinal = <T extends { pricePaise: number; discountPercent: number }>(p: T) => ({ ...p, finalPricePaise: finalPrice(p) });

const listQuery = z.object({
  q: z.string().optional(), category: z.string().optional(), material: z.string().optional(),
  minPrice: z.coerce.number().optional(), maxPrice: z.coerce.number().optional(), // in rupees
  minRating: z.coerce.number().min(1).max(5).optional(), inStock: z.enum(["1"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "rating"]).default("newest"),
  page: z.coerce.number().min(1).default(1), pageSize: z.coerce.number().min(1).max(48).default(12),
});

router.get("/", async (req, res) => {
  const p = listQuery.safeParse(req.query);
  if (!p.success) return res.status(422).json({ error: "Invalid filters." });
  const { q, category, material, minPrice, maxPrice, minRating, inStock, sort, page, pageSize } = p.data;
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(minRating && { ratingAvg: { gte: minRating } }),
    ...(inStock && { stock: { gt: 0 } }),
    ...(category && { category: { slug: category } }),
    ...(material && { material: { equals: material, mode: "insensitive" } }),
    ...((minPrice || maxPrice) && { pricePaise: { gte: (minPrice ?? 0) * 100, ...(maxPrice && { lte: maxPrice * 100 }) } }),
    ...(q && { OR: [
      { name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } },
      { material: { contains: q, mode: "insensitive" } }, { brand: { contains: q, mode: "insensitive" } }, { tags: { has: q.toLowerCase() } } ] }),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc" ? { pricePaise: "asc" } : sort === "price_desc" ? { pricePaise: "desc" } : sort === "rating" ? { ratingAvg: "desc" } : { createdAt: "desc" };
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: { images: { orderBy: { position: "asc" } }, category: true } }),
  ]);
  res.json({ total, page, pageSize, items: items.map(withFinal) });
});

router.get("/suggest", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) return res.json([]);
  const rows = await prisma.product.findMany({ where: { status: "ACTIVE", name: { contains: q, mode: "insensitive" } }, select: { name: true }, take: 6 });
  res.json(rows.map((r) => r.name));
});

router.get("/:id", async (req, res) => {
  const product = await prisma.product.findFirst({ where: { id: req.params.id, status: "ACTIVE" }, include: { images: true, category: true } });
  product ? res.json(withFinal(product)) : res.status(404).json({ error: "Product not found." });
});

const productBody = z.object({
  sku: z.string().min(2), name: z.string().min(2), description: z.string().min(1), categoryId: z.string(),
  pricePaise: z.number().int().positive(), discountPercent: z.number().int().min(0).max(90).default(0),
  stock: z.number().int().min(0), material: z.string(), purity: z.string().optional(), weightGrams: z.number().positive().optional(),
  size: z.string().optional(), color: z.string().optional(), brand: z.string().optional(), tags: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"), imageUrls: z.array(z.string().url()).default([]),
});
const adminOnly = [requireAuth, requireRole("ADMIN")];

router.post("/", ...adminOnly, async (req, res) => {
  const b = productBody.safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Check the product details.", details: b.error.flatten() });
  const { imageUrls, ...data } = b.data;
  try {
    res.status(201).json(await prisma.product.create({ data: { ...data, images: { create: imageUrls.map((url, i) => ({ url, isMain: i === 0, position: i })) } } }));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return res.status(409).json({ error: "That SKU already exists." });
    throw e;
  }
});

router.patch("/:id", ...adminOnly, async (req, res) => {
  const b = productBody.omit({ imageUrls: true }).partial().safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Check the product details.", details: b.error.flatten() });
  res.json(await prisma.product.update({ where: { id: req.params.id }, data: b.data }));
});

// Archive instead of hard-delete when the product already appears in orders.
router.delete("/:id", ...adminOnly, async (req, res) => {
  const sold = await prisma.orderItem.count({ where: { productId: req.params.id } });
  if (sold) { await prisma.product.update({ where: { id: req.params.id }, data: { status: "ARCHIVED" } }); return res.json({ archived: true }); }
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
