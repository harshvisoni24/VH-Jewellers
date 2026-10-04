import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [params] = useSearchParams();
  const isAdmin = mode === "login" && params.get("role") === "admin";
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true); setError("");
    try {
      const u = mode === "login" ? await login(f.email, f.password, isAdmin ? "ADMIN" : "BUYER") : await register({ name: f.name, email: f.email, password: f.password });
      nav(u.role === "ADMIN" ? "/admin" : "/shop");
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const field = "mt-1 w-full rounded-sm border border-ink/20 px-3 py-2";
  return (
    <main className={`min-h-screen grid place-items-center px-5 ${isAdmin ? "bg-emerald" : ""}`}>
      <form onSubmit={submit} className="w-full max-w-sm rounded-sm bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl text-emerald">{mode === "register" ? "Create buyer account" : isAdmin ? "Admin login" : "Buyer login"}</h1>
        {mode === "register" && <label className="mt-5 block text-sm">Full name<input name="name" required minLength={2} className={field} /></label>}
        <label className="mt-4 block text-sm">Email<input name="email" type="email" required className={field} /></label>
        <label className="mt-4 block text-sm">Password<input name="password" type="password" required minLength={mode === "register" ? 8 : 1} className={field} /></label>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-sm bg-gold py-3 font-medium text-white disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
        <Link to="/" className="mt-4 block text-center text-sm text-emerald underline underline-offset-4">Back to account type</Link>
      </form>
    </main>
  );
}
