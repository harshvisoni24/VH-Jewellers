import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api, rupees } from "../api/client";
import HomeSections from "../components/HomeSections";
import { useCart } from "../context/CartContext";

interface Product { id: string; name: string; sku: string; material: string; purity?: string; pricePaise: number; finalPricePaise: number;
  discountPercent: number; stock: number; images: { url: string }[] }
interface Page { total: number; items: Product[] }
const EMPTY = { material: "", minPrice: "", maxPrice: "", minRating: "", inStock: "" };
const box = "rounded-sm border border-ink/20 bg-white px-3 py-2";

export default function Shop() {
  const cart = useCart();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [f, setF] = useState(EMPTY);
  const [flash, setFlash] = useState<{ id: string; text: string } | null>(null);
  const filtered = Object.values(f).some(Boolean);
  const sugg = useQuery({ queryKey: ["sugg", q], enabled: q.length >= 2, queryFn: () => api<string[]>(`/products/suggest?q=${encodeURIComponent(q)}`) });
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => api<{ id: string; name: string; slug: string }[]>("/categories") });
  const { data, isLoading, error } = useQuery({ queryKey: ["products", q, sort, page, category, f], placeholderData: keepPreviousData,
    queryFn: () => api<Page>(`/products?${new URLSearchParams({ q, sort, page: String(page), ...(category && { category }), ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) })}`) });
  const setFilter = (patch: Partial<typeof EMPTY>) => { setF({ ...f, ...patch }); setPage(1); };
  const addToCart = (p: Product) => {
    const r = cart.add(p.id, p.stock);
    setFlash({ id: p.id, text: r === "added" ? "Added ✓" : "Max in cart" });
    setTimeout(() => setFlash((cur) => (cur?.id === p.id ? null : cur)), 1500);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <section aria-label="Find jewellery" className="bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search rings, gold, SKU…" aria-label="Search products" list="sugg" className={`${box} w-full pl-10`} />
          </div>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Category" className={box}><option value="">All categories</option>{cats.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className={box}>
            <option value="newest">Newest</option><option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option><option value="rating">Top rated</option>
          </select>
        </div>
        <datalist id="sugg">{sugg.data?.map((n) => <option key={n} value={n} />)}</datalist>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <select value={f.material} onChange={(e) => setFilter({ material: e.target.value })} aria-label="Material" className="border px-2 py-1"><option value="">Any material</option>{["Gold", "Silver", "Platinum"].map((m) => <option key={m}>{m}</option>)}</select>
          <input type="number" min={0} placeholder="Min ₹" value={f.minPrice} onChange={(e) => setFilter({ minPrice: e.target.value })} className="w-24 border px-2 py-1" aria-label="Minimum price" />
          <input type="number" min={0} placeholder="Max ₹" value={f.maxPrice} onChange={(e) => setFilter({ maxPrice: e.target.value })} className="w-24 border px-2 py-1" aria-label="Maximum price" />
          <select value={f.minRating} onChange={(e) => setFilter({ minRating: e.target.value })} aria-label="Minimum rating" className="border px-2 py-1"><option value="">Any rating</option><option value="4">4 stars and up</option><option value="3">3 stars and up</option></select>
          <label><input type="checkbox" checked={!!f.inStock} onChange={(e) => setFilter({ inStock: e.target.checked ? "1" : "" })} /> In stock only</label>
          {filtered && <button onClick={() => { setF(EMPTY); setPage(1); }} className="underline">Clear filters</button>}
        </div>
      </section>

      {!q && !category && !filtered && page === 1 && <HomeSections />}

      <h2 className="mt-10 font-display text-2xl text-emerald">{q || category || filtered ? "Search results" : "All jewellery"}</h2>
      {isLoading && <p className="mt-6 text-ink/60">Loading jewellery…</p>}
      {error && <p className="mt-6 text-red-700">{(error as Error).message}</p>}
      {data && data.items.length === 0 && <p className="mt-6">{q ? `No products match “${q}”. Try a different word.` : "No products to show yet."}</p>}
      <ul className="mt-4 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {data?.items.map((p) => (
          <li key={p.id} className="bg-white">
            <Link to={`/products/${p.id}`}>{p.images[0] ? <img src={p.images[0].url} alt={p.name} loading="lazy" className="aspect-square w-full object-cover" /> : <div className="aspect-square w-full bg-ink/5" />}</Link>
            <div className="p-3">
              <h3 className="font-display text-xl"><Link to={`/products/${p.id}`}>{p.name}</Link></h3>
              <p className="text-sm text-ink/60">{p.material}{p.purity && ` · ${p.purity}`}</p>
              <p className="mt-1 font-medium">{rupees(p.finalPricePaise)}
                {p.discountPercent > 0 && <span className="ml-2 text-sm text-ink/50 line-through">{rupees(p.pricePaise)}</span>}</p>
              {p.stock === 0 ? <p className="mt-2 text-sm text-red-700">Out of stock</p>
                : <button onClick={() => addToCart(p)} className="mt-2 w-full rounded-sm bg-gold py-2 text-sm text-white">{flash?.id === p.id ? flash.text : "Add to cart"}</button>}
            </div>
          </li>
        ))}
      </ul>
      {data && data.total > 12 && (
        <nav className="mt-8 flex justify-center gap-4">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page}</span>
          <button disabled={page * 12 >= data.total} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      )}
    </div>
  );
}