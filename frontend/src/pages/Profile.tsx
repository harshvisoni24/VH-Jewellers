import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

interface Account { name: string; email: string; phone?: string; addresses: { id: string; fullName: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string }[] }

export default function Profile() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const { data } = useQuery({ queryKey: ["account"], queryFn: () => api<Account>("/account") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["account"] });
  const form = (e: FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
  const saveProfile = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = form(e); api("/account", { method: "PATCH", json: { name: f.name, phone: f.phone || undefined } }).then(() => { setMsg("Profile saved."); refresh(); }).catch((x) => setMsg(x.message)); };
  const addAddress = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const el = e.currentTarget; api("/account/addresses", { method: "POST", json: form(e) }).then(() => { el.reset(); refresh(); }).catch((x) => setMsg(x.message)); };
  const edit = (id: string, a: Account["addresses"][number]) => { const line1 = prompt("Address line 1", a.line1); if (line1) api(`/account/addresses/${id}`, { method: "PATCH", json: { line1 } }).then(refresh).catch((x) => setMsg(x.message)); };
  const c = "w-full border px-2 py-1";
  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <Link to="/shop" className="text-sm underline">Back to shop</Link>
      <h1 className="mt-3 font-display text-3xl text-emerald">Profile</h1>
      {data && <form key={data.name + data.phone} onSubmit={saveProfile} className="mt-4 max-w-sm space-y-2 bg-white p-4">
        <input name="name" defaultValue={data.name} required minLength={2} className={c} aria-label="Name" /><input value={data.email} disabled className={`${c} bg-pearl`} aria-label="Email" />
        <input name="phone" defaultValue={data.phone ?? ""} placeholder="Phone" className={c} aria-label="Phone" /><button className="rounded-sm bg-emerald px-4 py-2 text-white">Save profile</button></form>}
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
      <h2 className="mt-8 font-display text-2xl">Saved addresses</h2>
      {data && !data.addresses.length && <p className="mt-2 text-ink/60">No saved addresses yet.</p>}
      <ul className="mt-3 space-y-2">{data?.addresses.map((a) => (
        <li key={a.id} className="bg-white p-3 text-sm"><p>{a.fullName}, {a.phone}</p><p>{a.line1}{a.line2 && `, ${a.line2}`}, {a.city}, {a.state} {a.pincode}</p>
          <button onClick={() => edit(a.id, a)} className="mr-3 underline">Edit</button>
          <button onClick={() => api(`/account/addresses/${a.id}`, { method: "DELETE" }).then(refresh).catch((x) => setMsg(x.message))} className="text-red-700 underline">Delete</button></li>))}</ul>
      <form onSubmit={addAddress} className="mt-4 grid max-w-md gap-2 bg-white p-4">
        <h3 className="font-display text-xl">Add an address</h3>
        <input name="fullName" placeholder="Full name" required className={c} /><input name="phone" placeholder="Phone" required minLength={10} className={c} /><input name="line1" placeholder="Address line 1" required className={c} />
        <input name="line2" placeholder="Address line 2" className={c} /><input name="city" placeholder="City" required className={c} /><input name="state" placeholder="State" required className={c} /><input name="pincode" placeholder="Pincode" required pattern="\d{6}" className={c} />
        <button className="rounded-sm bg-gold px-4 py-2 text-white">Save address</button></form>
    </div>
  );
}
