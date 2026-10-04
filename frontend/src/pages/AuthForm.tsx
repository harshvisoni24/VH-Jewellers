import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { safeRedirect } from "../hooks/useRequireLogin";

/** Buyer login/register live at /login and /register. The seller (admin) door is /seller/login only. */
export default function AuthForm({ mode, seller = false }: { mode: "login" | "register"; seller?: boolean }) {
  const [params] = useSearchParams();
  const isAdmin = mode === "login" && seller;
  const redirect = safeRedirect(params.get("redirect"));
  const qs = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true); setError("");
    try {
      const u = mode === "login" ? await login(f.email, f.password, isAdmin ? "ADMIN" : "BUYER") : await register({ name: f.name, email: f.email, password: f.password, phone: f.phone });
      // Sellers always land on their dashboard; buyers go back to what they were doing (checkout, cart, product…).
      nav(u.role === "ADMIN" ? "/admin" : redirect ?? "/", { replace: true });
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const field = "mt-1 w-full rounded-sm border border-ink/20 px-3 py-2";
  const link = "block text-center text-sm text-emerald underline underline-offset-4";
  return (
    <main className={`min-h-screen grid place-items-center px-5 ${isAdmin ? "bg-emerald" : ""}`}>
      <form onSubmit={submit} className="w-full max-w-sm rounded-sm bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl text-emerald">{mode === "register" ? "Create your account" : isAdmin ? "Seller login" : "Log in"}</h1>
        {!isAdmin && redirect && <p className="mt-2 text-sm text-ink/60">Please log in to continue.</p>}
        {mode === "register" && <label className="mt-5 block text-sm">Full name<input name="name" required minLength={2} className={field} /></label>}
        <label className="mt-4 block text-sm">Email<input name="email" type="email" required className={field} /></label>
        {mode === "register" && <label className="mt-4 block text-sm">Mobile number<input name="phone" type="tel" inputMode="numeric" required pattern="(\+?91)?[\s-]?[6-9][0-9]{9}" title="10-digit mobile number" placeholder="9876543210" className={field} /></label>}
        <label className="mt-4 block text-sm">Password<input name="password" type="password" required minLength={mode === "register" ? 8 : 1} className={field} /></label>
        {mode === "login" && <Link to={isAdmin ? "/seller/forgot-password" : "/forgot-password"} className="mt-2 block text-right text-xs text-emerald underline underline-offset-4">Forgot password?</Link>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-sm bg-gold py-3 font-medium text-white disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
        <div className="mt-4 space-y-2">
          {isAdmin ? (
            <p className="text-center text-xs text-ink/50">Seller accounts are created by the store owner.</p>
          ) : mode === "login" ? (
            <Link to={`/register${qs}`} className={link}>New customer? Create an account</Link>
          ) : (
            <Link to={`/login${qs}`} className={link}>Already have an account? Log in</Link>
          )}
          <Link to="/" className={link}>Continue browsing the shop</Link>
          {!isAdmin && mode === "login" && <Link to="/seller/login" className="block text-center text-xs text-ink/50 underline">Seller? Sign in here</Link>}
        </div>
      </form>
    </main>
  );
}
