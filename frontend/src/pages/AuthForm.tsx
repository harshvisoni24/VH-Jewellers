import { FormEvent, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Home } from "lucide-react";
import Logo from "../components/Logo";
import Ornament from "../components/Ornament";
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
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" aria-label="VH Jewellers, home" className="mx-auto mb-8 block w-fit text-gold"><Logo /></Link>
        <form onSubmit={submit} className="space-y-4 bg-panel p-8">
          <h1 className="text-center text-4xl">{mode === "register" ? "Create account" : "Store login"}</h1>
          <Ornament className="!mb-2" />
          {mode === "register" && <label className="block"><span className="eyebrow !tracking-[0.2em]">Full name</span><input name="name" required minLength={2} className="mt-2 w-full" /></label>}
          <label className="block"><span className="eyebrow !tracking-[0.2em]">Email</span><input name="email" type="email" required autoComplete="email" className="mt-2 w-full" /></label>
          <label className="block"><span className="eyebrow !tracking-[0.2em]">Password</span><input name="password" type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} className="mt-2 w-full" /></label>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <button disabled={busy} className="btn-gold mt-2 w-full disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
          {mode === "register" && <p className="text-center text-sm">Already have an account? <Link to={`/login${q}`} className="text-gold underline underline-offset-4">Log in</Link></p>}
          {mode === "login" && <p className="text-center text-xs leading-relaxed text-ink/60">This login is for the store owner. Shoppers don't need an account: add items to the cart and check out with your details.</p>}
        </form>
        <Link to="/" className="btn-outline mx-auto mt-6 flex w-fit"><Home size={16} strokeWidth={1.5} />Home</Link>
      </div>
    </main>
  );
}
