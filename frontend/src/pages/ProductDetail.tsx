import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, rupees } from "../api/client";
import { useCart } from "../context/CartContext";

interface Product { id: string; name: string; sku: string; description: string; material: string; purity?: string; weightGrams?: string; size?: string; brand?: string;
  pricePaise: number; finalPricePaise: number; discountPercent: number; stock: number; ratingAvg: string; reviewCount: number; images: { id: string; url: string }[] }
interface Reviews { reviews: { id: string; rating: number; title: string; comment: string; verifiedPurchase: boolean; createdAt: string; user: { name: string } }[]; distribution: Record<string, number> }

export default function ProductDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const cart = useCart();
  const [img, setImg] = useState(0);
  useEffect(() => { // remember recently viewed products in this browser
    if (!id) return;
    try { const r = JSON.parse(localStorage.getItem("vh_recent") ?? "[]") as string[]; localStorage.setItem("vh_recent", JSON.stringify([id, ...r.filter((x) => x !== id)].slice(0, 8))); } catch { /* storage unavailable */ }
  }, [id]);
  const [cartMsg, setCartMsg] = useState<"" | "added" | "limit">("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [qaMsg, setQaMsg] = useState("");
  const [rating, setRating] = useState(5);
  const product = useQuery({ queryKey: ["product", id], queryFn: () => api<Product>(`/products/${id}`) });
  const reviews = useQuery({ queryKey: ["reviews", id], queryFn: () => api<Reviews>(`/products/${id}/reviews`) });
  const qa = useQuery({ queryKey: ["qa", id], queryFn: () => api<{ id: string; question: string; answer?: string; createdAt: string; user: { name: string } }[]>(`/products/${id}/questions`) });

  async function ask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const el = e.currentTarget; const question = String(new FormData(el).get("question"));
    await api(`/shop/products/${id}/questions`, { method: "POST", json: { question } })
      .then(() => { el.reset(); setQaMsg("Question sent. We'll answer soon."); qc.invalidateQueries({ queryKey: ["qa", id] }); }).catch((x) => setQaMsg(x.message));
  }
  async function submitReview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const el = e.currentTarget;
    const f = Object.fromEntries(new FormData(el)) as Record<string, string>;
    await api(`/shop/products/${id}/reviews`, { method: "POST", json: { orderNumber: f.orderNumber, email: f.email, rating, title: f.title, comment: f.comment } })
      .then(() => { el.reset(); setReviewMsg("Thank you! Your review is saved."); qc.invalidateQueries({ queryKey: ["reviews", id] }); qc.invalidateQueries({ queryKey: ["product", id] }); }).catch((x) => setReviewMsg(x.message));
  }
  if (product.isLoading) return <p className="p-10">Loading…</p>;
  if (product.error || !product.data) return <p className="p-10">We couldn't find this product. <Link to="/" className="underline">Back to shop</Link></p>;
  const p = product.data;
  const field = "w-full border px-2 py-1";
  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <Link to="/" className="text-sm underline">Back to shop</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div>{p.images[img] ? <img src={p.images[img].url} alt={p.name} className="aspect-square w-full object-cover" /> : <div className="aspect-square w-full bg-ink/5" />}
          <div className="mt-2 flex gap-2">{p.images.map((im, i) => <button key={im.id} onClick={() => setImg(i)} aria-label={`Image ${i + 1}`}><img src={im.url} alt="" className={`h-16 w-16 object-cover ${i === img ? "ring-2 ring-gold" : ""}`} /></button>)}</div></div>
        <div>
          <h1 className="font-display text-4xl text-emerald">{p.name}</h1>
          <p className="text-sm text-ink/60">SKU {p.sku} · {Number(p.ratingAvg).toFixed(1)} stars ({p.reviewCount} reviews)</p>
          <p className="mt-4 text-3xl">{rupees(p.finalPricePaise)}{p.discountPercent > 0 && <span className="ml-3 text-base text-ink/50 line-through">{rupees(p.pricePaise)} ({p.discountPercent}% off)</span>}</p>
          <p className={`mt-1 ${p.stock ? "text-emerald" : "text-red-700"}`}>{p.stock === 0 ? "Out of stock" : p.stock <= 3 ? `Only ${p.stock} left` : "In stock"}</p>
          <p className="mt-4">{p.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-1 text-sm"><dt>Material</dt><dd>{p.material}</dd>{p.purity && <><dt>Purity</dt><dd>{p.purity}</dd></>}{p.weightGrams && <><dt>Weight</dt><dd>{p.weightGrams} g</dd></>}{p.size && <><dt>Size</dt><dd>{p.size}</dd></>}{p.brand && <><dt>Brand</dt><dd>{p.brand}</dd></>}</dl>
          <p className="mt-4 text-sm text-ink/60">Delivery in 3–7 working days. Free delivery above ₹10,000. Pay cash on delivery.</p>
          <div className="mt-5 flex gap-3">
            <button disabled={!p.stock} onClick={() => setCartMsg(cart.add(p.id, p.stock))} className="rounded-sm bg-gold px-5 py-3 text-white disabled:opacity-50">Add to cart</button>
            <button onClick={() => cart.toggleWish(p.id)} aria-pressed={cart.inWish(p.id)} className="rounded-sm border border-gold px-5 py-3">{cart.inWish(p.id) ? "Saved to wishlist ✓" : "Add to wishlist"}</button></div>
          {cartMsg && <p role="status" className="mt-3 text-sm">{cartMsg === "added" ? "Added to your cart." : "You already have the most available of this item in your cart."} <Link to="/cart" className="underline">View cart</Link></p>}
        </div>
      </div>
      <section className="mt-12">
        <h2 className="font-display text-2xl">Customer reviews</h2>
        {reviews.data && !reviews.data.reviews.length && <p className="mt-2 text-ink/60">No reviews yet.</p>}
        <ul className="mt-3 space-y-3">{reviews.data?.reviews.map((r) => <li key={r.id} className="bg-white p-3"><p><strong>{r.rating}/5 · {r.title}</strong></p><p>{r.comment}</p><p className="text-xs text-ink/60">{r.user.name}{r.verifiedPurchase && " · Verified purchase"} · {new Date(r.createdAt).toLocaleDateString("en-IN")}</p></li>)}</ul>
        <form onSubmit={submitReview} className="mt-6 max-w-md space-y-2 bg-white p-4">
          <h3 className="font-display text-xl">Bought this? Write a review</h3>
          <p className="text-sm text-ink/60">Enter the order number and email from your order so we can confirm your purchase.</p>
          <input name="orderNumber" placeholder="Order number (e.g. VH-1A2B3C)" required minLength={3} className={field} />
          <input name="email" type="email" placeholder="Email used at checkout" required className={field} />
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} aria-label="Rating" className="border px-2 py-1">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select>
          <input name="title" placeholder="Title" required minLength={2} className={field} /><textarea name="comment" placeholder="Your review" required minLength={5} className={field} />
          <button className="rounded-sm bg-emerald px-4 py-2 text-white">Submit review</button>
          {reviewMsg && <p role="status" className="text-sm">{reviewMsg}</p>}</form>
      </section>
      <section className="mt-12">
        <h2 className="font-display text-2xl">Customer questions</h2>
        {qa.data && !qa.data.length && <p className="mt-2 text-ink/60">No questions yet. Ask the first one.</p>}
        <ul className="mt-3 space-y-3">{qa.data?.map((x) => <li key={x.id} className="bg-white p-3"><p><strong>Q:</strong> {x.question}</p><p className="text-sm">{x.answer ? <><strong>A:</strong> {x.answer}</> : <span className="text-ink/60">Waiting for an answer.</span>}</p></li>)}</ul>
        <form onSubmit={ask} className="mt-4 flex max-w-md gap-2"><input name="question" placeholder="Ask about this product" required minLength={5} className="flex-1 border px-2 py-1" /><button className="rounded-sm bg-emerald px-4 text-white">Ask</button></form>
        {qaMsg && <p role="status" className="mt-2 text-sm">{qaMsg}</p>}
      </section>
    </div>
  );
}