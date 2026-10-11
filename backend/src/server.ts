import path from "path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { prisma, requireAuth, requireRole } from "./middleware/auth";
import accountRoutes from "./routes/account";
import miscRoutes from "./routes/misc";
import wishlistRoutes from "./routes/wishlist";
import reviewRoutes from "./routes/reviews";
import { adminExtras } from "./routes/adminExtras";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import analyticsRoutes from "./routes/analytics";
import { adminLists } from "./routes/adminLists";
import { shop as shopRoutes } from "./routes/shop";
import cartRoutes from "./routes/cart";
import orderRoutes, { adminOrders } from "./routes/orders";
import { devPayments, paymentWebhook } from "./routes/payments";

const app = express();
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.post("/api/payments/webhook", express.raw({ type: "*/*" }), paymentWebhook); // raw body needed for signature check
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api/products", productRoutes);
app.use("/api/products", reviewRoutes);
app.get("/api/categories", async (_req, res) => res.json(await prisma.category.findMany({ orderBy: { name: "asc" } })));
app.use("/api", miscRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/shop", shopRoutes); // public storefront: guest cart pricing, checkout, tracking
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", devPayments);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"))); // swap for cloud storage in production
app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 50 }), authRoutes);

// Every /api/admin/* route is ADMIN-only, enforced here on the server.
const admin = express.Router();
admin.use(requireAuth, requireRole("ADMIN"));
admin.use("/analytics", analyticsRoutes);
admin.use("/list", adminLists); // paginated + filtered seller-portal lists
admin.use("/orders", adminOrders);
admin.use("/", adminExtras);
app.use("/api/admin", admin);

app.use((_req, res) => res.status(404).json({ error: "Not found." }));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side." });
});

if (env.NODE_ENV !== "test") app.listen(env.PORT, () => console.log(`VH Jewellers API on :${env.PORT}`));
export default app;
