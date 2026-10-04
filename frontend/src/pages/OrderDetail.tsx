import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, rupees } from "../api/client";

interface Order { orderNumber: string; status: string; subtotalPaise: number; discountPaise: number; deliveryPaise: number; totalPaise: number; createdAt: string;
  items: { id: string; productNameSnapshot: string; quantity: number; priceAtPurchasePaise: number }[]; payments: { status: string; method?: string }[];
  address: { fullName: string; line1: string; city: string; state: string; pincode: string } }
const STEPS = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export default function OrderDetail() {
  const { id } = useParams();
  const { data: o, isLoading, error } = useQuery({ queryKey: ["order", id], queryFn: () => api<Order>(`/orders/${id}`) });
  if (isLoading) return <p className="p-10">Loading…</p>;
  if (error || !o) return <p className="p-10">We couldn't find this order. <Link to="/orders" className="underline">Back to orders</Link></p>;
  const at = STEPS.indexOf(o.status);
  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <Link to="/orders" className="text-sm underline">Back to orders</Link>
      <h1 className="mt-3 font-display text-3xl text-emerald">Order {o.orderNumber}</h1>
      <p className="text-sm text-ink/60">Placed {new Date(o.createdAt).toLocaleDateString("en-IN")} · Payment: {o.payments[0]?.status ?? "—"}{o.payments[0]?.method && ` (${o.payments[0].method})`}</p>
      {at >= 0 ? <ol className="mt-6 grid grid-cols-3 gap-2 text-sm sm:grid-cols-6">{STEPS.map((s, i) => <li key={s} className={`border-t-4 pt-1 ${i <= at ? "border-gold font-medium" : "border-ink/10 text-ink/50"}`}>{s.replace(/_/g, " ").toLowerCase()}</li>)}</ol>
        : <p className="mt-6 font-medium">Status: {o.status.replace(/_/g, " ").toLowerCase()}</p>}
      <ul className="mt-6 space-y-1 bg-white p-4">{o.items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.quantity} × {i.productNameSnapshot}</span><span>{rupees(i.priceAtPurchasePaise * i.quantity)}</span></li>)}
        <li className="flex justify-between border-t pt-2"><span>Subtotal</span><span>{rupees(o.subtotalPaise)}</span></li>
        {o.discountPaise > 0 && <li className="flex justify-between"><span>Discount</span><span>−{rupees(o.discountPaise)}</span></li>}
        <li className="flex justify-between"><span>Delivery</span><span>{o.deliveryPaise ? rupees(o.deliveryPaise) : "Free"}</span></li>
        <li className="flex justify-between font-medium"><span>Total</span><span>{rupees(o.totalPaise)}</span></li></ul>
      <p className="mt-4 text-sm">Delivering to {o.address.fullName}, {o.address.line1}, {o.address.city}, {o.address.state} {o.address.pincode}</p>
    </div>
  );
}
