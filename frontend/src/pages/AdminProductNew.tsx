import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { api } from "../api/client";

const MAX_FILES = 8, MAX_BYTES = 5 * 1024 * 1024; // the server also refuses anything over 5 MB

export default function AdminProductNew() {
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");            // progress text while saving, empty when idle
  const [files, setFiles] = useState<File[]>([]);  // pictures chosen from the computer; the first one is the main image
  const [fileMsg, setFileMsg] = useState("");
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => api<{ id: string; name: string }[]>("/categories") });
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files], problems: string[] = [];
    for (const f of Array.from(list)) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type) || !/\.(jpe?g|png|webp)$/i.test(f.name)) problems.push(`${f.name}: only JPG, PNG or WebP`);
      else if (f.size > MAX_BYTES) problems.push(`${f.name}: larger than 5 MB`);
      else if (next.some((x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified)) continue; // already chosen
      else if (next.length >= MAX_FILES) problems.push(`${f.name}: up to ${MAX_FILES} images`);
      else next.push(f);
    }
    setFiles(next); setFileMsg(problems.join(" · "));
  }
  const removeFile = (i: number) => setFiles(files.filter((_, j) => j !== i));
  const makeMain = (i: number) => setFiles([files[i], ...files.filter((_, j) => j !== i)]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const urls = (f.images ?? "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    setError(""); setBusy("Saving product…");
    let id: string;
    try {
      ({ id } = await api<{ id: string }>("/products", { method: "POST", json: { sku: f.sku, name: f.name, description: f.description, categoryId: f.categoryId,
        pricePaise: Math.round(Number(f.price) * 100), discountPercent: Number(f.discount || 0), stock: Number(f.stock), material: f.material,
        purity: f.purity || undefined, weightGrams: f.weight ? Number(f.weight) : undefined, brand: f.brand || undefined } }));
    } catch (err) { setError((err as Error).message); setBusy(""); return; }

    // The product exists now. Add its pictures one at a time, in order: chosen files first (so the first file is the main image), then pasted links.
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setBusy(`Uploading image ${i + 1} of ${files.length}…`);
      const fd = new FormData(); fd.append("image", files[i]);
      try { await api(`/admin/products/${id}/images/upload`, { method: "POST", body: fd }); } catch { failed.push(files[i].name); }
    }
    for (const url of urls) {
      setBusy("Adding image links…");
      try { await api(`/admin/products/${id}/images`, { method: "POST", json: { url } }); } catch { failed.push(url); }
    }
    setBusy("");
    if (failed.length) { alert(`The product was saved, but these images could not be added: ${failed.join(", ")}.\nYou can add them on the next page.`); nav(`/admin/products/${id}`); }
    else nav("/admin/products");
  }
  const c = "w-full rounded-sm border border-gold/30 px-3 py-2";
  return (
    <form onSubmit={submit} className="max-w-xl space-y-3 px-5 py-6">
      <h1 className="font-display text-4xl text-gold">Add product</h1>
      <input name="name" placeholder="Name" required className={c} /><input name="sku" placeholder="SKU" required className={c} />
      <select name="categoryId" required className={c}><option value="">Category</option>{cats.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><input name="price" type="number" min={1} placeholder="Price (₹)" required className={c} /><input name="discount" type="number" min={0} max={90} placeholder="Discount %" className={c} /><input name="stock" type="number" min={0} placeholder="Stock" required className={c} /></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><input name="material" placeholder="Material" required className={c} /><input name="purity" placeholder="Purity" className={c} /><input name="weight" type="number" step="0.01" placeholder="Weight (g)" className={c} /></div>
      <input name="brand" placeholder="Brand" className={c} /><textarea name="description" placeholder="Description" required className={c} />

      <div className="pt-2">
        <p className="eyebrow !tracking-[0.2em]">Product images</p>
        <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          className="mt-2 flex cursor-pointer flex-col items-center gap-2 border border-dashed border-gold/50 bg-night/40 px-4 py-8 text-center transition hover:border-gold hover:bg-gold/5 focus-within:border-gold">
          <ImagePlus size={32} strokeWidth={1.2} className="text-gold" />
          <span className="text-pearl">Choose images from your computer</span>
          <span className="text-sm text-ink/60">or drag them here. JPG, PNG or WebP, up to 5 MB each, up to {MAX_FILES} images.</span>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
        {fileMsg && <p role="alert" className="mt-2 text-sm text-rose-300">{fileMsg}</p>}
        {files.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">{files.map((file, i) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="relative border border-gold/40 bg-night">
              <img src={previews[i]} alt={file.name} className="aspect-square w-full object-cover" />
              <button type="button" onClick={() => removeFile(i)} aria-label={`Remove ${file.name}`} className="absolute right-1 top-1 grid h-6 w-6 place-items-center bg-night/85 text-gold hover:bg-night"><X size={14} /></button>
              {i === 0 ? <span className="absolute bottom-0 left-0 right-0 bg-gold py-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-night">Main image</span>
                : <button type="button" onClick={() => makeMain(i)} className="absolute bottom-0 left-0 right-0 bg-night/85 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] text-gold hover:bg-night">Make main</button>}
            </li>))}</ul>)}
        <textarea name="images" placeholder="Or paste image links (one per line). These are added after the images above." className={`${c} mt-3`} />
      </div>

      {error && <p role="alert" className="text-rose-300">{error}</p>}
      <button disabled={!!busy} className="rounded-sm bg-gold px-5 py-3 text-night disabled:opacity-60">{busy || "Save product"}</button>
    </form>
  );
}
