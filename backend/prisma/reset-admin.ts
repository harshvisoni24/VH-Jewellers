/**
 * Recovery script: change the seller (ADMIN) login email, mobile number and/or password.
 * It asks questions in the terminal, so no password is ever stored in a file.
 * Press Enter to keep a value unchanged.
 *
 *   cd backend
 *   npx tsx prisma/reset-admin.ts
 */
import readline from "readline";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // Hide typed characters for passwords (the prompt itself is still shown).
    if (hidden) (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(s); };
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(answer.trim()); });
  });
}

async function main() {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  if (admins.length === 0) throw new Error("No seller (ADMIN) account found.");
  if (admins.length > 1) console.log(`Found ${admins.length} admin accounts. Updating the first one: ${admins[0].email}`);
  const admin = admins[0];
  console.log(`\nSeller account: ${admin.email}  (mobile: ${admin.phone ?? "not set"})`);
  console.log("Press Enter to keep a value unchanged.\n");

  const email = await ask("New email: ");
  const phoneRaw = await ask("New mobile number (10 digits): ");
  const password = await ask("New password (min 8 characters): ", true);
  if (password) {
    const again = await ask("Confirm new password: ", true);
    if (password !== again) throw new Error("Passwords do not match. Nothing was changed.");
    if (password.length < 8) throw new Error("Password must be at least 8 characters. Nothing was changed.");
  }

  const data: { email?: string; phone?: string; passwordHash?: string } = {};
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That email does not look valid.");
    if (await prisma.user.findFirst({ where: { email, NOT: { id: admin.id } } })) throw new Error("That email is already used by another account.");
    data.email = email;
  }
  if (phoneRaw) {
    const phone = phoneRaw.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Enter a valid 10-digit Indian mobile number.");
    if (await prisma.user.findFirst({ where: { phone: { endsWith: phone }, NOT: { id: admin.id } } })) throw new Error("That mobile number is used by another account.");
    data.phone = phone;
  }
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  if (!Object.keys(data).length) return console.log("Nothing to change.");
  await prisma.user.update({ where: { id: admin.id }, data });
  console.log(`\nDone. Log in at /seller/login with: ${data.email ?? admin.email}`);
}

main().catch((e) => { console.error("\n" + e.message); process.exit(1); }).finally(() => prisma.$disconnect());
