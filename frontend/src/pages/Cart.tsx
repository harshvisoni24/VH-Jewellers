import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api, rupees } from "../api/client";
import { MAX_QTY, useCart } from "../context/CartContext";

interface Item { id: string; name: string; stock: number; imageUrl?: string; finalPricePaise: number }
interface Resp { items: Item[]; delivery: { freeAbovePaise: number; feePaise: number } }
const input = "w-full rounded-sm border border-ink/20 px-3 py-2";

export default function Cart() {
  const { lines, setQty, remove, clear } = useCart();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const ids = lines.map((l) => l.productId).join(",");
  const { data, isLoading } = useQuery({ queryKey: ["cart-items", ids], enabled: lines.length > 0, placeholderData: keepPreviousData, queryFn: () => api<Resp>(`/shop/cart-items?ids=${ids}`) });

  // Prices and stock come from the server; the browser only remembers which products and how many.
  const rows = lines.map((l) => ({ l, p: data?.items.find((i) => i.id === l.productId) }));
  const loaded = !!data;
  const subtotal = rows.reduce((s, r) => s + (r.p ? r.p.finalPricePaise * r.l.quantity : 0), 0);
  const delivery = data ? (subtotal >= data.delivery.freeAbovePaise ? 0 : data.delivery.feePaise) : 0;
  const problem = (r: (typeof rows)[number]) => !r.p ? "No longer available" : r.p.stock < 1 ? "Out of stock" : r.l.quantity > r.p.stock ? `Only ${r.p.stock} left` : "";
  const blocked = !loaded || rows.some((r) => problem(r));

  const place = useMutation({
    mutationFn: (f: Record<string, string>) => api<unknown>("/shop/orders", { method: "POST", json: {
      customer: { name: f.name, email: f.email, phone: f.phone },
      address: { line1: f.line1, line2: f.line2 || undefined, city: f.city, state: f.state, pincode: f.pincode },
      items: lines, couponCode: f.couponCode || undefined } }),
    onSuccess: (order) => { nav("/order-placed", { state: order, replace: true }); clear(); },
    onError: (e: Error) => setError(e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setError(""); place.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); };

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <Link to="/" className="text-sm underline">Continue shopping</Link>
      <h1 className="mt-3 font-display text-3xl text-emerald">Your cart</h1>
      {!lines.length && <p className="mt-6">Your cart is empty. <Link to="/" className="underline">Browse jewellery</Link></p>}
      {lines.length > 0 && isLoading && <p className="mt-6">Loading…</p>}
      {lines.length > 0 && loaded && (
        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_22rem]">
          <ul className="space-y-4">{rows.map(({ l, p }) => (
            <li key={l.productId} className="flex gap-4 bg-white p-3">
              {p?.imageUrl ? <img src={p.imageUrl} alt="" className="h-20 w-20 object-cover" /> : <div className="h-20 w-20 bg-ink/5" />}
              <div className="flex-1">
                {p ? <Link to={`/products/${p.id}`} className="font-display text-xl">{p.name}</Link> : <p className="font-display text-xl">Item unavailable</p>}
                {p && <p>{rupees(p.finalPricePaise)}</p>}
                {problem({ l, p }) && <p role="alert" className="text-sm text-red-700">{problem({ l, p })}. {p && p.stock > 0 ? "Lower the quantity to continue." : "Remove it to continue."}</p>}
                <div className="mt-1 flex items-center gap-3">
                  <button aria-label="Decrease quantity" disabled={l.quantity <= 1} onClick={() => setQty(l.productId, l.quantity - 1)} className="px-2">−</button><span>{l.quantity}</span>
                  <button aria-label="Increase quantity" disabled={!p || l.quantity >= Math.min(MAX_QTY, p.stock)} onClick={() => setQty(l.productId, l.quantity + 1)} className="px-2">+</button>
                  <button onClick={() => remove(l.productId)} className="ml-auto text-sm text-red-700 underline">Remove</button></div></div>
            </li>))}</ul>
          <form onSubmit={submit} className="h-fit space-y-3 bg-white p-5">
            <h2 className="font-display text-2xl">Your details</h2>
            <input name="name" placeholder="Full name" required minLength={2} autoComplete="name" className={input} />
            <input name="phone" type="tel" placeholder="Phone number" required minLength={10} maxLength={15} autoComplete="tel" className={input} />
            <input name="email" type="email" placeholder="Email (to track your order)" required autoComplete="email" className={input} />
            <h2 className="pt-2 font-display text-2xl">Delivery address</h2>
            <input name="line1" placeholder="Address line 1" required minLength={3} autoComplete="address-line1" className={input} />
            <input name="line2" placeholder="Address line 2 (optional)" autoComplete="address-line2" className={input} />
            <div className="flex gap-2"><input name="city" placeholder="City" required minLength={2} autoComplete="address-level2" className={input} /><input name="pincode" placeholder="Pincode" required pattern="\d{6}" inputMode="numeric" autoComplete="postal-code" className={input} /></div>
            <input name="state" placeholder="State" required minLength={2} autoComplete="address-level1" className={input} />
            <input name="couponCode" placeholder="Coupon code (optional)" className={input} />
            <div className="space-y-1 border-t pt-3 text-sm">
              <p className="flex justify-between"><span>Subtotal</span><strong>{rupees(subtotal)}</strong></p>
              <p className="flex justify-between"><span>Delivery</span><span>{delivery ? rupees(delivery) : "Free"}</span></p>
              <p className="flex justify-between text-base"><span>Total</span><strong>{rupees(subtotal + delivery)}</strong></p>
              <p className="text-xs text-ink/60">Any coupon discount is applied when you place the order. Delivery is free on orders of {rupees(data.delivery.freeAbovePaise)} or more.</p>
            </div>
            <p className="rounded-sm bg-pearl p-3 text-sm"><strong>Payment: cash on delivery.</strong> Pay when your order arrives.</p>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button disabled={place.isPending || blocked} className="w-full rounded-sm bg-gold py-3 text-white disabled:opacity-60">{place.isPending ? "Placing order…" : "Place order"}</button>
          </form>
        </div>)}
    </div>
  );
}