import { createContext, ReactNode, useContext, useEffect, useState } from "react";

/**
 * The shopping cart and wishlist live in the browser (localStorage): no account needed.
 * They only hold product ids and quantities. Prices and stock are always fetched fresh from the server.
 */
export interface CartLine { productId: string; quantity: number }
export const MAX_QTY = 10;
const CART_KEY = "vh_cart", WISH_KEY = "vh_wishlist";

function read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; } }
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable (private mode): cart still works until the tab closes */ } }
function cleanCart(v: unknown): CartLine[] {
  if (!Array.isArray(v)) return [];
  return v.filter((l): l is CartLine => typeof l?.productId === "string" && Number.isInteger(l?.quantity) && l.quantity >= 1)
    .map((l) => ({ productId: l.productId, quantity: Math.min(MAX_QTY, l.quantity) }));
}
const cleanIds = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

interface Ctx {
  lines: CartLine[]; count: number;
  add(productId: string, stock?: number): "added" | "limit";
  setQty(productId: string, quantity: number): void;
  remove(productId: string): void; clear(): void;
  wishlist: string[]; toggleWish(productId: string): void; inWish(productId: string): boolean;
}
const CartCtx = createContext<Ctx>(null!);
export const useCart = () => useContext(CartCtx);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => cleanCart(read(CART_KEY)));
  const [wishlist, setWishlist] = useState<string[]>(() => cleanIds(read(WISH_KEY)));
  useEffect(() => write(CART_KEY, lines), [lines]);
  useEffect(() => write(WISH_KEY, wishlist), [wishlist]);
  useEffect(() => { // keep several open tabs in step
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setLines(cleanCart(read(CART_KEY)));
      if (e.key === WISH_KEY) setWishlist(cleanIds(read(WISH_KEY)));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value: Ctx = {
    lines, count: lines.reduce((n, l) => n + l.quantity, 0),
    add: (productId, stock) => {
      const cap = Math.min(MAX_QTY, stock ?? MAX_QTY);
      const have = lines.find((l) => l.productId === productId)?.quantity ?? 0;
      if (have >= cap) return "limit";
      setLines((cur) => cur.some((l) => l.productId === productId)
        ? cur.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(cap, l.quantity + 1) } : l))
        : [...cur, { productId, quantity: 1 }]);
      return "added";
    },
    setQty: (productId, quantity) => setLines((cur) => cur.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : l))),
    remove: (productId) => setLines((cur) => cur.filter((l) => l.productId !== productId)),
    clear: () => setLines([]),
    wishlist,
    toggleWish: (productId) => setWishlist((cur) => (cur.includes(productId) ? cur.filter((x) => x !== productId) : [productId, ...cur])),
    inWish: (productId) => wishlist.includes(productId),
  };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}