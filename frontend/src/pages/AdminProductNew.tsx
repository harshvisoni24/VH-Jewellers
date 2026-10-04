import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export default function AdminProductNew() {
  const nav = useNavigate();
  const [error, setError] = useState("");
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => api<{ id: string; name: string }[]>("/categories") });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      await api("/products", { method: "POST", json: { sku: f.sku, name: f.name, description: f.description, categoryId: f.categoryId,
        pricePaise: Math.round(Number(f.price) * 100), discountPercent: Number(f.discount || 0), stock: Number(f.stock), material: f.material,
        purity: f.purity || undefined, weightGrams: f.weight ? Number(f.weight) : undefined, brand: f.brand || undefined,
        imageUrls: f.images.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) } });
      nav("/admin/products");
    } catch (err) { setError((err as Error).message); }
  }
  const c = "w-full rounded-sm border border-ink/20 px-3 py-2";
  return (
    <form onSubmit={submit} className="max-w-xl space-y-3 px-5 py-6">
      <h1 className="font-display text-3xl text-emerald">Add product</h1>
      <input name="name" placeholder="Name" required className={c} /><input name="sku" placeholder="SKU" required className={c} />
      <select name="categoryId" required className={c}><option value="">Category</option>{cats.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <div className="grid grid-cols-3 gap-2"><input name="price" type="number" min={1} placeholder="Price (₹)" required className={c} /><input name="discount" type="number" min={0} max={90} placeholder="Discount %" className={c} /><input name="stock" type="number" min={0} placeholder="Stock" required className={c} /></div>
      <div className="grid grid-cols-3 gap-2"><input name="material" placeholder="Material" required className={c} /><input name="purity" placeholder="Purity" className={c} /><input name="weight" type="number" step="0.01" placeholder="Weight (g)" className={c} /></div>
      <input name="brand" placeholder="Brand" className={c} /><textarea name="description" placeholder="Description" required className={c} />
      <textarea name="images" placeholder="Image URLs (one per line, first is the main image)" className={c} />
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button className="rounded-sm bg-gold px-5 py-3 text-white">Save product</button>
    </form>
  );
}
