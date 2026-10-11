import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { api, rupees } from "../api/client";
import BackButton from "../components/BackButton";
import Ornament from "../components/Ornament";
import SectionTitle from "../components/SectionTitle";
import { MAX_QTY, useCart } from "../context/CartContext";

interface Item { id: string; name: string; stock: number; imageUrl?: string; finalPricePaise: number }
interface Resp { items: Item[]; delivery: { freeAbovePaise: number; feePaise: number } }

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
  const heading = "font-display text-2xl";

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <BackButton />
      {!lines.length && (
        <div className="grid min-h-[52vh] place-items-center text-center">
          <div className="max-w-md">
            <ShoppingBag size={60} strokeWidth={1} className="mx-auto text-gold" />
            <Ornament className="my-6" />
            <h1 className="text-4xl sm:text-5xl">Your cart is empty</h1>
            <p className="mt-4 text-ink/70">Pieces you add will wait for you here.</p>
            <Link to="/" className="btn-outline mt-9">Browse jewellery</Link>
          </div>
        </div>
      )}
      {lines.length > 0 && <SectionTitle as="h1" title="Your cart" className="mt-2" />}
      {lines.length > 0 && isLoading && <p className="mt-10 text-center">Loading…</p>}
      {lines.length > 0 && loaded && (
        <div className="mt-12 grid gap-10 md:grid-cols-[1fr_23rem]">
          <ul className="space-y-5">{rows.map(({ l, p }) => (
            <li key={l.productId} className="flex gap-5 bg-panel p-4">
              {p?.imageUrl ? <img src={p.imageUrl} alt="" className="h-24 w-24 object-cover" /> : <div className="h-24 w-24 bg-ink/5" />}
              <div className="flex flex-1 flex-col">
                {p ? <Link to={`/products/${p.id}`} className="font-display text-2xl text-pearl transition-colors hover:text-gold">{p.name}</Link> : <p className="font-display text-2xl">Item unavailable</p>}
                {p && <p className="text-gold">{rupees(p.finalPricePaise)}</p>}
                {problem({ l, p }) && <p role="alert" className="mt-1 text-sm text-rose-300">{problem({ l, p })}. {p && p.stock > 0 ? "Lower the quantity to continue." : "Remove it to continue."}</p>}
                <div className="mt-auto flex items-center gap-4 pt-3">
                  <div className="inline-flex items-center border border-gold/40">
                    <button aria-label="Decrease quantity" disabled={l.quantity <= 1} onClick={() => setQty(l.productId, l.quantity - 1)} className="grid h-9 w-9 place-items-center text-gold transition hover:bg-gold/10 disabled:opacity-30"><Minus size={14} /></button>
                    <span className="w-10 text-center">{l.quantity}</span>
                    <button aria-label="Increase quantity" disabled={!p || l.quantity >= Math.min(MAX_QTY, p.stock)} onClick={() => setQty(l.productId, l.quantity + 1)} className="grid h-9 w-9 place-items-center text-gold transition hover:bg-gold/10 disabled:opacity-30"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => remove(l.productId)} className="eyebrow ml-auto !tracking-[0.2em] !text-rose-300 underline underline-offset-4">Remove</button></div></div>
            </li>))}</ul>
          <form onSubmit={submit} className="h-fit space-y-3 bg-panel p-6">
            <h2 className={heading}>Your details</h2>
            <input name="name" placeholder="Full name" required minLength={2} autoComplete="name" className="w-full" />
            <input name="phone" type="tel" placeholder="Phone number" required minLength={10} maxLength={15} autoComplete="tel" className="w-full" />
            <input name="email" type="email" placeholder="Email (to track your order)" required autoComplete="email" className="w-full" />
            <h2 className={`${heading} pt-3`}>Delivery address</h2>
            <input name="line1" placeholder="Address line 1" required minLength={3} autoComplete="address-line1" className="w-full" />
            <input name="line2" placeholder="Address line 2 (optional)" autoComplete="address-line2" className="w-full" />
            <div className="flex gap-3"><input name="city" placeholder="City" required minLength={2} autoComplete="address-level2" className="w-full min-w-0" /><input name="pincode" placeholder="Pincode" required pattern="\d{6}" inputMode="numeric" autoComplete="postal-code" className="w-full min-w-0" /></div>
            <input name="state" placeholder="State" required minLength={2} autoComplete="address-level1" className="w-full" />
            <input name="couponCode" placeholder="Coupon code (optional)" className="w-full" />
            <div className="space-y-2 border-t pt-4 text-sm">
              <p className="flex justify-between"><span>Subtotal</span><span>{rupees(subtotal)}</span></p>
              <p className="flex justify-between"><span>Delivery</span><span>{delivery ? rupees(delivery) : "Free"}</span></p>
              <p className="flex items-baseline justify-between border-t pt-3"><span className="eyebrow">Total</span><strong className="font-display text-3xl font-medium text-gold">{rupees(subtotal + delivery)}</strong></p>
              <p className="text-xs text-ink/60">Any coupon discount is applied when you place the order. Delivery is free on orders of {rupees(data.delivery.freeAbovePaise)} or more.</p>
            </div>
            <p className="border border-gold/30 bg-night/60 p-3 text-center text-sm"><span className="eyebrow !tracking-[0.2em]">Cash on delivery</span><br />Pay when your order arrives.</p>
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            <button disabled={place.isPending || blocked} className="btn-gold w-full disabled:opacity-60">{place.isPending ? "Placing order…" : "Place order"}</button>
          </form>
        </div>)}
    </div>
  );
}
