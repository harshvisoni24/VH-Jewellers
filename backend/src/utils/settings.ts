import { Prisma, PrismaClient } from "@prisma/client";

export const DEFAULTS = { storeName: "VH Jewellers", supportEmail: "", gstin: "", storeAddress: "", freeDeliveryAbovePaise: "1000000", deliveryFeePaise: "25000" };
export async function getSettings(db: PrismaClient | Prisma.TransactionClient) {
  const rows = await db.setting.findMany();
  return { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}
