import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, rupees } from "../api/client";
import HomeSections from "../components/HomeSections";
import { useAuth } from "../context/AuthContext";

interface Product { id: string; name: string; sku: string; material: string; purity?: string; pricePaise: number; finalPricePaise: number;
  discountPercent: number; stock: number; images: { url: string }[] }
interface Page { total: number; items: Product[] }

export default function Shop() {
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [f, setF] = useState({ material: "", minPrice: "", maxPrice: "", minRating: "", inStock: "" });
  const filtered = Object.values(f).some(Boolean);
  const sugg = useQuery({ queryKey: ["sugg", q], enabled: q.length >= 2, queryFn: () => api<string[]>(`/products/suggest?q=${encodeURIComponent(q)}`) });
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => api<{ id: string; name: string; slug: string }[]>("/categories") });
  const { data, isLoading, error } = useQuery({ queryKey: ["products", q, sort, page, category, f],
    queryFn: () => api<Page>(`/products?${new URLSearchParams({ q, sort, page: String(page), ...(category && { category }), ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) })}`) });

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-3xl text-emerald">VH Jewellers</h1>
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search rings, gold, SKU…" aria-label="Search products" list="sugg"
          className="min-w-0 flex-1 rounded-sm border border-ink/20 px-3 py-2" />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Category" className="rounded-sm border border-ink/20 px-2 py-2"><option value="">All categories</option>{cats.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="rounded-sm border border-ink/20 px-2 py-2">
          <option value="newest">Newest</option><option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option><option value="rating">Top rated</option>
        </select>
        <Link to="/profile" className="text-sm underline">Profile</Link><Link to="/notifications" className="text-sm underline">Notifications</Link><Link to="/wishlist" className="text-sm underline">Wishlist</Link><Link to="/cart" className="text-sm underline">Cart</Link><Link to="/orders" className="text-sm underline">My orders</Link><span className="text-sm text-ink/60">{user?.name}</span>
        <button onClick={logout} className="text-sm underline">Log out</button>
      </header>
      <datalist id="sugg">{sugg.data?.map((n) => <option key={n} value={n} />)}</datalist>
      {!q && !category && !filtered && page === 1 && <HomeSections />}
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <select value={f.material} onChange={(e) => { setF({ ...f, material: e.target.value }); setPage(1); }} aria-label="Material" className="border px-2 py-1"><option value="">Any material</option>{["Gold", "Silver", "Platinum"].map((m) => <option key={m}>{m}</option>)}</select>
        <input type="number" min={0} placeholder="Min ₹" value={f.minPrice} onChange={(e) => { setF({ ...f, minPrice: e.target.value }); setPage(1); }} className="w-24 border px-2 py-1" aria-label="Minimum price" />
        <input type="number" min={0} placeholder="Max ₹" value={f.maxPrice} onChange={(e) => { setF({ ...f, maxPrice: e.target.value }); setPage(1); }} className="w-24 border px-2 py-1" aria-label="Maximum price" />
        <select value={f.minRating} onChange={(e) => { setF({ ...f, minRating: e.target.value }); setPage(1); }} aria-label="Minimum rating" className="border px-2 py-1"><option value="">Any rating</option><option value="4">4 stars and up</option><option value="3">3 stars and up</option></select>
        <label><input type="checkbox" checked={!!f.inStock} onChange={(e) => { setF({ ...f, inStock: e.target.checked ? "1" : "" }); setPage(1); }} /> In stock only</label>
        {filtered && <button onClick={() => setF({ material: "", minPrice: "", maxPrice: "", minRating: "", inStock: "" })} className="underline">Clear filters</button>}
      </div>

      {isLoading && <p className="mt-10 text-ink/60">Loading jewellery…</p>}
      {error && <p className="mt-10 text-red-700">{(error as Error).message}</p>}
      {data && data.items.length === 0 && <p className="mt-10">No products match “{q}”. Try a different word.</p>}
      <ul className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {data?.items.map((p) => (
          <li key={p.id} className="bg-white">
            <img src={p.images[0]?.url} alt={p.name} loading="lazy" className="aspect-square w-full object-cover" />
            <div className="p-3">
              <h2 className="font-display text-xl"><Link to={`/products/${p.id}`}>{p.name}</Link></h2>
              <p className="text-sm text-ink/60">{p.material}{p.purity && ` · ${p.purity}`}</p>
              <p className="mt-1 font-medium">{rupees(p.finalPricePaise)}
                {p.discountPercent > 0 && <span className="ml-2 text-sm text-ink/50 line-through">{rupees(p.pricePaise)}</span>}</p>
              {p.stock === 0 ? <p className="text-sm text-red-700">Out of stock</p> : <button onClick={() => api("/cart/items", { method: "POST", json: { productId: p.id, quantity: 1 } }).then(() => alert("Added to cart")).catch((e) => alert(e.message))} className="mt-2 w-full rounded-sm bg-gold py-2 text-sm text-white">Add to cart</button>}
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
