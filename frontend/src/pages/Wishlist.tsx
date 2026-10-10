import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, rupees } from "../api/client";
import { useCart } from "../context/CartContext";

interface Resp { items: { id: string; name: string; stock: number; imageUrl?: string; finalPricePaise: number }[] }

export default function Wishlist() {
  const cart = useCart();
  const ids = cart.wishlist.join(",");
  const { data, isLoading } = useQuery({ queryKey: ["wishlist-items", ids], enabled: cart.wishlist.length > 0, queryFn: () => api<Resp>(`/shop/cart-items?ids=${ids}`) });
  const items = cart.wishlist.map((id) => data?.items.find((p) => p.id === id)).filter((p): p is Resp["items"][number] => !!p);
  const moveToCart = (id: string, stock: number) => { if (cart.add(id, stock) === "added") cart.toggleWish(id); else alert("You already have the maximum available of this item in your cart."); };
  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <h1 className="font-display text-3xl text-emerald">Wishlist</h1>
      {isLoading && <p className="mt-6">Loading…</p>}
      {!cart.wishlist.length && <p className="mt-6">Nothing saved yet. Tap “Add to wishlist” on any product. <Link to="/" className="underline">Browse jewellery</Link></p>}
      <ul className="mt-6 space-y-3">{items.map((p) => (
        <li key={p.id} className="flex items-center gap-4 bg-white p-3">{p.imageUrl ? <img src={p.imageUrl} alt="" className="h-16 w-16 object-cover" /> : <div className="h-16 w-16 bg-ink/5" />}
          <div className="flex-1"><Link to={`/products/${p.id}`} className="font-display text-xl">{p.name}</Link><p>{rupees(p.finalPricePaise)}</p></div>
          <button disabled={!p.stock} onClick={() => moveToCart(p.id, p.stock)} className="rounded-sm bg-gold px-3 py-2 text-sm text-white disabled:opacity-50">{p.stock ? "Move to cart" : "Out of stock"}</button>
          <button onClick={() => cart.toggleWish(p.id)} className="text-sm text-red-700 underline">Remove</button></li>))}</ul>
    </div>
  );
}