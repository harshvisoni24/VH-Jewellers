import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import { api, rupees } from "../api/client";
import BackButton from "../components/BackButton";
import SectionTitle from "../components/SectionTitle";

interface Tracked { orderNumber: string; status: string; createdAt: string; subtotalPaise: number; discountPaise: number; deliveryPaise: number; totalPaise: number;
  items: { name: string; quantity: number; pricePaise: number }[]; payments: { method?: string; status: string }[]; address: { fullName: string; city: string; state: string; pincode: string } }
const STEPS = ["Order received", "Processing", "Packed", "Shipped", "Out for delivery", "Delivered"];
const STEP_OF: Record<string, number> = { PENDING: 0, PAID: 0, PROCESSING: 1, PACKED: 2, SHIPPED: 3, OUT_FOR_DELIVERY: 4, DELIVERED: 5 };

export default function Track() {
  const [params] = useSearchParams();
  const [order, setOrder] = useState<Tracked | null>(null);
  const [looked, setLooked] = useState({ orderNumber: "", email: "" }); // what was typed, to fetch the receipt for the same order
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true); setError(""); setOrder(null); setLooked({ orderNumber: f.orderNumber.trim(), email: f.email.trim() });
    try { setOrder(await api<Tracked>(`/shop/track?${new URLSearchParams({ orderNumber: f.orderNumber.trim(), email: f.email.trim() })}`)); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const step = order ? STEP_OF[order.status] : undefined;
  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <BackButton />
      <SectionTitle as="h1" eyebrow="Order status" title="Track your order" className="mt-2" />
      <form onSubmit={submit} className="mt-10 space-y-3 bg-panel p-6">
        <input name="orderNumber" defaultValue={params.get("order") ?? ""} placeholder="Order number (e.g. VH-1A2B3C)" required className="w-full" />
        <input name="email" type="email" placeholder="Email used at checkout" required className="w-full" />
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button disabled={busy} className="btn-gold w-full disabled:opacity-60">{busy ? "Looking…" : "Track order"}</button>
      </form>
      {order && (
        <section className="mt-8 bg-panel p-6" aria-live="polite">
          <p className="eyebrow !tracking-[0.2em]">Order {order.orderNumber} · placed {new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
          {step !== undefined
            ? <ol className="mt-5 space-y-2">{STEPS.map((s, i) => <li key={s} className={`flex items-center gap-3 ${i <= step ? "text-gold" : "text-ink/40"}`}><span className={`h-2 w-2 rotate-45 ${i <= step ? "bg-gold" : "border border-gold/30"}`} />{s}</li>)}</ol>
            : <p className="mt-4 font-display text-2xl text-gold">{order.status.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}</p>}
          <ul className="mt-6 space-y-1 border-t pt-4 text-sm">{order.items.map((i) => <li key={i.name} className="flex justify-between"><span>{i.name} × {i.quantity}</span><span>{rupees(i.pricePaise * i.quantity)}</span></li>)}
            <li className="flex items-baseline justify-between pt-3"><span className="eyebrow">Total</span><strong className="font-display text-2xl font-medium text-gold">{rupees(order.totalPaise)}</strong></li></ul>
          <a href={`/api/shop/receipt?${new URLSearchParams(looked)}`} download className="btn-outline mt-6"><Download size={16} strokeWidth={1.6} />Download receipt</a>
          <p className="mt-6 text-sm text-ink/70">Delivering to {order.address.fullName}, {order.address.city}, {order.address.state} {order.address.pincode}. Payment: {order.payments[0]?.method === "COD" ? "cash on delivery" : order.payments[0]?.status.toLowerCase()}{order.payments[0]?.status === "PAID" && order.payments[0]?.method === "COD" ? " (paid)" : ""}.</p>
        </section>
      )}
    </div>
  );
}
