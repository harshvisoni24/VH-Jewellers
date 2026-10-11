import { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, rupees } from "../api/client";

const Table = ({ title, head, children }: { title: string; head: string[]; children: React.ReactNode }) => (
  <div className="px-5 py-6"><h1 className="font-display text-4xl text-gold">{title}</h1>
    <table className="mt-6 w-full min-w-[600px] bg-panel text-left text-sm"><thead><tr className="border-b">{head.map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>);
const td = "p-3";

export { AdminInventory, AdminCustomers } from "./AdminInventoryCustomers";

export function AdminCoupons() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["coupons"], queryFn: () => api<{ id: string; code: string; discountType: string; discountValue: number; minOrderPaise: number; endsAt: string; isActive: boolean; _count: { usages: number } }[]>("/admin/coupons") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["coupons"] });
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const pct = f.discountType === "PERCENTAGE";
    await api("/admin/coupons", { method: "POST", json: { code: f.code, discountType: f.discountType, discountValue: pct ? Number(f.value) : Number(f.value) * 100,
      minOrderPaise: Number(f.min || 0) * 100, startsAt: f.startsAt, endsAt: f.endsAt, usageLimit: f.limit ? Number(f.limit) : undefined } }).then(refresh).catch((err) => alert(err.message));
  }
  const i = "border px-2 py-1";
  return (<>
    <form onSubmit={create} className="flex flex-wrap items-end gap-2 px-5 pt-6">
      <input name="code" placeholder="CODE" required className={i} /><select name="discountType" className={i}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed ₹</option></select>
      <input name="value" type="number" min={1} placeholder="Value" required className={`${i} w-24`} /><input name="min" type="number" min={0} placeholder="Min order ₹" className={`${i} w-28`} />
      <input name="startsAt" type="date" required className={i} aria-label="Start" /><input name="endsAt" type="date" required className={i} aria-label="End" /><input name="limit" type="number" placeholder="Usage limit" className={`${i} w-28`} />
      <button className="rounded-sm bg-gold px-4 py-2 text-night">Create coupon</button></form>
    <Table title="Coupons" head={["Code", "Discount", "Min order", "Ends", "Used", "Status"]}>{data?.map((c) => (
      <tr key={c.id} className="border-b"><td className={td}>{c.code}</td><td>{c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : rupees(c.discountValue)}</td><td>{rupees(c.minOrderPaise)}</td><td>{new Date(c.endsAt).toLocaleDateString("en-IN")}</td><td>{c._count.usages}</td>
        <td><button onClick={() => api(`/admin/coupons/${c.id}`, { method: "PATCH", json: { isActive: !c.isActive } }).then(refresh)} className="underline">{c.isActive ? "Active (disable)" : "Disabled (enable)"}</button></td></tr>))}</Table></>);
}

export function AdminCategories() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-categories"], queryFn: () => api<{ id: string; name: string; _count: { products: number } }[]>("/admin/categories") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-categories"] });
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget;
    await api("/admin/categories", { method: "POST", json: { name: new FormData(form).get("name") } }).then(() => { form.reset(); refresh(); }).catch((err) => alert(err.message));
  }
  return (<>
    <form onSubmit={add} className="flex gap-2 px-5 pt-6"><input name="name" placeholder="New category" required className="border px-2 py-1" /><button className="rounded-sm bg-gold px-4 py-2 text-night">Add category</button></form>
    <Table title="Categories" head={["Name", "Products", ""]}>{data?.map((c) => (
      <tr key={c.id} className="border-b"><td className={td}>{c.name}</td><td>{c._count.products}</td>
        <td><button onClick={() => confirm(`Delete ${c.name}?`) && api(`/admin/categories/${c.id}`, { method: "DELETE" }).then(refresh).catch((e) => alert(e.message))} className="text-rose-300 underline">Delete</button></td></tr>))}</Table></>);
}

export function AdminReviews() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-reviews"], queryFn: () => api<{ id: string; rating: number; title: string; comment: string; createdAt: string; user: { name: string }; product: { name: string } }[]>("/admin/reviews") });
  return (<Table title="Reviews" head={["Product", "Customer", "Rating", "Review", "Date", ""]}>{data?.map((r) => (
    <tr key={r.id} className="border-b"><td className={td}>{r.product.name}</td><td>{r.user.name}</td><td>{r.rating}/5</td><td><strong>{r.title}</strong> {r.comment}</td><td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
      <td><button onClick={() => confirm("Delete this review?") && api(`/admin/reviews/${r.id}`, { method: "DELETE" }).then(() => qc.invalidateQueries({ queryKey: ["admin-reviews"] }))} className="text-rose-300 underline">Delete</button></td></tr>))}</Table>);
}
