import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, rupees } from "../api/client";

interface P { id: string; sku: string; name: string; pricePaise: number; discountPercent: number; stock: number; status: string }

export default function AdminProducts() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: () => api<{ items: P[] }>("/products?pageSize=48") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-products"] });
  const save = (id: string, patch: Partial<P>) => api(`/products/${id}`, { method: "PATCH", json: patch }).then(refresh).catch((e) => alert(e.message));
  const del = (p: P) => confirm(`Delete ${p.name}?`) && api(`/products/${p.id}`, { method: "DELETE" }).then(refresh).catch((e) => alert(e.message));
  return (
    <div className="px-5 py-6">
      <h1 className="font-display text-3xl text-emerald">Products</h1>
      {isLoading && <p className="mt-6">Loading…</p>}
      <table className="mt-6 w-full min-w-[700px] bg-white text-left text-sm">
        <thead><tr className="border-b"><th className="p-3">Name</th><th>SKU</th><th>Price (₹)</th><th>Discount %</th><th>Stock</th><th>Status</th><th /></tr></thead>
        <tbody>{data?.items.map((p) => (
          <tr key={p.id} className="border-b"><td className="p-3">{p.name}</td><td>{p.sku}</td>
            <td><input type="number" defaultValue={p.pricePaise / 100} className="w-28 border px-1" onBlur={(e) => Number(e.target.value) * 100 !== p.pricePaise && save(p.id, { pricePaise: Math.round(Number(e.target.value) * 100) })} aria-label="Price" /></td>
            <td><input type="number" min={0} max={90} defaultValue={p.discountPercent} className="w-16 border px-1" onBlur={(e) => Number(e.target.value) !== p.discountPercent && save(p.id, { discountPercent: Number(e.target.value) })} aria-label="Discount" /></td>
            <td><input type="number" min={0} defaultValue={p.stock} className="w-16 border px-1" onBlur={(e) => Number(e.target.value) !== p.stock && save(p.id, { stock: Number(e.target.value) })} aria-label="Stock" /></td>
            <td>{p.stock === 0 ? "Out of stock" : p.stock <= 3 ? "Low stock" : "In stock"}</td>
            <td><Link to={`/admin/products/${p.id}`} className="mr-3 underline">Edit</Link><button onClick={() => del(p)} className="text-red-700 underline">Delete</button></td></tr>))}</tbody>
      </table>
      <p className="mt-3 text-sm text-ink/60">Edit a price, discount or stock value and click away to save. Current prices show on the shop straight away.</p>
    </div>
  );
}
