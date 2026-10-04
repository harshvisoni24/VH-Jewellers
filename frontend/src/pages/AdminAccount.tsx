import { FormEvent, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

/** Seller changes their own login email and/or password. The current password is always required. */
export default function AdminAccount() {
  const { user } = useAuth();
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (f.newPassword && f.newPassword !== f.confirm) { setOk(false); return setMsg("The two new passwords do not match."); }
    setBusy(true); setMsg("");
    try {
      await api("/auth/change-credentials", { method: "POST", json: { currentPassword: f.currentPassword, newEmail: f.newEmail || undefined, newPassword: f.newPassword || undefined } });
      setOk(true); setMsg("Saved. Use your new login details next time you sign in."); form.reset();
    } catch (err) { setOk(false); setMsg((err as Error).message); } finally { setBusy(false); }
  }

  const c = "mt-1 w-full border px-3 py-2";
  return (
    <form onSubmit={save} className="max-w-lg space-y-4 px-5 py-6">
      <h1 className="font-display text-3xl text-emerald">Login details</h1>
      <p className="text-sm text-ink/60">Current login email: <strong>{user?.email}</strong>. Leave a field empty to keep it unchanged.</p>
      <label className="block text-sm">New email<input name="newEmail" type="email" autoComplete="email" className={c} /></label>
      <label className="block text-sm">New password (min 8 characters)<input name="newPassword" type="password" minLength={8} autoComplete="new-password" className={c} /></label>
      <label className="block text-sm">Confirm new password<input name="confirm" type="password" minLength={8} autoComplete="new-password" className={c} /></label>
      <label className="block text-sm">Current password (required)<input name="currentPassword" type="password" required autoComplete="current-password" className={c} /></label>
      {msg && <p role={ok ? "status" : "alert"} className={`text-sm ${ok ? "text-emerald" : "text-red-700"}`}>{msg}</p>}
      <button disabled={busy} className="rounded-sm bg-emerald px-5 py-2 text-white disabled:opacity-60">{busy ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
