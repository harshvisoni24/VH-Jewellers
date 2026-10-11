import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { api, rupees } from "../api/client";
import BackButton from "../components/BackButton";
import Ornament from "../components/Ornament";
import SectionTitle from "../components/SectionTitle";
import { useCart } from "../context/CartContext";

interface Resp { items: { id: string; name: string; stock: number; imageUrl?: string; finalPricePaise: number }[] }

export default function Wishlist() {
  const cart = useCart();
  const ids = cart.wishlist.join(",");
  const { data, isLoading } = useQuery({ queryKey: ["wishlist-items", ids], enabled: cart.wishlist.length > 0, queryFn: () => api<Resp>(`/shop/cart-items?ids=${ids}`) });
  const items = cart.wishlist.map((id) => data?.items.find((p) => p.id === id)).filter((p): p is Resp["items"][number] => !!p);
  const moveToCart = (id: string, stock: number) => { if (cart.add(id, stock) === "added") cart.toggleWish(id); else alert("You already have the maximum available of this item in your cart."); };
  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <BackButton />
      {!cart.wishlist.length ? (
        <div className="grid min-h-[52vh] place-items-center text-center">
          <div className="max-w-md">
            <Heart size={60} strokeWidth={1} className="mx-auto text-gold" />
            <Ornament className="my-6" />
            <h1 className="text-4xl sm:text-5xl">Nothing saved yet</h1>
            <p className="mt-4 text-ink/70">Tap “Add to wishlist” on any piece you love.</p>
            <Link to="/" className="btn-outline mt-9">Browse jewellery</Link>
          </div>
        </div>
      ) : (
        <>
          <SectionTitle as="h1" title="Wishlist" className="mt-2" />
          {isLoading && <p className="mt-10 text-center">Loading…</p>}
          <ul className="mt-12 space-y-4">{items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-5 bg-panel p-4">{p.imageUrl ? <img src={p.imageUrl} alt="" className="h-20 w-20 object-cover" /> : <div className="h-20 w-20 bg-ink/5" />}
              <div className="min-w-0 flex-1"><Link to={`/products/${p.id}`} className="font-display text-2xl text-pearl transition-colors hover:text-gold">{p.name}</Link><p className="text-gold">{rupees(p.finalPricePaise)}</p></div>
              <button disabled={!p.stock} onClick={() => moveToCart(p.id, p.stock)} className="btn-gold !px-5 !py-2.5 disabled:opacity-50">{p.stock ? "Move to cart" : "Out of stock"}</button>
              <button onClick={() => cart.toggleWish(p.id)} className="eyebrow !tracking-[0.2em] !text-rose-300 underline underline-offset-4">Remove</button></li>))}</ul>
        </>
      )}
    </div>
  );
}
