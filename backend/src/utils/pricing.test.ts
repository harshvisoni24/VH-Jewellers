import { describe, expect, it } from "vitest";
import { couponDiscount, finalPrice } from "./pricing";

describe("finalPrice", () => {
  it("applies the discount", () => expect(finalPrice({ pricePaise: 8_000_000, discountPercent: 10 })).toBe(7_200_000)); // ₹80,000 -> ₹72,000
  it("keeps the price when there is no discount", () => expect(finalPrice({ pricePaise: 5_000_000, discountPercent: 0 })).toBe(5_000_000));
});
describe("couponDiscount", () => {
  const pct = { discountType: "PERCENTAGE" as const, discountValue: 10, maxDiscountPaise: 1_000_000 };
  it("calculates a percentage", () => expect(couponDiscount(pct, 5_000_000)).toBe(500_000));
  it("respects the maximum discount", () => expect(couponDiscount(pct, 50_000_000)).toBe(1_000_000));
  it("never exceeds the subtotal", () => expect(couponDiscount({ discountType: "FIXED", discountValue: 900_000, maxDiscountPaise: null }, 500_000)).toBe(500_000));
});
