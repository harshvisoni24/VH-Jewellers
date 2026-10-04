export const finalPrice = (p: { pricePaise: number; discountPercent: number }) => Math.round((p.pricePaise * (100 - p.discountPercent)) / 100);

/** Coupon discount in paise. FIXED values are stored in paise. Never exceeds the cap or the subtotal. */
export function couponDiscount(c: { discountType: "PERCENTAGE" | "FIXED"; discountValue: number; maxDiscountPaise: number | null }, subtotal: number) {
  const raw = c.discountType === "PERCENTAGE" ? Math.round((subtotal * c.discountValue) / 100) : c.discountValue;
  return Math.min(raw, c.maxDiscountPaise ?? raw, subtotal);
}
