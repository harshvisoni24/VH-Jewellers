import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, rupees } from "../api/client";

interface Card { id: string; name: string; material: string; pricePaise: number; discountPercent: number; finalPricePaise: number; imageUrl?: string }
interface Home { newArrivals: Card[]; bestSellers: Card[]; offers: Card[] }

function Row({ title, items }: { title: string; items: Card[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-emerald">{title}</h2>
      <ul className="mt-3 flex gap-4 overflow-x-auto pb-2">{items.map((p) => (
        <li key={p.id} className="w-44 shrink-0 bg-white">
          <Link to={`/products/${p.id}`}><img src={p.imageUrl} alt={p.name} loading="lazy" className="aspect-square w-full object-cover" />
            <div className="p-2"><p className="truncate">{p.name}</p><p className="text-sm">{rupees(p.finalPricePaise)}{p.discountPercent > 0 && <span className="ml-1 text-xs text-gold">{p.discountPercent}% off</span>}</p></div></Link>
        </li>))}</ul>
    </section>
  );
}

export default function HomeSections() {
  const ids = (() => { try { return JSON.parse(localStorage.getItem("vh_recent") ?? "[]") as string[]; } catch { return []; } })();
  const recent = useQuery({ queryKey: ["recent", ids.join(",")], enabled: ids.length > 0, queryFn: () => api<Card[]>(`/recent?ids=${ids.join(",")}`) });
  const { data } = useQuery({ queryKey: ["home"], queryFn: () => api<Home>("/home") });
  return (
    <div>
      {data && <><Row title="New arrivals" items={data.newArrivals} /><Row title="Best sellers" items={data.bestSellers} /><Row title="Offers" items={data.offers} /></>}
      <Row title="Recently viewed" items={recent.data ?? []} />
    </div>
  );
}