import { Router } from "express";
import { z } from "zod";
import { prisma } from "../middleware/auth";

const router = Router(); // mounted behind requireAuth + requireRole("ADMIN")
const DAYS = { today: 1, "7d": 7, "30d": 30, "3m": 90, "6m": 182, "1y": 365 } as const;
const q = z.object({ range: z.enum(["today", "7d", "30d", "3m", "6m", "1y", "custom"]).default("30d"),
  from: z.coerce.date().optional(), to: z.coerce.date().optional() });

router.get("/sales", async (req, res) => {
  const p = q.safeParse(req.query);
  if (!p.success) return res.status(422).json({ error: "Invalid date range." });
  const to = p.data.range === "custom" && p.data.to ? p.data.to : new Date();
  const from = p.data.range === "custom" && p.data.from ? p.data.from
    : p.data.range === "today" ? new Date(new Date().setHours(0, 0, 0, 0)) : new Date(to.getTime() - DAYS[p.data.range as keyof typeof DAYS] * 864e5);
  const spanDays = (to.getTime() - from.getTime()) / 864e5;
  const unit = spanDays <= 1 ? "hour" : spanDays <= 92 ? "day" : "month";

  // Only orders that were actually paid count as sales.
  const rows = await prisma.$queryRaw<{ bucket: Date; revenue: bigint; orders: bigint; units: bigint }[]>`
    SELECT date_trunc(${unit}::text, o."createdAt") AS bucket, SUM(o."totalPaise") AS revenue, COUNT(*) AS orders,
           COALESCE(SUM((SELECT SUM(i.quantity) FROM "OrderItem" i WHERE i."orderId" = o.id)), 0) AS units
    FROM "Order" o
    WHERE o."createdAt" BETWEEN ${from} AND ${to} AND o.status NOT IN ('PENDING', 'CANCELLED', 'REFUNDED')
    GROUP BY 1 ORDER BY 1`;
  const series = rows.map((r) => ({ date: r.bucket, revenuePaise: Number(r.revenue), orders: Number(r.orders), unitsSold: Number(r.units) }));
  const totals = series.reduce((t, s) => ({ revenuePaise: t.revenuePaise + s.revenuePaise, orders: t.orders + s.orders, unitsSold: t.unitsSold + s.unitsSold }),
    { revenuePaise: 0, orders: 0, unitsSold: 0 });
  res.json({ unit, from, to, series, totals, averageOrderPaise: totals.orders ? Math.round(totals.revenuePaise / totals.orders) : 0 });
});

export default router;
