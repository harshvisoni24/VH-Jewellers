import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

// Runs only when TEST_DATABASE_URL points at a throwaway PostgreSQL database that has the schema applied.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("API with a real database", () => {
  let app: import("express").Express;
  let prisma: import("@prisma/client").PrismaClient;
  const tag = Date.now();
  const creds = { buyer: `buyer${tag}@t.test`, admin: `admin${tag}@t.test`, password: "Test@12345" };
  let productId = "";

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: url, NODE_ENV: "test", JWT_SECRET: "x".repeat(40), CLIENT_URL: "http://localhost:5173" });
    app = (await import("./server")).default;
    prisma = (await import("./middleware/auth")).prisma;
    const passwordHash = await bcrypt.hash(creds.password, 4);
    await prisma.user.create({ data: { name: "T Buyer", email: creds.buyer, passwordHash, cart: { create: {} } } });
    await prisma.user.create({ data: { name: "T Admin", email: creds.admin, passwordHash, role: "ADMIN" } });
    const cat = await prisma.category.create({ data: { name: `Cat${tag}`, slug: `cat${tag}` } });
    productId = (await prisma.product.create({ data: { sku: `T-${tag}`, name: "Test Ring", description: "Test", categoryId: cat.id, pricePaise: 4_500_000, stock: 5, material: "Gold" } })).id;
  });

  const login = async (email: string, portal: "BUYER" | "ADMIN") => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email, password: creds.password, portal });
    return agent;
  };

  it("role access: anonymous 401, buyer 403, admin 200", async () => {
    expect((await request(app).get("/api/admin/summary")).status).toBe(401);
    expect((await (await login(creds.buyer, "BUYER")).get("/api/admin/summary")).status).toBe(403);
    expect((await (await login(creds.admin, "ADMIN")).get("/api/admin/summary")).status).toBe(200);
  });

  it("a buyer cannot log in through the admin door", async () => {
    const r = await request(app).post("/api/auth/login").send({ email: creds.buyer, password: creds.password, portal: "ADMIN" });
    expect(r.status).toBe(401);
  });

  it("price freeze: old orders keep their price after the admin changes it", async () => {
    const buyer = await login(creds.buyer, "BUYER");
    expect((await buyer.post("/api/cart/items").send({ productId, quantity: 9 })).status).toBe(409); // more than stock
    expect((await buyer.post("/api/cart/items").send({ productId, quantity: 2 })).status).toBe(201);
    const order = await buyer.post("/api/orders").send({ address: { fullName: "T Buyer", phone: "9000000000", line1: "1 Test Road", city: "Vadodara", state: "Gujarat", pincode: "390001" } });
    expect(order.status).toBe(201);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(3); // stock reduced

    await prisma.product.update({ where: { id: productId }, data: { pricePaise: 6_000_000 } }); // admin raises the price
    expect((await request(app).get(`/api/products/${productId}`)).body.finalPricePaise).toBe(6_000_000);
    const old = await buyer.get(`/api/orders/${order.body.id}`);
    expect(old.body.items[0].priceAtPurchasePaise).toBe(4_500_000);
  });
});
