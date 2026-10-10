import { FormEvent, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Only same-site paths are allowed as the "go back to" target. */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { user, login, register } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // One login for everyone: admins land in the admin portal, buyers go back to where they were.
  if (user) return <Navigate to={user.role === "ADMIN" ? "/admin" : next ?? "/"} replace />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true); setError("");
    try {
      if (mode === "login") await login(f.email.trim(), f.password);
      else await register({ name: f.name, email: f.email.trim(), password: f.password });
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const field = "mt-1 w-full rounded-sm border border-ink/20 px-3 py-2";
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-sm bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl text-emerald">{mode === "register" ? "Create account" : "Store login"}</h1>
        {mode === "register" && <label className="mt-5 block text-sm">Full name<input name="name" required minLength={2} className={field} /></label>}
        <label className="mt-4 block text-sm">Email<input name="email" type="email" required autoComplete="email" className={field} /></label>
        <label className="mt-4 block text-sm">Password<input name="password" type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} className={field} /></label>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-sm bg-gold py-3 font-medium text-white disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
        {mode === "register" && <p className="mt-4 text-center text-sm">Already have an account? <Link to={`/login${q}`} className="text-emerald underline underline-offset-4">Log in</Link></p>}
        {mode === "login" && <p className="mt-4 text-center text-xs text-ink/60">This login is for the store owner. Shoppers don't need an account: add items to the cart and check out with your details.</p>}
        <Link to="/" className="mt-4 block text-center text-sm text-emerald underline underline-offset-4">Back to store</Link>
      </form>
    </main>
  );
}