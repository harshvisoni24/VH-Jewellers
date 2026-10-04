import { Router } from "express";
import { prisma, requireAuth } from "../middleware/auth";

const router = Router(); // mounted at /api
const final = (p: { pricePaise: number; discountPercent: number }) => Math.round((p.pricePaise * (100 - p.discountPercent)) / 100);
const include = { images: { take: 1 } };
const card = (p: { id: string; name: string; material: string; pricePaise: number; discountPercent: number; images: { url: string }[] }) =>
  ({ id: p.id, name: p.name, material: p.material, pricePaise: p.pricePaise, discountPercent: p.discountPercent, finalPricePaise: final(p), imageUrl: p.images[0]?.url });

router.get("/home", async (_req, res) => {
  const [fresh, offers, sold] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 8, include }),
    prisma.product.findMany({ where: { status: "ACTIVE", discountPercent: { gt: 0 } }, orderBy: { discountPercent: "desc" }, take: 8, include }),
    prisma.orderItem.groupBy({ by: ["productId"], _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 8 }),
  ]);
  const rank = new Map(sold.map((s, i) => [s.productId, i]));
  const best = (await prisma.product.findMany({ where: { id: { in: [...rank.keys()] }, status: "ACTIVE" }, include })).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  res.json({ newArrivals: fresh.map(card), offers: offers.map(card), bestSellers: best.map(card) });
});

router.get("/recent", async (req, res) => {
  const ids = String(req.query.ids ?? "").split(",").filter(Boolean).slice(0, 8);
  const found = await prisma.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, include });
  res.json(ids.map((id) => found.find((p) => p.id === id)).filter((p): p is (typeof found)[number] => !!p).map(card));
});

router.get("/notifications", requireAuth, async (req, res) =>
  res.json(await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, take: 30 })));

router.post("/notifications/read-all", requireAuth, async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
  res.status(204).end();
});

export default router;
