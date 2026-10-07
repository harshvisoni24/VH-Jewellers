import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

/**
 * Creates the admin account, or resets its password if it already exists.
 *   npm run create-admin                                  -> admin@vhjewellers.test / Admin@12345
 *   npm run create-admin -- you@example.com 'MyPass123'   -> your own email and password (min 8 characters)
 * Use this whenever the admin login says "Email or password is incorrect."
 */
async function main() {
  const [argEmail, argPassword] = process.argv.slice(2);
  const email = (argEmail ?? process.env.ADMIN_EMAIL ?? "admin@vhjewellers.test").trim().toLowerCase();
  const password = argPassword ?? process.env.ADMIN_PASSWORD ?? "Admin@12345";
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error(`"${email}" is not a valid email address.`);
  if (password.length < 8) throw new Error("The password must be at least 8 characters.");
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existing) await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, role: "ADMIN", isActive: true } });
  else await prisma.user.create({ data: { name: "Store Admin", email, passwordHash, role: "ADMIN" } });
  console.log(`${existing ? "Updated" : "Created"} admin account.\n  Email:    ${email}\n  Password: ${password}\nLog in from the Log in button on the store's first page.`);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
