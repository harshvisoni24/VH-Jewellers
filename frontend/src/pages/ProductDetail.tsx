import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, rupees } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useRequireLogin } from "../hooks/useRequireLogin";

interface Product { id: string; name: string; sku: string; description: string; material: string; purity?: string; weightGrams?: string; size?: string; brand?: string;
  pricePaise: number; finalPricePaise: number; discountPercent: number; stock: number; ratingAvg: string; reviewCount: number; images: { id: string; url: string }[] }
interface Reviews { reviews: { id: string; rating: number; title: string; comment: string; verifiedPurchase: boolean; createdAt: string; user: { name: string } }[]; distribution: Record<string, number> }

export default function ProductDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const [img, setImg] = useState(0);
  useEffect(() => { // remember recently viewed products in this browser
    if (!id) return;
    try { const r = JSON.parse(localStorage.getItem("vh_recent") ?? "[]") as string[]; localStorage.setItem("vh_recent", JSON.stringify([id, ...r.filter((x) => x !== id)].slice(0, 8))); } catch { /* storage unavailable */ }
  }, [id]);
  const [msg, setMsg] = useState("");
  const [rating, setRating] = useState(5);
  const product = useQuery({ queryKey: ["product", id], queryFn: () => api<Product>(`/products/${id}`) });
  const reviews = useQuery({ queryKey: ["reviews", id], queryFn: () => api<Reviews>(`/products/${id}/reviews`) });
  const qa = useQuery({ queryKey: ["qa", id], queryFn: () => api<{ id: string; question: string; answer?: string; createdAt: string; user: { name: string } }[]>(`/products/${id}/questions`) });
  async function ask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const el = e.currentTarget;
    if (!user) return requireLogin(() => {});
    await api(`/products/${id}/questions`, { method: "POST", json: { question: String(new FormData(el).get("question")) } }).then(() => { el.reset(); setMsg("Question sent. We'll answer soon."); qc.invalidateQueries({ queryKey: ["qa", id] }); }).catch((x) => setMsg(x.message));
  }
  const act = (fn: Promise<unknown>, ok: string) => fn.then(() => setMsg(ok)).catch((e) => setMsg(e.message));

  async function submitReview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return requireLogin(() => {});
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    await act(api(`/products/${id}/reviews`, { method: "POST", json: { rating, title: f.title, comment: f.comment } }).then(() => { qc.invalidateQueries({ queryKey: ["reviews", id] }); qc.invalidateQueries({ queryKey: ["product", id] }); }), "Review saved.");
  }
  if (product.isLoading) return <p className="p-10">Loading…</p>;
  if (product.error || !product.data) return <p className="p-10">We couldn't find this product. <Link to="/shop" className="underline">Back to shop</Link></p>;
  const p = product.data;
  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <Link to="/shop" className="text-sm underline">Back to shop</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div><img src={p.images[img]?.url} alt={p.name} className="aspect-square w-full object-cover" />
          <div className="mt-2 flex gap-2">{p.images.map((im, i) => <button key={im.id} onClick={() => setImg(i)} aria-label={`Image ${i + 1}`}><img src={im.url} alt="" className={`h-16 w-16 object-cover ${i === img ? "ring-2 ring-gold" : ""}`} /></button>)}</div></div>
        <div>
          <h1 className="font-display text-4xl text-emerald">{p.name}</h1>
          <p className="text-sm text-ink/60">SKU {p.sku} · {Number(p.ratingAvg).toFixed(1)} stars ({p.reviewCount} reviews)</p>
          <p className="mt-4 text-3xl">{rupees(p.finalPricePaise)}{p.discountPercent > 0 && <span className="ml-3 text-base text-ink/50 line-through">{rupees(p.pricePaise)} ({p.discountPercent}% off)</span>}</p>
          <p className={`mt-1 ${p.stock ? "text-emerald" : "text-red-700"}`}>{p.stock === 0 ? "Out of stock" : p.stock <= 3 ? `Only ${p.stock} left` : "In stock"}</p>
          <p className="mt-4">{p.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-1 text-sm"><dt>Material</dt><dd>{p.material}</dd>{p.purity && <><dt>Purity</dt><dd>{p.purity}</dd></>}{p.weightGrams && <><dt>Weight</dt><dd>{p.weightGrams} g</dd></>}{p.size && <><dt>Size</dt><dd>{p.size}</dd></>}{p.brand && <><dt>Brand</dt><dd>{p.brand}</dd></>}</dl>
          <p className="mt-4 text-sm text-ink/60">Delivery in 3–7 working days. Free delivery above ₹10,000.</p>
          <div className="mt-5 flex gap-3">
            <button disabled={!p.stock} onClick={() => requireLogin(() => act(api("/cart/items", { method: "POST", json: { productId: p.id, quantity: 1 } }), "Added to cart."))} className="rounded-sm bg-gold px-5 py-3 text-white disabled:opacity-50">Add to cart</button>
            <button onClick={() => requireLogin(() => act(api("/wishlist/items", { method: "POST", json: { productId: p.id } }), "Saved to wishlist."))} className="rounded-sm border border-gold px-5 py-3">Add to wishlist</button></div>
          {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
        </div>
      </div>
      <section className="mt-12">
        <h2 className="font-display text-2xl">Customer reviews</h2>
        {reviews.data && !reviews.data.reviews.length && <p className="mt-2 text-ink/60">No reviews yet.</p>}
        <ul className="mt-3 space-y-3">{reviews.data?.reviews.map((r) => <li key={r.id} className="bg-white p-3"><p><strong>{r.rating}/5 · {r.title}</strong></p><p>{r.comment}</p><p className="text-xs text-ink/60">{r.user.name}{r.verifiedPurchase && " · Verified purchase"} · {new Date(r.createdAt).toLocaleDateString("en-IN")}</p></li>)}</ul>
        <form onSubmit={submitReview} className="mt-6 max-w-md space-y-2 bg-white p-4">
          <h3 className="font-display text-xl">Write a review</h3>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} aria-label="Rating" className="border px-2 py-1">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select>
          <input name="title" placeholder="Title" required minLength={2} className="w-full border px-2 py-1" /><textarea name="comment" placeholder="Your review" required minLength={5} className="w-full border px-2 py-1" />
          <button className="rounded-sm bg-emerald px-4 py-2 text-white">Submit review</button></form>
      </section>
      <section className="mt-12">
        <h2 className="font-display text-2xl">Customer questions</h2>
        {qa.data && !qa.data.length && <p className="mt-2 text-ink/60">No questions yet. Ask the first one.</p>}
        <ul className="mt-3 space-y-3">{qa.data?.map((x) => <li key={x.id} className="bg-white p-3"><p><strong>Q:</strong> {x.question}</p><p className="text-sm">{x.answer ? <><strong>A:</strong> {x.answer}</> : <span className="text-ink/60">Waiting for an answer.</span>}</p></li>)}</ul>
        <form onSubmit={ask} className="mt-4 flex max-w-md gap-2"><input name="question" placeholder="Ask about this product" required minLength={5} className="flex-1 border px-2 py-1" /><button className="rounded-sm bg-emerald px-4 text-white">Ask</button></form>
      </section>
    </div>
  );
}
