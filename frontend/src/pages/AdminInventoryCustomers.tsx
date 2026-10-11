import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";
import { api, rupees } from "../api/client";
import { FilterBar, Paged, Pager, SelectFilter, TextFilter, useListState } from "../components/ListControls";

interface Cat { id: string; name: string }
const Table = ({ title, head, children }: { title: string; head: string[]; children: ReactNode }) => (
  <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[600px] bg-panel text-left text-sm"><caption className="sr-only">{title}</caption>
    <thead><tr className="border-b">{head.map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>);
const td = "p-3";

export function AdminInventory() {
  const list = useListState({ q: "", category: "", stock: "", sort: "stock_asc" });
  const { filters: f } = list;
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => api<Cat[]>("/categories") });
  const { data, isLoading, isPlaceholderData, error } = useQuery({ queryKey: ["inventory", ...list.key], placeholderData: keepPreviousData,
    queryFn: () => api<Paged<{ id: string; sku: string; name: string; stock: number; reservedStock: number; available: number; status: string; category: { name: string } }>>(`/admin/list/inventory?${list.query()}`) });
  useEffect(() => { if (!isPlaceholderData) list.follow(data?.page); }, [data?.page, isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="px-5 py-6">
      <h1 className="font-display text-4xl text-gold">Inventory</h1>
      <FilterBar onReset={list.reset} active={list.active}>
        <TextFilter label="Search name or SKU" value={f.q} onChange={(v) => list.set("q", v)} />
        <SelectFilter label="Category" value={f.category} onChange={(v) => list.set("category", v)} options={[["", "All categories"], ...(cats.data ?? []).map((c): [string, string] => [c.id, c.name])]} />
        <SelectFilter label="Stock level" value={f.stock} onChange={(v) => list.set("stock", v)} options={[["", "All"], ["in", "In stock"], ["low", "Low stock (1–3)"], ["out", "Out of stock"]]} />
        <SelectFilter label="Sort by" value={f.sort} onChange={(v) => list.set("sort", v)} options={[["stock_asc", "Stock: low to high"], ["stock_desc", "Stock: high to low"], ["name", "Name A–Z"], ["newest", "Newest first"]]} />
      </FilterBar>
      {isLoading && <p className="mt-6">Loading…</p>}{error && <p className="mt-6 text-rose-300">{(error as Error).message}</p>}
      <Table title="Inventory" head={["Product", "Category", "SKU", "Current stock", "Reserved", "Available", "Status"]}>{data?.items.map((p) => (
        <tr key={p.id} className="border-b"><td className={td}>{p.name}</td><td>{p.category.name}</td><td>{p.sku}</td><td>{p.stock}</td><td>{p.reservedStock}</td><td>{p.available}</td><td>{p.status}</td></tr>))}</Table>
      {data && !data.total && <p className="mt-6">{list.active ? "No products match these filters." : "No products in inventory yet."}</p>}
      <Pager data={data} onPage={list.setPage} />
    </div>
  );
}

export function AdminCustomers() {
  const qc = useQueryClient();
  const list = useListState({ q: "", account: "", ordered: "", minSpent: "", maxSpent: "", sort: "newest" });
  const { filters: f } = list;
  const { data, isLoading, isPlaceholderData, error } = useQuery({ queryKey: ["customers", ...list.key], placeholderData: keepPreviousData,
    queryFn: () => api<Paged<{ id: string; name: string; email: string; phone?: string; createdAt: string; orders: number; totalSpentPaise: number; isActive: boolean }>>(`/admin/list/customers?${list.query()}`) });
  useEffect(() => { if (!isPlaceholderData) list.follow(data?.page); }, [data?.page, isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: string, isActive: boolean) => api(`/admin/customers/${id}`, { method: "PATCH", json: { isActive } }).then(() => qc.invalidateQueries({ queryKey: ["customers"] })).catch((e) => alert(e.message));
  return (
    <div className="px-5 py-6">
      <h1 className="font-display text-4xl text-gold">Customers</h1>
      <FilterBar onReset={list.reset} active={list.active}>
        <TextFilter label="Search name, email, phone" value={f.q} onChange={(v) => list.set("q", v)} />
        <SelectFilter label="Account" value={f.account} onChange={(v) => list.set("account", v)} options={[["", "All accounts"], ["active", "Active"], ["disabled", "Disabled"]]} />
        <SelectFilter label="Orders" value={f.ordered} onChange={(v) => list.set("ordered", v)} options={[["", "All customers"], ["yes", "Has placed orders"], ["no", "No orders yet"]]} />
        <SelectFilter label="Sort by" value={f.sort} onChange={(v) => list.set("sort", v)} options={[["newest", "Newest first"], ["oldest", "Oldest first"], ["name", "Name A–Z"], ["orders_desc", "Most orders"], ["spent_desc", "Total spent: high to low"], ["spent_asc", "Total spent: low to high"]]} />
        <TextFilter label="Min total spent (₹)" type="number" value={f.minSpent} onChange={(v) => list.set("minSpent", v)} />
        <TextFilter label="Max total spent (₹)" type="number" value={f.maxSpent} onChange={(v) => list.set("maxSpent", v)} />
      </FilterBar>
      {isLoading && <p className="mt-6">Loading…</p>}{error && <p className="mt-6 text-rose-300">{(error as Error).message}</p>}
      <Table title="Customers" head={["Name", "Email", "Phone", "Joined", "Orders", "Total spent", "Account"]}>{data?.items.map((u) => (
        <tr key={u.id} className="border-b"><td className={td}>{u.name}</td><td>{u.email}</td><td>{u.phone ?? "—"}</td><td>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td><td>{u.orders}</td><td>{rupees(u.totalSpentPaise)}</td>
          <td><button onClick={() => toggle(u.id, !u.isActive)} className="underline">{u.isActive ? "Active (disable)" : "Disabled (enable)"}</button></td></tr>))}</Table>
      {data && !data.total && <p className="mt-6">{list.active ? "No customers match these filters." : "No customers have registered yet."}</p>}
      <Pager data={data} onPage={list.setPage} />
    </div>
  );
}
