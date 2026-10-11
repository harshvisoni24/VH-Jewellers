import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

interface P { name: string; description: string; pricePaise: number; discountPercent: number; stock: number; material: string; purity?: string; weightGrams?: string; size?: string; color?: string; brand?: string; status: string; images: { id: string; url: string }[] }

export default function AdminProductEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const { data: p } = useQuery({ queryKey: ["admin-product", id], queryFn: () => api<P>(`/admin/products/${id}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-product", id] });
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    await api(`/products/${id}`, { method: "PATCH", json: { name: f.name, description: f.description, pricePaise: Math.round(Number(f.price) * 100), discountPercent: Number(f.discount || 0),
      stock: Number(f.stock), material: f.material, purity: f.purity || undefined, weightGrams: f.weight ? Number(f.weight) : undefined, size: f.size || undefined, color: f.color || undefined, brand: f.brand || undefined, status: f.status } })
      .then(() => { qc.invalidateQueries({ queryKey: ["admin-products"] }); nav("/admin/products"); }).catch((x) => setMsg(x.message));
  }
  const addImage = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const el = e.currentTarget; api(`/admin/products/${id}/images`, { method: "POST", json: { url: new FormData(el).get("url") } }).then(() => { el.reset(); refresh(); }).catch((x) => setMsg(x.message)); };
  if (!p) return <p className="p-6">Loading…</p>;
  const c = "w-full rounded-sm border border-gold/30 px-3 py-2";
  return (
    <div className="max-w-xl px-5 py-6">
      <h1 className="font-display text-4xl text-gold">Edit product</h1>
      <form onSubmit={save} className="mt-4 space-y-3">
        <input name="name" defaultValue={p.name} required className={c} aria-label="Name" />
        <div className="grid grid-cols-3 gap-2"><input name="price" type="number" defaultValue={p.pricePaise / 100} required className={c} aria-label="Price (₹)" /><input name="discount" type="number" min={0} max={90} defaultValue={p.discountPercent} className={c} aria-label="Discount %" /><input name="stock" type="number" min={0} defaultValue={p.stock} required className={c} aria-label="Stock" /></div>
        <div className="grid grid-cols-3 gap-2"><input name="material" defaultValue={p.material} required className={c} aria-label="Material" /><input name="purity" defaultValue={p.purity ?? ""} className={c} aria-label="Purity" /><input name="weight" type="number" step="0.01" defaultValue={p.weightGrams ?? ""} className={c} aria-label="Weight (g)" /></div>
        <div className="grid grid-cols-3 gap-2"><input name="size" defaultValue={p.size ?? ""} placeholder="Size" className={c} /><input name="color" defaultValue={p.color ?? ""} placeholder="Colour" className={c} /><input name="brand" defaultValue={p.brand ?? ""} placeholder="Brand" className={c} /></div>
        <textarea name="description" defaultValue={p.description} required className={c} aria-label="Description" />
        <select name="status" defaultValue={p.status} className={c} aria-label="Status"><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
        <button className="rounded-sm bg-gold px-5 py-3 text-night">Save changes</button></form>
      {msg && <p role="alert" className="mt-2 text-rose-300">{msg}</p>}
      <h2 className="mt-8 font-display text-2xl">Images</h2>
      <ul className="mt-2 flex flex-wrap gap-3">{p.images.map((im) => <li key={im.id}><img src={im.url} alt="" className="h-24 w-24 object-cover" /><button onClick={() => api(`/admin/images/${im.id}`, { method: "DELETE" }).then(refresh)} className="text-sm text-rose-300 underline">Remove</button></li>)}</ul>
      <form onSubmit={addImage} className="mt-3 flex gap-2"><input name="url" type="url" placeholder="Image URL" required className={c} /><button className="rounded-sm border border-gold/60 bg-night/40 px-4 text-gold">Add</button></form>
      <label className="mt-3 block text-sm">Or upload from your computer (JPG, PNG or WebP, up to 5 MB)
        <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const fd = new FormData(); fd.append("image", file);
          api(`/admin/products/${id}/images/upload`, { method: "POST", body: fd }).then(refresh).catch((x) => setMsg(x.message)); e.target.value = ""; }} /></label>
    </div>
  );
}
