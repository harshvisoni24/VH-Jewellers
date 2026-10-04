import { Router } from "express";
import { z } from "zod";
import { prisma, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);
const final = (p: { pricePaise: number; discountPercent: number }) => Math.round((p.pricePaise * (100 - p.discountPercent)) / 100);

async function load(userId: string) {
  const w = await prisma.wishlist.upsert({ where: { userId }, update: {}, create: { userId },
    include: { items: { include: { product: { include: { images: { take: 1 } } } } } } });
  return w.items.map((i) => ({ id: i.id, product: { id: i.product.id, name: i.product.name, stock: i.product.stock, imageUrl: i.product.images[0]?.url, finalPricePaise: final(i.product) } }));
}

router.get("/", async (req, res) => res.json(await load(req.user!.id)));

router.post("/items", async (req, res) => {
  const b = z.object({ productId: z.string() }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Invalid product." });
  if (!(await prisma.product.findFirst({ where: { id: b.data.productId, status: "ACTIVE" } }))) return res.status(404).json({ error: "Product not found." });
  const w = await prisma.wishlist.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } });
  await prisma.wishlistItem.upsert({ where: { wishlistId_productId: { wishlistId: w.id, productId: b.data.productId } }, update: {}, create: { wishlistId: w.id, productId: b.data.productId } });
  res.status(201).json(await load(req.user!.id));
});

router.delete("/items/:productId", async (req, res) => {
  await prisma.wishlistItem.deleteMany({ where: { productId: req.params.productId, wishlist: { userId: req.user!.id } } });
  res.json(await load(req.user!.id));
});

export default router;
