import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, rupees } from "../api/client";

interface Order { id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string; items: { id: string; productNameSnapshot: string; quantity: number; priceAtPurchasePaise: number }[] }
const cancellable = ["PENDING", "PAID", "PROCESSING"];

export default function Orders() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => api<Order[]>("/orders") });
  const ret = (id: string) => confirm("Request a return for this order?") && api(`/orders/${id}/return`, { method: "POST" }).then(() => qc.invalidateQueries({ queryKey: ["orders"] })).catch((e) => alert(e.message));
  const cancel = (id: string) => confirm("Cancel this order?") && api(`/orders/${id}/cancel`, { method: "POST" }).then(() => qc.invalidateQueries({ queryKey: ["orders"] })).catch((e) => alert(e.message));
  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <Link to="/shop" className="text-sm underline">Back to shop</Link>
      <h1 className="mt-3 font-display text-4xl text-gold">My orders</h1>
      {isLoading && <p className="mt-6">Loading…</p>}
      {data && !data.length && <p className="mt-6">You haven't placed any orders yet.</p>}
      <ul className="mt-6 space-y-4">{data?.map((o) => (
        <li key={o.id} className="bg-panel p-4">
          <div className="flex flex-wrap justify-between gap-2"><Link to={`/orders/${o.id}`} className="font-bold underline">{o.orderNumber}</Link><span>{o.status.replace(/_/g, " ")}</span><span>{new Date(o.createdAt).toLocaleDateString("en-IN")}</span><strong>{rupees(o.totalPaise)}</strong></div>
          <ul className="mt-2 text-sm text-ink/70">{o.items.map((i) => <li key={i.id}>{i.quantity} × {i.productNameSnapshot} at {rupees(i.priceAtPurchasePaise)}</li>)}</ul>
          {cancellable.includes(o.status) && <button onClick={() => cancel(o.id)} className="mt-2 text-sm text-rose-300 underline">Cancel order</button>}
          {o.status === "DELIVERED" && <button onClick={() => ret(o.id)} className="mt-2 mr-3 text-sm underline">Request return</button>}
          {!["PENDING", "CANCELLED"].includes(o.status) && <a href={`/api/orders/${o.id}/invoice`} target="_blank" rel="noreferrer" className="mt-2 text-sm underline">Invoice</a>}
        </li>))}</ul>
    </div>
  );
}
