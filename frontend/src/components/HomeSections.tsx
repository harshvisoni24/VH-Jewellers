import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, rupees } from "../api/client";
import SectionTitle from "./SectionTitle";

interface Card { id: string; name: string; imageUrl?: string; finalPricePaise: number; discountPercent: number }
interface Home { newArrivals: Card[]; bestSellers: Card[]; offers: Card[] }

function Row({ title, items }: { title: string; items: Card[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-20">
      <SectionTitle title={title} />
      <div className="mt-10 overflow-x-auto pb-4">
        <ul className="flex w-max min-w-full justify-center gap-7">{items.map((p) => (
          <li key={p.id} className="group w-48 shrink-0 text-center">
            <Link to={`/products/${p.id}`} className="block">
              {/* arched frame: a fine gold line around a picture with a rounded top */}
              <div className="rounded-t-full border border-gold/40 p-1.5 transition duration-300 group-hover:border-gold">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} loading="lazy" className="aspect-[3/4] w-full rounded-t-full object-cover" /> : <div className="aspect-[3/4] w-full rounded-t-full bg-ink/5" />}
              </div>
              <p className="mt-4 truncate font-display text-xl text-pearl transition-colors group-hover:text-gold">{p.name}</p>
              <p className="mt-0.5 text-gold">{rupees(p.finalPricePaise)}{p.discountPercent > 0 && <span className="eyebrow ml-2 !tracking-[0.12em]">{p.discountPercent}% off</span>}</p>
            </Link>
          </li>))}</ul>
      </div>
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
