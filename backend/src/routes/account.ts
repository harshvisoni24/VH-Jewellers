import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma, requireAuth } from "../middleware/auth";

const router = Router(); // mounted at /api/account
router.use(requireAuth);
const addr = z.object({ fullName: z.string().min(2), phone: z.string().min(10), line1: z.string().min(3), line2: z.string().optional(),
  city: z.string().min(2), state: z.string().min(2), pincode: z.string().regex(/^\d{6}$/), isDefault: z.boolean().optional() });

router.get("/", async (req, res) => res.json(await prisma.user.findUnique({ where: { id: req.user!.id },
  select: { name: true, email: true, phone: true, addresses: { orderBy: { id: "desc" } } } })));

router.patch("/", async (req, res) => {
  const b = z.object({ name: z.string().min(2), phone: z.string().min(10).optional() }).safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Check your name and phone number." });
  res.json(await prisma.user.update({ where: { id: req.user!.id }, data: b.data, select: { name: true, phone: true } }));
});

router.post("/addresses", async (req, res) => {
  const b = addr.safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Check the address fields." });
  res.status(201).json(await prisma.address.create({ data: { ...b.data, userId: req.user!.id } }));
});

router.patch("/addresses/:id", async (req, res) => {
  const b = addr.partial().safeParse(req.body);
  if (!b.success) return res.status(422).json({ error: "Check the address fields." });
  const r = await prisma.address.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: b.data });
  r.count ? res.json({ ok: true }) : res.status(404).json({ error: "Address not found." });
});

router.delete("/addresses/:id", async (req, res) => {
  try { await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user!.id } }); res.status(204).end(); }
  catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") return res.status(409).json({ error: "This address is on an existing order, so it can't be deleted." });
    throw e;
  }
});

export default router;
