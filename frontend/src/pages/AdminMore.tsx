import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export function AdminQuestions() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-questions"], queryFn: () => api<{ id: string; question: string; answer?: string; user: { name: string }; product: { name: string } }[]>("/admin/questions") });
  const answer = (id: string) => { const a = prompt("Your answer"); if (a) api(`/admin/questions/${id}`, { method: "PATCH", json: { answer: a } }).then(() => qc.invalidateQueries({ queryKey: ["admin-questions"] })).catch((e) => alert(e.message)); };
  const sorted = [...(data ?? [])].sort((a, b) => Number(!!a.answer) - Number(!!b.answer));
  return (
    <div className="px-5 py-6"><h1 className="font-display text-4xl text-gold">Customer questions</h1>
      {data && !data.length && <p className="mt-6">No questions yet.</p>}
      <ul className="mt-6 space-y-3">{sorted.map((q) => (
        <li key={q.id} className="bg-panel p-3 text-sm"><p className="text-ink/60">{q.product.name} · {q.user.name}</p><p><strong>Q:</strong> {q.question}</p>
          <p>{q.answer ? <><strong>A:</strong> {q.answer}</> : <span className="text-rose-300">Unanswered</span>} <button onClick={() => answer(q.id)} className="ml-2 underline">{q.answer ? "Edit answer" : "Answer"}</button></p></li>))}</ul></div>
  );
}

export function AdminSettings() {
  const [msg, setMsg] = useState("");
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => api<Record<string, string | number>>("/admin/settings") });
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    await api("/admin/settings", { method: "PUT", json: { storeName: f.storeName, supportEmail: f.supportEmail, gstin: f.gstin, storeAddress: f.storeAddress, freeDeliveryAbove: Number(f.freeDeliveryAbove), deliveryFee: Number(f.deliveryFee) } })
      .then(() => setMsg("Settings saved.")).catch((x) => setMsg(x.message));
  }
  if (!data) return <p className="p-6">Loading…</p>;
  const c = "w-full border px-3 py-2";
  return (
    <form onSubmit={save} className="max-w-lg space-y-3 px-5 py-6"><h1 className="font-display text-4xl text-gold">Store settings</h1>
      <label className="block text-sm">Store name<input name="storeName" defaultValue={data.storeName} required className={c} /></label>
      <label className="block text-sm">Support email<input name="supportEmail" type="email" defaultValue={data.supportEmail} className={c} /></label>
      <label className="block text-sm">GSTIN (shown on invoices)<input name="gstin" defaultValue={data.gstin} className={c} /></label>
      <label className="block text-sm">Store address (shown on invoices)<textarea name="storeAddress" defaultValue={data.storeAddress} className={c} /></label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-sm">Free delivery above (₹)<input name="freeDeliveryAbove" type="number" min={0} defaultValue={data.freeDeliveryAbove} className={c} /></label>
        <label className="text-sm">Delivery fee (₹)<input name="deliveryFee" type="number" min={0} defaultValue={data.deliveryFee} className={c} /></label></div>
      {msg && <p role="status">{msg}</p>}<button className="rounded-sm bg-gold px-5 py-3 text-night">Save settings</button></form>
  );
}
