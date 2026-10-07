import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Removes the demo data the old seed script created, and nothing else:
 *  - the 3 demo buyers (*@example.test) with their orders, payments, reviews, questions, carts and addresses
 *  - the 24 demo products (SKU VH-0001..VH-0024) that still use the grey placehold.co picture and are in no remaining order
 *  - the sample coupon WELCOME10, if nothing else uses it
 * Your admin login, categories, and any product you added or gave real photos to are left alone.
 */
const DEMO_EMAILS = ["asha@example.test", "rohan@example.test", "meera@example.test"];
const DEMO_SKUS = Array.from({ length: 24 }, (_, i) => `VH-${String(i + 1).padStart(4, "0")}`);

async function main() {
  const out = await prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({ where: { email: { in: DEMO_EMAILS }, role: "BUYER" }, select: { id: true } });
    const userIds = users.map((u) => u.id);

    // 1. Orders of the demo buyers (payments first: they have no cascade; items cascade with the order).
    const orders = await tx.order.findMany({ where: { userId: { in: userIds } }, select: { id: true, orderNumber: true } });
    const orderIds = orders.map((o) => o.id);
    const payments = await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.order.deleteMany({ where: { id: { in: orderIds } } });
    // Admin notifications ("New order VH-… received", "Return requested …") that mention the removed orders.
    if (orders.length) await tx.notification.deleteMany({ where: { OR: orders.map((o) => ({ message: { contains: o.orderNumber } })) } });

    // 2. Other rows that point at the demo buyers and don't cascade.
    await tx.review.deleteMany({ where: { userId: { in: userIds } } });
    await tx.question.deleteMany({ where: { userId: { in: userIds } } });
    await tx.couponUsage.deleteMany({ where: { userId: { in: userIds } } });
    const buyers = await tx.user.deleteMany({ where: { id: { in: userIds } } }); // cart, wishlist, addresses, notifications cascade

    // 3. Demo products: placeholder picture only, and not part of any remaining order.
    const candidates = await tx.product.findMany({
      where: { sku: { in: DEMO_SKUS }, images: { some: {}, every: { url: { startsWith: "https://placehold.co/" } } }, orderItems: { none: {} } },
      select: { id: true },
    });
    const productIds = candidates.map((p) => p.id);
    await tx.cartItem.deleteMany({ where: { productId: { in: productIds } } });
    const products = await tx.product.deleteMany({ where: { id: { in: productIds } } }); // images, reviews, questions, wishlist items cascade

    // 4. Sample coupon, only if nothing real uses it.
    const coupon = await tx.coupon.findUnique({ where: { code: "WELCOME10" }, select: { id: true, _count: { select: { orders: true, usages: true } } } });
    let coupons = 0;
    if (coupon && coupon._count.orders === 0 && coupon._count.usages === 0) { await tx.coupon.delete({ where: { id: coupon.id } }); coupons = 1; }

    return { buyers: buyers.count, orders: orderIds.length, payments: payments.count, products: products.count, coupons };
  });
  console.log("Removed demo data:", out);
  const left = await prisma.product.count({ where: { sku: { in: DEMO_SKUS } } });
  if (left) console.log(`${left} product(s) with demo SKUs were kept because they have real photos or real orders.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
