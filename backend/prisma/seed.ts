import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
const day = 864e5;

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 12);
  await prisma.user.upsert({ where: { email: "admin@vhjewellers.test" }, update: {},
    create: { name: "Store Admin", email: "admin@vhjewellers.test", passwordHash: await hash("Admin@12345"), role: "ADMIN" } });
  const buyers = [];
  for (const [n, e] of [["Asha Patel", "asha@example.test"], ["Rohan Shah", "rohan@example.test"], ["Meera Joshi", "meera@example.test"]]) {
    buyers.push(await prisma.user.upsert({ where: { email: e }, update: {},
      create: { name: n, email: e, passwordHash: await hash("Buyer@12345"), cart: { create: {} }, wishlist: { create: {} } } }));
  }
  const cats: Record<string, string> = {};
  for (const name of ["Rings", "Necklaces", "Earrings", "Bracelets", "Bangles", "Pendants"]) {
    cats[name] = (await prisma.category.upsert({ where: { slug: name.toLowerCase() }, update: {}, create: { name, slug: name.toLowerCase() } })).id;
  }
  const kinds = [["Rings", "Ring"], ["Necklaces", "Necklace"], ["Earrings", "Earrings"], ["Bracelets", "Bracelet"], ["Bangles", "Bangle"], ["Pendants", "Pendant"]];
  const mats = [["Gold", "22K", 62000], ["Gold", "18K", 48000], ["Silver", "925", 9000], ["Platinum", "950", 85000]];
  const products = [];
  let n = 1;
  for (const [cat, noun] of kinds) for (const [m, purity, base] of mats.slice(0, 4)) {
    if (n > 24) break;
    const sku = `VH-${String(n).padStart(4, "0")}`;
    products.push(await prisma.product.upsert({ where: { sku }, update: {}, create: {
      sku, name: `${m} ${noun} ${purity}`, description: `Handcrafted ${m.toLowerCase()} ${noun.toLowerCase()} in ${purity} purity.`,
      categoryId: cats[cat], pricePaise: (base + n * 1700) * 100, discountPercent: n % 3 === 0 ? 10 : 0, stock: 3 + (n % 9),
      material: m, purity, weightGrams: 2 + (n % 7), brand: "VH Jewellers", tags: [m.toLowerCase(), noun.toLowerCase()],
      images: { create: [{ url: `https://placehold.co/600x600?text=${encodeURIComponent(noun)}`, isMain: true }] } } }));
    n++;
  }
  const addr = await prisma.address.create({ data: { userId: buyers[0].id, fullName: "Asha Patel", phone: "9000000000",
    line1: "12 MG Road", city: "Vadodara", state: "Gujarat", pincode: "390001", isDefault: true } });
  if ((await prisma.order.count()) === 0) for (let i = 0; i < 60; i++) {
    const items = [0, 1].slice(0, 1 + (i % 2)).map((k) => products[(i * 3 + k * 7) % products.length]);
    const lines = items.map((p) => ({ p, q: 1 + (i % 2), price: Math.round((p.pricePaise * (100 - p.discountPercent)) / 100) }));
    const total = lines.reduce((s, l) => s + l.price * l.q, 0);
    await prisma.order.create({ data: { orderNumber: `VH-${1000 + i}`, userId: buyers[i % 3].id, addressId: addr.id,
      status: i % 10 === 0 ? "PROCESSING" : "DELIVERED", subtotalPaise: total, totalPaise: total, createdAt: new Date(Date.now() - ((i * 3) % 180) * day),
      items: { create: lines.map((l) => ({ productId: l.p.id, productNameSnapshot: l.p.name, quantity: l.q, priceAtPurchasePaise: l.price })) } } });
  }
  await prisma.coupon.upsert({ where: { code: "WELCOME10" }, update: {}, create: { code: "WELCOME10", discountType: "PERCENTAGE",
    discountValue: 10, minOrderPaise: 500000, maxDiscountPaise: 1000000, startsAt: new Date(), endsAt: new Date(Date.now() + 365 * day) } });
}
main().finally(() => prisma.$disconnect());
