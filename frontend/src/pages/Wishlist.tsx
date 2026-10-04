import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, rupees } from "../api/client";

interface Item { id: string; product: { id: string; name: string; stock: number; imageUrl?: string; finalPricePaise: number } }

export default function Wishlist() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["wishlist"], queryFn: () => api<Item[]>("/wishlist") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["wishlist"] });
  const remove = (pid: string) => api(`/wishlist/items/${pid}`, { method: "DELETE" }).then(refresh);
  const moveToCart = (pid: string) => api("/cart/items", { method: "POST", json: { productId: pid, quantity: 1 } }).then(() => remove(pid)).catch((e) => alert(e.message));
  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <Link to="/shop" className="text-sm underline">Back to shop</Link>
      <h1 className="mt-3 font-display text-3xl text-emerald">Wishlist</h1>
      {isLoading && <p className="mt-6">Loading…</p>}
      {data && !data.length && <p className="mt-6">Nothing saved yet. Tap “Add to wishlist” on any product.</p>}
      <ul className="mt-6 space-y-3">{data?.map((i) => (
        <li key={i.id} className="flex items-center gap-4 bg-white p-3"><img src={i.product.imageUrl} alt="" className="h-16 w-16 object-cover" />
          <div className="flex-1"><Link to={`/products/${i.product.id}`} className="font-display text-xl">{i.product.name}</Link><p>{rupees(i.product.finalPricePaise)}</p></div>
          <button disabled={!i.product.stock} onClick={() => moveToCart(i.product.id)} className="rounded-sm bg-gold px-3 py-2 text-sm text-white disabled:opacity-50">Move to cart</button>
          <button onClick={() => remove(i.product.id)} className="text-sm text-red-700 underline">Remove</button></li>))}</ul>
    </div>
  );
}
