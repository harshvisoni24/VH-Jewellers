import { Router } from "express";
import { OrderStatus, Prisma, ProductStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../middleware/auth";

/**
 * Seller-portal list endpoints (products, orders, inventory, customers).
 * Mounted at /api/admin/list behind requireAuth + requireRole("ADMIN").
 * Every list is filtered, sorted and paginated on the server (20 per page by default).
 * Amount filters are entered in rupees and converted to paise here.
 */
export const adminLists = Router();

const PAGE_SIZE = 20;

// Empty strings coming from blank filter boxes are treated as "not set".
const opt = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (v === "" || v === undefined ? undefined : v), s.optional());
const rupees = opt(z.coerce.number().min(0));
const paging = {
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(PAGE_SIZE),
};
const paise = (min?: number, max?: number) =>
  min === undefined && max === undefined ? undefined
    : { ...(min !== undefined && { gte: Math.round(min * 100) }), ...(max !== undefined && { lte: Math.round(max * 100) }) };

/** Clamp the requested page into range so deleting the last row of a page never leaves the admin on an empty page. */
const pageInfo = (total: number, page: number, pageSize: number) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  return { total, page: current, pageSize, pages, skip: (current - 1) * pageSize };
};

// ---------- Products ----------
const productQuery = z.object({
  q: opt(z.string().trim()), category: opt(z.string()), status: opt(z.nativeEnum(ProductStatus)),
  minPrice: rupees, maxPrice: rupees,
  sort: z.enum(["newest", "oldest", "price_asc", "price_desc", "name"]).catch("newest"), ...paging,
});

adminLists.get("/products", async (req, res) => {
  const p = productQuery.safeParse(req.query);
  if (!p.success) return res.status(422).json({ error: "Invalid filters." });
  const { q, category, status, minPrice, maxPrice, sort } = p.data;
  const where: Prisma.ProductWhereInput = {
    status: status ?? { not: "ARCHIVED" }, // archived (sold-then-deleted) products stay hidden unless asked for
    ...(category && { categoryId: category }),
    ...(paise(minPrice, maxPrice) && { pricePaise: paise(minPrice, maxPrice) }),
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc" ? { pricePaise: "asc" } : sort === "price_desc" ? { pricePaise: "desc" }
      : sort === "name" ? { name: "asc" } : sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };
  const info = pageInfo(await prisma.product.count({ where }), p.data.page, p.data.pageSize);
  const items = await prisma.product.findMany({ where, orderBy: [orderBy, { id: "asc" }], skip: info.skip, take: info.pageSize,
    select: { id: true, sku: true, name: true, pricePaise: true, discountPercent: true, stock: true, status: true, category: { select: { id: true, name: true } } } });
  res.json({ total: info.total, page: info.page, pageSize: info.pageSize, pages: info.pages, items });
});

// ---------- Orders ----------
const orderQuery = z.object({
  q: opt(z.string().trim()), status: opt(z.nativeEnum(OrderStatus)), category: opt(z.string()),
  minAmount: rupees, maxAmount: rupees,
  sort: z.enum(["newest", "oldest", "amount_desc", "amount_asc"]).catch("newest"), ...paging,
});

adminLists.get("/orders", async (req, res) => {
  const p = orderQuery.safeParse(req.query);
  if (!p.success) return res.status(422).json({ error: "Invalid filters." });
  const { q, status, category, minAmount, maxAmount, sort } = p.data;
  const where: Prisma.OrderWhereInput = {
    ...(status && { status }),
    // "Category" = the order contains at least one product from that category.
    ...(category && { items: { some: { product: { categoryId: category } } } }),
    ...(paise(minAmount, maxAmount) && { totalPaise: paise(minAmount, maxAmount) }),
    ...(q && { OR: [{ orderNumber: { contains: q, mode: "insensitive" } }, { user: { name: { contains: q, mode: "insensitive" } } }, { user: { email: { contains: q, mode: "insensitive" } } }] }),
  };
  const orderBy: Prisma.OrderOrderByWithRelationInput =
    sort === "amount_desc" ? { totalPaise: "desc" } : sort === "amount_asc" ? { totalPaise: "asc" } : sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };
  const info = pageInfo(await prisma.order.count({ where }), p.data.page, p.data.pageSize);
  const items = await prisma.order.findMany({ where, orderBy: [orderBy, { id: "asc" }], skip: info.skip, take: info.pageSize,
    select: { id: true, orderNumber: true, status: true, totalPaise: true, createdAt: true, user: { select: { name: true, email: true } },
      items: { select: { id: true, productNameSnapshot: true } }, payments: { select: { status: true, method: true } } } });
  res.json({ total: info.total, page: info.page, pageSize: info.pageSize, pages: info.pages, items });
});

// ---------- Inventory ----------
const inventoryQuery = z.object({
  q: opt(z.string().trim()), category: opt(z.string()), stock: opt(z.enum(["in", "low", "out"])),
  sort: z.enum(["stock_asc", "stock_desc", "name", "newest"]).catch("stock_asc"), ...paging,
});

adminLists.get("/inventory", async (req, res) => {
  const p = inventoryQuery.safeParse(req.query);
  if (!p.success) return res.status(422).json({ error: "Invalid filters." });
  const { q, category, stock, sort } = p.data;
  const where: Prisma.ProductWhereInput = {
    status: { not: "ARCHIVED" },
    ...(category && { categoryId: category }),
    ...(stock === "out" && { stock: { lte: 0 } }),
    ...(stock === "low" && { stock: { gt: 0, lte: 3 } }),
    ...(stock === "in" && { stock: { gt: 3 } }),
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "stock_desc" ? { stock: "desc" } : sort === "name" ? { name: "asc" } : sort === "newest" ? { createdAt: "desc" } : { stock: "asc" };
  const info = pageInfo(await prisma.product.count({ where }), p.data.page, p.data.pageSize);
  const rows = await prisma.product.findMany({ where, orderBy: [orderBy, { id: "asc" }], skip: info.skip, take: info.pageSize,
    select: { id: true, sku: true, name: true, stock: true, reservedStock: true, category: { select: { name: true } } } });
  const items = rows.map((r) => { const available = r.stock - r.reservedStock;
    return { ...r, available, status: available <= 0 ? "OUT OF STOCK" : available <= 3 ? "LOW STOCK" : "IN STOCK" }; });
  res.json({ total: info.total, page: info.page, pageSize: info.pageSize, pages: info.pages, items });
});

// ---------- Customers ----------
const customerQuery = z.object({
  q: opt(z.string().trim()), account: opt(z.enum(["active", "disabled"])), ordered: opt(z.enum(["yes", "no"])),
  minSpent: rupees, maxSpent: rupees,
  sort: z.enum(["newest", "oldest", "name", "orders_desc", "spent_desc", "spent_asc"]).catch("newest"), ...paging,
});

adminLists.get("/customers", async (req, res) => {
  const p = customerQuery.safeParse(req.query);
  if (!p.success) return res.status(422).json({ error: "Invalid filters." });
  const { q, account, ordered, minSpent, maxSpent, sort } = p.data;
  const where: Prisma.UserWhereInput = {
    role: "BUYER",
    ...(account && { isActive: account === "active" }),
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }),
  };
  // "Total spent" is an aggregate across orders, so it can't be a database sort key. The customer list is small
  // (light columns only), so filtering/sorting/paging by spend is done here after one grouped query.
  const [users, spend] = await Promise.all([
    prisma.user.findMany({ where, select: { id: true, name: true, email: true, phone: true, createdAt: true, isActive: true, _count: { select: { orders: true } } } }), // passwordHash is never selected
    prisma.order.groupBy({ by: ["userId"], where: { status: { notIn: ["PENDING", "CANCELLED", "REFUNDED"] } }, _sum: { totalPaise: true } }),
  ]);
  const spentBy = new Map(spend.map((s) => [s.userId, s._sum.totalPaise ?? 0]));
  const lo = minSpent === undefined ? undefined : Math.round(minSpent * 100), hi = maxSpent === undefined ? undefined : Math.round(maxSpent * 100);
  const rows = users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt, isActive: u.isActive, orders: u._count.orders, totalSpentPaise: spentBy.get(u.id) ?? 0 }))
    .filter((u) => (ordered === "yes" ? u.orders > 0 : ordered === "no" ? u.orders === 0 : true)
      && (lo === undefined || u.totalSpentPaise >= lo) && (hi === undefined || u.totalSpentPaise <= hi));
  const cmp: Record<string, (a: typeof rows[number], b: typeof rows[number]) => number> = {
    newest: (a, b) => +b.createdAt - +a.createdAt, oldest: (a, b) => +a.createdAt - +b.createdAt, name: (a, b) => a.name.localeCompare(b.name),
    orders_desc: (a, b) => b.orders - a.orders, spent_desc: (a, b) => b.totalSpentPaise - a.totalSpentPaise, spent_asc: (a, b) => a.totalSpentPaise - b.totalSpentPaise,
  };
  rows.sort((a, b) => cmp[sort](a, b) || a.id.localeCompare(b.id));
  const info = pageInfo(rows.length, p.data.page, p.data.pageSize);
  res.json({ total: info.total, page: info.page, pageSize: info.pageSize, pages: info.pages, items: rows.slice(info.skip, info.skip + info.pageSize) });
});
