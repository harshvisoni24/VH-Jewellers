import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, rupees } from "../api/client";

interface Tracked { orderNumber: string; status: string; createdAt: string; subtotalPaise: number; discountPaise: number; deliveryPaise: number; totalPaise: number;
  items: { name: string; quantity: number; pricePaise: number }[]; payments: { method?: string; status: string }[]; address: { fullName: string; city: string; state: string; pincode: string } }
const STEPS = ["Order received", "Processing", "Packed", "Shipped", "Out for delivery", "Delivered"];
const STEP_OF: Record<string, number> = { PENDING: 0, PAID: 0, PROCESSING: 1, PACKED: 2, SHIPPED: 3, OUT_FOR_DELIVERY: 4, DELIVERED: 5 };
const input = "w-full rounded-sm border border-ink/20 px-3 py-2";

export default function Track() {
  const [params] = useSearchParams();
  const [order, setOrder] = useState<Tracked | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true); setError(""); setOrder(null);
    try { setOrder(await api<Tracked>(`/shop/track?${new URLSearchParams({ orderNumber: f.orderNumber.trim(), email: f.email.trim() })}`)); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const step = order ? STEP_OF[order.status] : undefined;
  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <h1 className="font-display text-3xl text-emerald">Track your order</h1>
      <form onSubmit={submit} className="mt-5 space-y-3 bg-white p-5">
        <input name="orderNumber" defaultValue={params.get("order") ?? ""} placeholder="Order number (e.g. VH-1A2B3C)" required className={input} />
        <input name="email" type="email" placeholder="Email used at checkout" required className={input} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-sm bg-gold py-3 text-white disabled:opacity-60">{busy ? "Looking…" : "Track order"}</button>
      </form>
      {order && (
        <section className="mt-6 bg-white p-5" aria-live="polite">
          <p className="text-sm text-ink/60">Order {order.orderNumber} · placed {new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
          {step !== undefined
            ? <ol className="mt-3 space-y-1">{STEPS.map((s, i) => <li key={s} className={i <= step ? "font-medium text-emerald" : "text-ink/40"}>{i <= step ? "✓" : "○"} {s}</li>)}</ol>
            : <p className="mt-3 text-lg font-medium text-emerald">{order.status.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}</p>}
          <ul className="mt-4 space-y-1 border-t pt-3 text-sm">{order.items.map((i) => <li key={i.name} className="flex justify-between"><span>{i.name} × {i.quantity}</span><span>{rupees(i.pricePaise * i.quantity)}</span></li>)}
            <li className="flex justify-between pt-1 text-base"><strong>Total</strong><strong>{rupees(order.totalPaise)}</strong></li></ul>
          <p className="mt-3 text-sm text-ink/70">Delivering to {order.address.fullName}, {order.address.city}, {order.address.state} {order.address.pincode}. Payment: {order.payments[0]?.method === "COD" ? "cash on delivery" : order.payments[0]?.status.toLowerCase()}{order.payments[0]?.status === "PAID" && order.payments[0]?.method === "COD" ? " (paid)" : ""}.</p>
        </section>
      )}
    </div>
  );
}