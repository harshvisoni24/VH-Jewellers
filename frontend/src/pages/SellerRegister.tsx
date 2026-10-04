import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface Status { open: boolean; needsKey: boolean }

/** One-time seller sign-up. The server only accepts it while no seller account exists. */
export default function SellerRegister() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { api<Status>("/auth/seller-signup").then(setStatus).catch(() => setStatus({ open: false, needsKey: false })); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (f.password !== f.confirm) return setError("The two passwords do not match.");
    setBusy(true); setError("");
    try {
      await api("/auth/seller-register", { method: "POST", json: { name: f.name, email: f.email, phone: f.phone, password: f.password, setupKey: f.setupKey } });
      setDone(true);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const field = "mt-1 w-full rounded-sm border border-ink/20 px-3 py-2";
  const link = "block text-center text-sm text-emerald underline underline-offset-4";
  return (
    <main className="min-h-screen grid place-items-center bg-emerald px-5">
      <div className="w-full max-w-sm rounded-sm bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl text-emerald">Create seller account</h1>
        {!status && <p className="mt-4 text-sm text-ink/60">Loading…</p>}
        {status && !status.open && !done && <p role="status" className="mt-4 text-sm">Seller sign-up is closed because a seller account already exists. Please log in.</p>}
        {done && <p role="status" className="mt-4 text-sm">Seller account created. You can now log in.</p>}
        {status?.open && !done && (
          <form onSubmit={submit}>
            <p className="mt-2 text-sm text-ink/60">This can be done only once. Your mobile number is used to reset your password.</p>
            <label className="mt-5 block text-sm">Full name<input name="name" required minLength={2} className={field} /></label>
            <label className="mt-4 block text-sm">Email<input name="email" type="email" required className={field} /></label>
            <label className="mt-4 block text-sm">Mobile number<input name="phone" type="tel" inputMode="numeric" required pattern="(\+?91)?[\s-]?[6-9][0-9]{9}" title="10-digit mobile number" placeholder="9876543210" className={field} /></label>
            <label className="mt-4 block text-sm">Password<input name="password" type="password" required minLength={8} className={field} /></label>
            <label className="mt-4 block text-sm">Confirm password<input name="confirm" type="password" required minLength={8} className={field} /></label>
            {status.needsKey && <label className="mt-4 block text-sm">Setup key<input name="setupKey" type="password" required className={field} /></label>}
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="mt-6 w-full rounded-sm bg-gold py-3 font-medium text-white disabled:opacity-60">{busy ? "Please wait…" : "Create seller account"}</button>
          </form>
        )}
        <div className="mt-5 space-y-2"><Link to="/seller/login" className={link}>Go to seller login</Link></div>
      </div>
    </main>
  );
}
