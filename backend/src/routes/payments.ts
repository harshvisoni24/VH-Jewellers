import crypto from "crypto";
import { Request, Response, Router } from "express";
import { prisma, requireAuth } from "../middleware/auth";
import { env } from "../config/env";

/** Gateway webhook. Mounted with express.raw so the signature is checked against the exact bytes received. */
export async function paymentWebhook(req: Request, res: Response) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const sig = req.header("x-signature") ?? "";
  if (!secret) return res.status(500).json({ error: "Webhook not configured." });
  const expected = crypto.createHmac("sha256", secret).update(req.body as Buffer).digest("hex");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return res.status(401).json({ error: "Bad signature." });
  // Payload shape depends on your gateway; adapt this to its documented event names.
  const evt = JSON.parse((req.body as Buffer).toString()) as { event: string; gatewayOrderId: string; gatewayPaymentId: string; method?: string };
  if (evt.event === "payment.paid") await markPaid(evt.gatewayOrderId, evt.gatewayPaymentId, evt.method);
  res.json({ received: true });
}

export async function markPaid(gatewayOrderId: string, gatewayPaymentId: string, method?: string) {
  const payment = await prisma.payment.findUnique({ where: { gatewayOrderId } });
  if (!payment || payment.status === "PAID") return; // idempotent: webhooks can be delivered twice
  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID", gatewayPaymentId, method } }),
    prisma.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } }),
  ]);
}

// Development only: simulates the gateway confirming a payment so the flow can be tried without gateway keys.
export const devPayments = Router();
devPayments.post("/dev-confirm", requireAuth, async (req, res) => {
  if (env.NODE_ENV === "production") return res.status(404).json({ error: "Not found." });
  const order = await prisma.order.findFirst({ where: { id: String(req.body?.orderId), userId: req.user!.id }, include: { payments: true } });
  if (!order) return res.status(404).json({ error: "Order not found." });
  await markPaid(order.payments[0].gatewayOrderId, `dev_${Date.now()}`, "DEV");
  res.json({ status: "PAID" });
});
