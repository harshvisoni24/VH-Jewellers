import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { FileText } from "lucide-react";
import { api, rupees } from "../api/client";
import { FilterBar, Paged, Pager, SelectFilter, TextFilter, useListState } from "../components/ListControls";

interface Row { id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string; user: { name: string }; items: { id: string; productNameSnapshot: string }[]; payments: { status: string }[] }
interface Cat { id: string; name: string }
const STATUSES = ["PENDING", "PAID", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"];
const label = (s: string) => s.replace(/_/g, " ");

export default function AdminOrders() {
  const qc = useQueryClient();
  const list = useListState({ q: "", status: "", category: "", minAmount: "", maxAmount: "", sort: "newest" });
  const { filters: f } = list;
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => api<Cat[]>("/categories") });
  const { data, isLoading, isPlaceholderData, error } = useQuery({ queryKey: ["admin-orders", ...list.key], placeholderData: keepPreviousData,
    queryFn: () => api<Paged<Row>>(`/admin/list/orders?${list.query()}`) });
  useEffect(() => { if (!isPlaceholderData) list.follow(data?.page); }, [data?.page, isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (id: string, status: string) => api(`/admin/orders/${id}/status`, { method: "PATCH", json: { status } }).then(() => qc.invalidateQueries({ queryKey: ["admin-orders"] })).catch((e) => alert(e.message));
  return (
    <div className="px-5 py-6">
      <h1 className="font-display text-4xl text-gold">Orders</h1>
      <FilterBar onReset={list.reset} active={list.active}>
        <TextFilter label="Search order no., customer" value={f.q} onChange={(v) => list.set("q", v)} placeholder="e.g. VH-1A2B or Asha" />
        <SelectFilter label="Order status" value={f.status} onChange={(v) => list.set("status", v)} options={[["", "All statuses"], ...STATUSES.map((s): [string, string] => [s, label(s)])]} />
        <SelectFilter label="Product category" value={f.category} onChange={(v) => list.set("category", v)} options={[["", "All categories"], ...(cats.data ?? []).map((c): [string, string] => [c.id, c.name])]} />
        <SelectFilter label="Sort by" value={f.sort} onChange={(v) => list.set("sort", v)} options={[["newest", "Newest first"], ["oldest", "Oldest first"], ["amount_desc", "Amount: high to low"], ["amount_asc", "Amount: low to high"]]} />
        <TextFilter label="Min amount (₹)" type="number" value={f.minAmount} onChange={(v) => list.set("minAmount", v)} />
        <TextFilter label="Max amount (₹)" type="number" value={f.maxAmount} onChange={(v) => list.set("maxAmount", v)} />
      </FilterBar>
      {isLoading && <p className="mt-6">Loading…</p>}{error && <p className="mt-6 text-rose-300">{(error as Error).message}</p>}
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[700px] bg-panel text-left text-sm">
        <thead><tr className="border-b"><th className="p-3">Order</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th><th>Receipt</th></tr></thead>
        <tbody>{data?.items.map((o) => (
          <tr key={o.id} className="border-b"><td className="p-3">{o.orderNumber}</td><td>{o.user.name}</td><td>{o.items.map((i) => i.productNameSnapshot).join(", ")}</td>
            <td>{rupees(o.totalPaise)}</td><td>{o.payments[0]?.status ?? "—"}</td>
            <td><select value={o.status} onChange={(e) => update(o.id, e.target.value)} aria-label="Order status">{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></td>
            <td>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
            <td><a href={`/api/admin/list/orders/${o.id}/receipt`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-gold underline-offset-4 hover:underline"><FileText size={16} strokeWidth={1.5} />View</a></td></tr>))}</tbody>
      </table></div>
      {data && !data.total && <p className="mt-6">{list.active ? "No orders match these filters." : "No orders yet."}</p>}
      <Pager data={data} onPage={list.setPage} />
    </div>
  );
}
