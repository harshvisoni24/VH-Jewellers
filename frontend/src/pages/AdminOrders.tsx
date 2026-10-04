import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, rupees } from "../api/client";

interface Row { id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string; user: { name: string }; items: { id: string; productNameSnapshot: string }[]; payments: { status: string }[] }
const STATUSES = ["PENDING", "PAID", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"];

export default function AdminOrders() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-orders"], queryFn: () => api<Row[]>("/admin/orders") });
  const update = (id: string, status: string) => api(`/admin/orders/${id}/status`, { method: "PATCH", json: { status } }).then(() => qc.invalidateQueries({ queryKey: ["admin-orders"] })).catch((e) => alert(e.message));
  return (
    <div className="px-5 py-6">
      <h1 className="font-display text-3xl text-emerald">Orders</h1>
      {isLoading && <p className="mt-6">Loading…</p>}{error && <p className="mt-6 text-red-700">{(error as Error).message}</p>}
      <table className="mt-6 w-full min-w-[700px] bg-white text-left text-sm">
        <thead><tr className="border-b"><th className="p-3">Order</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>{data?.map((o) => (
          <tr key={o.id} className="border-b"><td className="p-3">{o.orderNumber}</td><td>{o.user.name}</td><td>{o.items.map((i) => i.productNameSnapshot).join(", ")}</td>
            <td>{rupees(o.totalPaise)}</td><td>{o.payments[0]?.status ?? "—"}</td>
            <td><select value={o.status} onChange={(e) => update(o.id, e.target.value)} aria-label="Order status">{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></td>
            <td>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td></tr>))}</tbody>
      </table>
      {data && !data.length && <p className="mt-6">No orders yet.</p>}
    </div>
  );
}
