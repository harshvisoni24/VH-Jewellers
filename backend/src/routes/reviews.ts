import { Router } from "express";
import { z } from "zod";
import { prisma, requireAuth } from "../middleware/auth";

const router = Router(); // mounted at /api/products

router.get("/:id/reviews", async (req, res) => {
  const reviews = await prisma.review.findMany({ where: { productId: req.params.id }, orderBy: { createdAt: "desc" }, take: 50,
    select: { id: true, rating: true, title: true, comment: true, verifiedPurchase: true, createdAt: true, user: { select: { name: true } } } });
  const dist = await prisma.review.groupBy({ by: ["rating"], where: { productId: req.params.id }, _count: true });
  res.json({ reviews, distribution: Object.fromEntries(dist.map((d) => [d.rating, d._count])) });
});

router.post("/:id/reviews", requireAuth, async (req, res) => {
  const b = z.object({ rating: z.number().int().min(1).max(5), title: z.string().min(2).max(100), comment: z.string().min(5).max(2000) }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Add a rating, a title and a short comment." });
  const userId = req.user!.id, productId = req.params.id;
  const bought = await prisma.orderItem.findFirst({ where: { productId, order: { userId, status: { in: ["PAID", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] } } } });
  if (!bought) return res.status(403).json({ error: "Only customers who bought this product can review it." });
  await prisma.$transaction(async (tx) => {
    await tx.review.upsert({ where: { userId_productId: { userId, productId } }, update: b.data, create: { ...b.data, userId, productId, verifiedPurchase: true } });
    const agg = await tx.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true });
    await tx.product.update({ where: { id: productId }, data: { ratingAvg: agg._avg.rating ?? 0, reviewCount: agg._count } });
  });
  res.status(201).json({ ok: true });
});

router.get("/:id/questions", async (req, res) =>
  res.json(await prisma.question.findMany({ where: { productId: req.params.id }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, question: true, answer: true, createdAt: true, user: { select: { name: true } } } })));

router.post("/:id/questions", requireAuth, async (req, res) => {
  const b = z.object({ question: z.string().min(5).max(500) }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Write a question of at least 5 characters." });
  res.status(201).json(await prisma.question.create({ data: { question: b.data.question, productId: req.params.id, userId: req.user!.id } }));
});

export default router;
