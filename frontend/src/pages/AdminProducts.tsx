import { Link } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../api/client";
import { FilterBar, Paged, Pager, SelectFilter, TextFilter, useListState } from "../components/ListControls";

interface P { id: string; sku: string; name: string; pricePaise: number; discountPercent: number; stock: number; status: string; category: { id: string; name: string } }
interface Cat { id: string; name: string }

export default function AdminProducts() {
  const qc = useQueryClient();
  const list = useListState({ q: "", category: "", status: "", minPrice: "", maxPrice: "", sort: "newest" });
  const { filters: f } = list;
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => api<Cat[]>("/categories") });
  const { data, isLoading, isPlaceholderData, error } = useQuery({ queryKey: ["admin-products", ...list.key], placeholderData: keepPreviousData,
    queryFn: () => api<Paged<P>>(`/admin/list/products?${list.query()}`) });
  useEffect(() => { if (!isPlaceholderData) list.follow(data?.page); }, [data?.page, isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-products"] });
  const save = (id: string, patch: Partial<P>) => api(`/products/${id}`, { method: "PATCH", json: patch }).then(refresh).catch((e) => { alert(e.message); refresh(); });
  const del = (p: P) => confirm(`Delete ${p.name}?`) && api<{ archived?: boolean } | undefined>(`/products/${p.id}`, { method: "DELETE" })
    .then((r) => { if (r?.archived) alert(`${p.name} is part of past orders, so it was archived instead of deleted. It no longer shows in the shop.`); refresh(); })
    .catch((e) => alert(e.message));
  return (
    <div className="px-5 py-6">
      <h1 className="font-display text-3xl text-emerald">Products</h1>
      <FilterBar onReset={list.reset} active={list.active}>
        <TextFilter label="Search name or SKU" value={f.q} onChange={(v) => list.set("q", v)} placeholder="e.g. Gold Ring" />
        <SelectFilter label="Category" value={f.category} onChange={(v) => list.set("category", v)} options={[["", "All categories"], ...(cats.data ?? []).map((c): [string, string] => [c.id, c.name])]} />
        <SelectFilter label="Status" value={f.status} onChange={(v) => list.set("status", v)} options={[["", "Active and draft"], ["ACTIVE", "Active"], ["DRAFT", "Draft"], ["ARCHIVED", "Archived"]]} />
        <SelectFilter label="Sort by" value={f.sort} onChange={(v) => list.set("sort", v)} options={[["newest", "Newest first"], ["oldest", "Oldest first"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"], ["name", "Name A–Z"]]} />
        <TextFilter label="Min price (₹)" type="number" value={f.minPrice} onChange={(v) => list.set("minPrice", v)} />
        <TextFilter label="Max price (₹)" type="number" value={f.maxPrice} onChange={(v) => list.set("maxPrice", v)} />
      </FilterBar>
      {isLoading && <p className="mt-6">Loading…</p>}{error && <p className="mt-6 text-red-700">{(error as Error).message}</p>}
      <table className="mt-6 w-full min-w-[800px] bg-white text-left text-sm">
        <thead><tr className="border-b"><th className="p-3">Name</th><th>Category</th><th>SKU</th><th>Price (₹)</th><th>Discount %</th><th>Stock</th><th>Stock status</th><th>Status</th><th /></tr></thead>
        <tbody>{data?.items.map((p) => (
          <tr key={`${p.id}-${p.pricePaise}-${p.discountPercent}-${p.stock}`} className="border-b"><td className="p-3">{p.name}</td><td>{p.category.name}</td><td>{p.sku}</td>
            <td><input type="number" defaultValue={p.pricePaise / 100} className="w-28 border px-1" onBlur={(e) => Number(e.target.value) * 100 !== p.pricePaise && save(p.id, { pricePaise: Math.round(Number(e.target.value) * 100) })} aria-label="Price" /></td>
            <td><input type="number" min={0} max={90} defaultValue={p.discountPercent} className="w-16 border px-1" onBlur={(e) => Number(e.target.value) !== p.discountPercent && save(p.id, { discountPercent: Number(e.target.value) })} aria-label="Discount" /></td>
            <td><input type="number" min={0} defaultValue={p.stock} className="w-16 border px-1" onBlur={(e) => Number(e.target.value) !== p.stock && save(p.id, { stock: Number(e.target.value) })} aria-label="Stock" /></td>
            <td>{p.stock === 0 ? "Out of stock" : p.stock <= 3 ? "Low stock" : "In stock"}</td>
            <td>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</td>
            <td className="whitespace-nowrap pr-3"><Link to={`/admin/products/${p.id}`} className="mr-3 underline">Edit</Link><button onClick={() => del(p)} className="text-red-700 underline">Delete</button></td></tr>))}</tbody>
      </table>
      {data && !data.total && <p className="mt-6">{list.active ? "No products match these filters." : <>No products yet. <Link to="/admin/products/new" className="underline">Add your first product</Link>.</>}</p>}
      <Pager data={data} onPage={list.setPage} />
      <p className="mt-3 text-sm text-ink/60">Edit a price, discount or stock value and click away to save. Prices shown are the listed price before discount.</p>
    </div>
  );
}
