import { Router } from "express";
import { z } from "zod";
import { prisma, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);
const final = (p: { pricePaise: number; discountPercent: number }) => Math.round((p.pricePaise * (100 - p.discountPercent)) / 100);

async function loadCart(userId: string) {
  const cart = await prisma.cart.upsert({ where: { userId }, update: {}, create: { userId },
    include: { items: { orderBy: { id: "asc" }, include: { product: { include: { images: { take: 1 } } } } } } });
  const items = cart.items.map((i) => ({ id: i.id, quantity: i.quantity,
    product: { id: i.product.id, name: i.product.name, stock: i.product.stock, imageUrl: i.product.images[0]?.url, finalPricePaise: final(i.product) } }));
  return { id: cart.id, items, subtotalPaise: items.reduce((s, i) => s + i.product.finalPricePaise * i.quantity, 0) };
}

router.get("/", async (req, res) => res.json(await loadCart(req.user!.id)));

router.post("/items", async (req, res) => {
  const b = z.object({ productId: z.string(), quantity: z.number().int().min(1).max(10) }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Invalid quantity." });
  const product = await prisma.product.findFirst({ where: { id: b.data.productId, status: "ACTIVE" } });
  if (!product) return res.status(404).json({ error: "Product not found." });
  const cart = await prisma.cart.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } });
  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId: product.id } } });
  const qty = (existing?.quantity ?? 0) + b.data.quantity;
  if (qty > product.stock) return res.status(409).json({ error: `Only ${product.stock} in stock.` });
  await prisma.cartItem.upsert({ where: { cartId_productId: { cartId: cart.id, productId: product.id } }, update: { quantity: qty }, create: { cartId: cart.id, productId: product.id, quantity: qty } });
  res.status(201).json(await loadCart(req.user!.id));
});

router.patch("/items/:id", async (req, res) => {
  const b = z.object({ quantity: z.number().int().min(1).max(10) }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Invalid quantity." });
  const item = await prisma.cartItem.findFirst({ where: { id: req.params.id, cart: { userId: req.user!.id } }, include: { product: true } });
  if (!item) return res.status(404).json({ error: "Item not found." });
  if (b.data.quantity > item.product.stock) return res.status(409).json({ error: `Only ${item.product.stock} in stock.` });
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: b.data.quantity } });
  res.json(await loadCart(req.user!.id));
});

router.delete("/items/:id", async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { id: req.params.id, cart: { userId: req.user!.id } } });
  res.json(await loadCart(req.user!.id));
});

export default router;
