import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, rupees } from "../api/client";
import BackButton from "../components/BackButton";
import SectionTitle from "../components/SectionTitle";
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
  if (product.isLoading) return <p className="p-16 text-center">Loading…</p>;
  if (product.error || !product.data) return <div className="p-16 text-center"><p>We couldn't find this product.</p><Link to="/" className="btn-outline mt-6">Back to shop</Link></div>;
  const p = product.data;
  const field = "w-full";
  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <BackButton />
      <div className="mt-8 grid gap-12 md:grid-cols-2">
        <div>
          <div className="border border-gold/35 p-2">{p.images[img] ? <img src={p.images[img].url} alt={p.name} className="aspect-square w-full object-cover" /> : <div className="aspect-square w-full bg-ink/5" />}</div>
          {p.images.length > 1 && <div className="mt-3 flex gap-3">{p.images.map((im, i) => <button key={im.id} onClick={() => setImg(i)} aria-label={`Image ${i + 1}`} className={`border p-0.5 transition ${i === img ? "border-gold" : "border-gold/25 hover:border-gold/60"}`}><img src={im.url} alt="" className="h-16 w-16 object-cover" /></button>)}</div>}
        </div>
        <div>
          <p className="eyebrow">SKU {p.sku}</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">{p.name}</h1>
          <p className="mt-2 text-sm text-ink/60">{Number(p.ratingAvg).toFixed(1)} stars · {p.reviewCount} review{p.reviewCount === 1 ? "" : "s"}</p>
          <div className="rule my-6" />
          <p className="font-display text-4xl text-gold">{rupees(p.finalPricePaise)}{p.discountPercent > 0 && <span className="ml-3 text-lg text-ink/50 line-through">{rupees(p.pricePaise)}</span>}{p.discountPercent > 0 && <span className="eyebrow ml-3 !tracking-[0.15em]">{p.discountPercent}% off</span>}</p>
          <p className={`mt-2 text-sm uppercase tracking-[0.2em] ${p.stock ? "text-gold-light" : "text-rose-300"}`}>{p.stock === 0 ? "Out of stock" : p.stock <= 3 ? `Only ${p.stock} left` : "In stock"}</p>
          <p className="mt-6 leading-relaxed text-ink/90">{p.description}</p>
          <dl className="mt-6 grid grid-cols-[8rem_1fr] border-t text-sm [&>*]:border-b [&>*]:py-2.5">
            <dt className="eyebrow !tracking-[0.2em]">Material</dt><dd>{p.material}</dd>
            {p.purity && <><dt className="eyebrow !tracking-[0.2em]">Purity</dt><dd>{p.purity}</dd></>}
            {p.weightGrams && <><dt className="eyebrow !tracking-[0.2em]">Weight</dt><dd>{p.weightGrams} g</dd></>}
            {p.size && <><dt className="eyebrow !tracking-[0.2em]">Size</dt><dd>{p.size}</dd></>}
            {p.brand && <><dt className="eyebrow !tracking-[0.2em]">Brand</dt><dd>{p.brand}</dd></>}
          </dl>
          <p className="mt-5 text-sm text-ink/60">Delivery in 3–7 working days. Free delivery above ₹10,000. Pay cash on delivery.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button disabled={!p.stock} onClick={() => setCartMsg(cart.add(p.id, p.stock))} className="btn-gold disabled:opacity-50">Add to cart</button>
            <button onClick={() => cart.toggleWish(p.id)} aria-pressed={cart.inWish(p.id)} className="btn-outline">{cart.inWish(p.id) ? "Saved to wishlist ✓" : "Add to wishlist"}</button></div>
          {cartMsg && <p role="status" className="mt-4 text-sm">{cartMsg === "added" ? "Added to your cart." : "You already have the most available of this item in your cart."} <Link to="/cart" className="text-gold underline underline-offset-4">View cart</Link></p>}
        </div>
      </div>

      <section className="mt-24">
        <SectionTitle eyebrow="Reviews" title="Customer reviews" />
        {reviews.data && !reviews.data.reviews.length && <p className="mt-8 text-center text-ink/60">No reviews yet.</p>}
        <ul className="mt-8 space-y-4">{reviews.data?.reviews.map((r) => <li key={r.id} className="bg-panel p-5"><p className="font-display text-xl text-pearl">{r.title} <span className="ml-2 text-base text-gold">{"★".repeat(r.rating)}<span className="text-ink/25">{"★".repeat(5 - r.rating)}</span></span></p><p className="mt-1">{r.comment}</p><p className="mt-2 text-xs text-ink/60">{r.user.name}{r.verifiedPurchase && " · Verified purchase"} · {new Date(r.createdAt).toLocaleDateString("en-IN")}</p></li>)}</ul>
        <form onSubmit={submitReview} className="mx-auto mt-10 max-w-md space-y-3 bg-panel p-6">
          <h3 className="text-2xl">Bought this? Write a review</h3>
          <p className="text-sm text-ink/60">Enter the order number and email from your order so we can confirm your purchase.</p>
          <input name="orderNumber" placeholder="Order number (e.g. VH-1A2B3C)" required minLength={3} className={field} />
          <input name="email" type="email" placeholder="Email used at checkout" required className={field} />
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} aria-label="Rating" className="w-full">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select>
          <input name="title" placeholder="Title" required minLength={2} className={field} /><textarea name="comment" placeholder="Your review" required minLength={5} rows={3} className={field} />
          <button className="btn-gold w-full">Submit review</button>
          {reviewMsg && <p role="status" className="text-sm">{reviewMsg}</p>}</form>
      </section>

      <section className="mt-24">
        <SectionTitle eyebrow="Questions" title="Ask about this piece" />
        {qa.data && !qa.data.length && <p className="mt-8 text-center text-ink/60">No questions yet. Ask the first one.</p>}
        <ul className="mt-8 space-y-4">{qa.data?.map((x) => <li key={x.id} className="bg-panel p-5"><p><span className="eyebrow mr-2">Q</span>{x.question}</p><p className="mt-1 text-sm">{x.answer ? <><span className="eyebrow mr-2">A</span>{x.answer}</> : <span className="text-ink/60">Waiting for an answer.</span>}</p></li>)}</ul>
        <form onSubmit={ask} className="mx-auto mt-8 flex max-w-md gap-3"><input name="question" placeholder="Ask about this product" required minLength={5} className="min-w-0 flex-1" /><button className="btn-outline !px-5">Ask</button></form>
        {qaMsg && <p role="status" className="mt-3 text-center text-sm">{qaMsg}</p>}
      </section>
    </div>
  );
}
