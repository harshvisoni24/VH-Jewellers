import type { Prisma } from "@prisma/client";
import type { Response } from "express";
import { buildReceiptPdf, ReceiptData } from "./receiptPdf";
import { getSettings } from "./settings";
import { prisma } from "../middleware/auth";

/** Everything a receipt needs from an order. */
export const receiptSelect = {
  orderNumber: true, createdAt: true, subtotalPaise: true, discountPaise: true, deliveryPaise: true, totalPaise: true,
  user: { select: { name: true, email: true, phone: true } },
  address: { select: { fullName: true, phone: true, line1: true, line2: true, city: true, state: true, pincode: true } },
  items: { select: { productNameSnapshot: true, quantity: true, priceAtPurchasePaise: true } },
  payments: { select: { method: true, status: true } },
} satisfies Prisma.OrderSelect;
export type ReceiptOrder = Prisma.OrderGetPayload<{ select: typeof receiptSelect }>;

/** Builds the PDF for an order and sends it. `inline` shows it in the browser tab; otherwise the browser downloads it. */
export async function sendReceipt(res: Response, o: ReceiptOrder, mode: "inline" | "attachment") {
  const st = await getSettings(prisma);
  const data: ReceiptData = {
    store: { name: st.storeName, address: st.storeAddress, gstin: st.gstin },
    orderNumber: o.orderNumber, date: o.createdAt,
    customer: o.user,
    address: o.address,
    items: o.items.map((i) => ({ name: i.productNameSnapshot, quantity: i.quantity, unitPaise: i.priceAtPurchasePaise })),
    subtotalPaise: o.subtotalPaise, discountPaise: o.discountPaise, deliveryPaise: o.deliveryPaise, totalPaise: o.totalPaise,
    payment: o.payments[0] ?? { status: "CREATED" },
  };
  const pdf = buildReceiptPdf(data);
  res.set({
    "Content-Type": "application/pdf", "Content-Length": String(pdf.length), "Cache-Control": "private, no-store",
    "Content-Disposition": `${mode}; filename="Receipt-${o.orderNumber}.pdf"`,
  });
  res.send(pdf);
}
