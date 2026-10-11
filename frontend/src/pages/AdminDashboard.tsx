import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, rupees } from "../api/client";

interface Sales { unit: "hour" | "day" | "month"; averageOrderPaise: number; totals: { revenuePaise: number; orders: number; unitsSold: number };
  series: { date: string; revenuePaise: number; orders: number; unitsSold: number }[] }
const RANGES = [["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["3m", "3 months"], ["6m", "6 months"], ["1y", "1 year"], ["custom", "Custom"]] as const;
const METRICS = { revenue: "Revenue", orders: "Orders", units: "Products sold" } as const;

export default function AdminDashboard() {
  const [range, setRange] = useState<string>("30d");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [metric, setMetric] = useState<keyof typeof METRICS>("revenue");
  const custom = range === "custom";
  const { data, isLoading, error } = useQuery({ queryKey: ["sales", range, from, to], enabled: !custom || (!!from && !!to),
    queryFn: () => api<Sales>(`/admin/analytics/sales?${new URLSearchParams({ range, ...(custom && { from, to }) })}`) });

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", data?.unit === "month" ? { month: "short", year: "2-digit" } : data?.unit === "hour" ? { hour: "numeric" } : { day: "numeric", month: "short" });
  const chart = data?.series.map((s) => ({ label: fmt(s.date), revenue: s.revenuePaise / 100, orders: s.orders, units: s.unitsSold }));
  const stat = "bg-panel p-5";
  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header><h1 className="font-display text-4xl text-gold">Admin dashboard</h1></header>
      <Summary />
      <h2 className="mt-8 font-display text-2xl">Sales</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {RANGES.map(([v, l]) => <button key={v} onClick={() => setRange(v)} className={`rounded-sm px-3 py-1.5 text-sm ${range === v ? "border border-gold/60 bg-night/40 text-gold" : "bg-panel"}`}>{l}</button>)}
        {custom && <><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" /></>}
      </div>
      {isLoading && <p className="mt-8 text-ink/60">Loading sales…</p>}
      {error && <p className="mt-8 text-rose-300">{(error as Error).message}</p>}
      {data && <>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className={stat}><p className="eyebrow !tracking-[0.2em]">Total revenue</p><p className="mt-2 font-display text-4xl text-gold">{rupees(data.totals.revenuePaise)}</p></div>
          <div className={stat}><p className="eyebrow !tracking-[0.2em]">Total orders</p><p className="mt-2 font-display text-4xl text-gold">{data.totals.orders}</p></div>
          <div className={stat}><p className="eyebrow !tracking-[0.2em]">Average order value</p><p className="mt-2 font-display text-4xl text-gold">{rupees(data.averageOrderPaise)}</p></div>
          <div className={stat}><p className="eyebrow !tracking-[0.2em]">Products sold</p><p className="mt-2 font-display text-4xl text-gold">{data.totals.unitsSold}</p></div>
        </div>
        <section className="mt-6 bg-panel p-5">
          <div className="flex gap-2">{(Object.keys(METRICS) as (keyof typeof METRICS)[]).map((m) =>
            <button key={m} onClick={() => setMetric(m)} className={`rounded-sm px-3 py-1 text-sm ${metric === m ? "bg-gold text-night" : "bg-night"}`}>{METRICS[m]}</button>)}</div>
          {chart?.length ? (
            <div className="mt-4 h-80"><ResponsiveContainer><LineChart data={chart}><CartesianGrid stroke="rgba(212,175,55,0.15)" /><XAxis dataKey="label" stroke="#EADFB8" tick={{ fill: "#EADFB8", fontSize: 12 }} /><YAxis stroke="#EADFB8" tick={{ fill: "#EADFB8", fontSize: 12 }} />
              <Tooltip formatter={(v: number) => (metric === "revenue" ? rupees(v * 100) : v)} contentStyle={{ background: "#0F3328", border: "1px solid rgba(212,175,55,0.5)", color: "#F3E7C3" }} labelStyle={{ color: "#D4AF37" }} itemStyle={{ color: "#F3E7C3" }} />
              <Line type="monotone" dataKey={metric} stroke="#D4AF37" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>
          ) : <p className="mt-8 text-ink/60">No sales in this period. Pick a longer range.</p>}
        </section>
      </>}
    </div>
  );
}

interface Sum { totalSalesPaise: number; orders: number; customers: number; products: number; pending: number; lowStock: { id: string; name: string; stock: number }[];
  recentOrders: { id: string; orderNumber: string; customer: string; totalPaise: number; status: string }[]; thisMonthPaise: number; lastMonthPaise: number; growthPercent: number | null }

function Summary() {
  const { data } = useQuery({ queryKey: ["summary"], queryFn: () => api<Sum>("/admin/summary") });
  if (!data) return null;
  const cards: [string, string | number][] = [["Total sales", rupees(data.totalSalesPaise)], ["Total orders", data.orders], ["Customers", data.customers], ["Products", data.products], ["Pending orders", data.pending], ["Low stock", data.lowStock.length]];
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">{cards.map(([l, v]) => <div key={l} className="bg-panel p-4"><p className="eyebrow !tracking-[0.2em]">{l}</p><p className="mt-2 font-display text-3xl text-gold">{v}</p></div>)}</div>
      <p className="mt-4 text-sm">This month {rupees(data.thisMonthPaise)} · last month {rupees(data.lastMonthPaise)}{data.growthPercent !== null && ` · ${data.growthPercent > 0 ? "+" : ""}${data.growthPercent}%`}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="bg-panel p-4"><h2 className="font-display text-xl">Recent orders</h2><ul className="mt-2 text-sm">{data.recentOrders.map((o) => <li key={o.id} className="flex justify-between py-1"><span>{o.orderNumber} · {o.customer}</span><span>{rupees(o.totalPaise)} · {o.status.replace(/_/g, " ")}</span></li>)}</ul></section>
        <section className="bg-panel p-4"><h2 className="font-display text-xl">Low stock</h2>{!data.lowStock.length && <p className="mt-2 text-sm">Every product is well stocked.</p>}<ul className="mt-2 text-sm">{data.lowStock.map((p) => <li key={p.id} className="flex justify-between py-1"><span>{p.name}</span><span>{p.stock} left</span></li>)}</ul></section>
      </div>
    </>
  );
}
