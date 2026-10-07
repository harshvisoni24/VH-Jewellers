import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, rupees } from "../api/client";

interface CartData { items: { id: string; quantity: number; product: { name: string; stock: number; imageUrl?: string; finalPricePaise: number } }[]; subtotalPaise: number }

export default function Cart() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const acct = useQuery({ queryKey: ["account"], queryFn: () => api<{ addresses: { id: string; fullName: string; line1: string; city: string }[] }>("/account") });
  const { data, isLoading } = useQuery({ queryKey: ["cart"], queryFn: () => api<CartData>("/cart") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["cart"] });
  const setQty = (id: string, quantity: number) => api(`/cart/items/${id}`, { method: "PATCH", json: { quantity } }).then(refresh).catch((e) => setError(e.message));
  const remove = (id: string) => api(`/cart/items/${id}`, { method: "DELETE" }).then(refresh);

  const place = useMutation({
    mutationFn: async (f: Record<string, string>) => {
      const { couponCode, addressId, ...address } = f;
      const order = await api<{ id: string }>("/orders", { method: "POST", json: { address: addressId ? undefined : address, addressId: addressId || undefined, couponCode: couponCode || undefined } });
      // Real gateway checkout goes here. Until keys are configured, the dev endpoint simulates a successful payment.
      await api("/payments/dev-confirm", { method: "POST", json: { orderId: order.id } });
      return order;
    },
    onSuccess: () => nav("/orders"), onError: (e: Error) => setError(e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setError(""); place.mutate({ ...(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>), addressId: saved }); };
  const input = "w-full rounded-sm border border-ink/20 px-3 py-2";

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <Link to="/shop" className="text-sm underline">Continue shopping</Link>
      <h1 className="mt-3 font-display text-3xl text-emerald">Your cart</h1>
      {isLoading && <p className="mt-6">Loading…</p>}
      {data && !data.items.length && <p className="mt-6">Your cart is empty. <Link to="/shop" className="underline">Browse jewellery</Link></p>}
      {data && data.items.length > 0 && (
        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_20rem]">
          <ul className="space-y-4">{data.items.map((i) => (
            <li key={i.id} className="flex gap-4 bg-white p-3">
              <img src={i.product.imageUrl} alt="" className="h-20 w-20 object-cover" />
              <div className="flex-1"><p className="font-display text-xl">{i.product.name}</p><p>{rupees(i.product.finalPricePaise)}</p>
                <div className="mt-1 flex items-center gap-3">
                  <button aria-label="Decrease" disabled={i.quantity <= 1} onClick={() => setQty(i.id, i.quantity - 1)}>−</button><span>{i.quantity}</span>
                  <button aria-label="Increase" disabled={i.quantity >= i.product.stock} onClick={() => setQty(i.id, i.quantity + 1)}>+</button>
                  <button onClick={() => remove(i.id)} className="ml-auto text-sm text-red-700 underline">Remove</button></div></div>
            </li>))}</ul>
          <form onSubmit={submit} className="space-y-3 bg-white p-5">
            <h2 className="font-display text-2xl">Delivery address</h2>
            <select value={saved} onChange={(e) => setSaved(e.target.value)} className={input} aria-label="Saved address"><option value="">Enter a new address</option>{acct.data?.addresses.map((a) => <option key={a.id} value={a.id}>{a.fullName}, {a.line1}, {a.city}</option>)}</select>
            <fieldset disabled={!!saved} hidden={!!saved} className="space-y-3"><input name="fullName" placeholder="Full name" required className={input} /><input name="phone" placeholder="Phone" required minLength={10} className={input} />
            <input name="line1" placeholder="Address line 1" required className={input} /><input name="line2" placeholder="Address line 2 (optional)" className={input} />
            <div className="flex gap-2"><input name="city" placeholder="City" required className={input} /><input name="pincode" placeholder="Pincode" required pattern="\d{6}" className={input} /></div>
            <input name="state" placeholder="State" required className={input} /></fieldset><input name="couponCode" placeholder="Coupon code (optional)" className={input} />
            <p className="flex justify-between border-t pt-3"><span>Subtotal</span><strong>{rupees(data.subtotalPaise)}</strong></p>
            <p className="text-xs text-ink/60">Delivery and coupon discounts are calculated when you place the order. Delivery is free above ₹10,000.</p>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button disabled={place.isPending} className="w-full rounded-sm bg-gold py-3 text-white disabled:opacity-60">{place.isPending ? "Placing order…" : "Place order and pay"}</button>
          </form>
        </div>)}
    </div>
  );
}
