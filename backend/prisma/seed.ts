import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

// Seeds only what the store needs to start: the admin login and the product categories.
// No demo products, customers, orders or coupons are created: the seller portal shows real data only.
async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@vhjewellers.test";
  const password = process.env.ADMIN_PASSWORD ?? "Admin@12345";
  await prisma.user.upsert({ where: { email }, update: {},
    create: { name: "Store Admin", email, passwordHash: await bcrypt.hash(password, 12), role: "ADMIN" } });
  for (const name of ["Rings", "Necklaces", "Earrings", "Bracelets", "Bangles", "Pendants"]) {
    await prisma.category.upsert({ where: { slug: name.toLowerCase() }, update: {}, create: { name, slug: name.toLowerCase() } });
  }
  console.log(`Seeded admin (${email}) and ${6} categories. Add your products from Admin → Add product.`);
}
main().finally(() => prisma.$disconnect());
