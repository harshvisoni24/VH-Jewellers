import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api, rupees } from "../api/client";
import HomeSections from "../components/HomeSections";
import SectionTitle from "../components/SectionTitle";
import { useCart } from "../context/CartContext";

interface Product { id: string; name: string; sku: string; material: string; purity?: string; pricePaise: number; finalPricePaise: number;
  discountPercent: number; stock: number; images: { url: string }[] }
interface Page { total: number; items: Product[] }
const EMPTY = { material: "", minPrice: "", maxPrice: "", minRating: "", inStock: "" };
const sel = "border border-gold/30 bg-night/60 px-3 py-2 text-sm";

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
  const searching = !!(q || category || filtered);
  const bandRef = useRef<HTMLElement>(null);
  const goPage = (n: number) => { setPage(n); bandRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return (
    <div>
      <section aria-label="Find jewellery" className="mx-auto max-w-6xl px-5 pt-10">
        <div className="bg-panel/80 p-5 sm:p-6">
          <div className="relative">
            <Search size={20} strokeWidth={1.4} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search rings, necklaces, gold, SKU…" aria-label="Search products" list="sugg" className="w-full !py-3.5 !pl-12 text-lg" />
          </div>
          <datalist id="sugg">{sugg.data?.map((n) => <option key={n} value={n} />)}</datalist>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Category" className={sel}><option value="">All categories</option>{cats.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className={sel}>
              <option value="newest">Newest</option><option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option><option value="rating">Top rated</option>
            </select>
            <select value={f.material} onChange={(e) => setFilter({ material: e.target.value })} aria-label="Material" className={sel}><option value="">Any material</option>{["Gold", "Silver", "Platinum"].map((m) => <option key={m}>{m}</option>)}</select>
            <input type="number" min={0} placeholder="Min ₹" value={f.minPrice} onChange={(e) => setFilter({ minPrice: e.target.value })} className="w-24 !py-2 text-sm" aria-label="Minimum price" />
            <input type="number" min={0} placeholder="Max ₹" value={f.maxPrice} onChange={(e) => setFilter({ maxPrice: e.target.value })} className="w-24 !py-2 text-sm" aria-label="Maximum price" />
            <select value={f.minRating} onChange={(e) => setFilter({ minRating: e.target.value })} aria-label="Minimum rating" className={sel}><option value="">Any rating</option><option value="4">4 stars and up</option><option value="3">3 stars and up</option></select>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.inStock} onChange={(e) => setFilter({ inStock: e.target.checked ? "1" : "" })} /> In stock only</label>
            {filtered && <button onClick={() => { setF(EMPTY); setPage(1); }} className="eyebrow !tracking-[0.2em] underline underline-offset-4">Clear filters</button>}
          </div>
        </div>
      </section>

      {!searching && page === 1 && <div className="mx-auto max-w-6xl px-5"><HomeSections /></div>}

      {/* The collection sits on a light band, like pages of a catalogue. */}
      <section ref={bandRef} className="cream-band mt-24 scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle tone="cream" eyebrow={searching ? "Your search" : "The collection"} title={searching ? "Search results" : "All jewellery"} />
          {isLoading && <p className="mt-10 text-center text-night/70">Loading jewellery…</p>}
          {error && <p className="mt-10 text-center text-red-800">{(error as Error).message}</p>}
          {data && data.items.length === 0 && <p className="mt-10 text-center text-night/70">{q ? `No products match “${q}”. Try a different word.` : "No products to show yet."}</p>}
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {data?.items.map((p) => (
              <li key={p.id} className="group text-center">
                <Link to={`/products/${p.id}`} className="block overflow-hidden bg-night">
                  {p.images[0] ? <img src={p.images[0].url} alt={p.name} loading="lazy" className="aspect-square w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="aspect-square w-full bg-night" />}
                </Link>
                <h3 className="mt-4 font-display text-xl !text-night"><Link to={`/products/${p.id}`} className="transition-colors hover:!text-gold-dark">{p.name}</Link></h3>
                <p className="text-sm text-night/60">{p.material}{p.purity && ` · ${p.purity}`}</p>
                <p className="mt-1 text-lg text-gold-dark">{rupees(p.finalPricePaise)}
                  {p.discountPercent > 0 && <span className="ml-2 text-sm text-night/50 line-through">{rupees(p.pricePaise)}</span>}</p>
                {p.stock === 0 ? <p className="mt-3 text-sm text-red-800">Out of stock</p>
                  : <button onClick={() => addToCart(p)} className="btn-ink mt-3 !px-6 !py-2.5">{flash?.id === p.id ? flash.text : "Add to cart"}</button>}
              </li>
            ))}
          </ul>
          {data && data.total > 12 && (
            <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-6">
              <button disabled={page === 1} onClick={() => goPage(page - 1)} className="btn-ink !px-5 !py-2.5 disabled:opacity-40">Previous</button>
              <span className="eyebrow !text-gold-dark">Page {page}</span>
              <button disabled={page * 12 >= data.total} onClick={() => goPage(page + 1)} className="btn-ink !px-5 !py-2.5 disabled:opacity-40">Next</button>
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
