import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

/** Reset a forgotten password with an OTP sent to the account's mobile number. */
export default function ForgotPassword({ seller = false }: { seller?: boolean }) {
  const [step, setStep] = useState<"phone" | "reset" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const loginPath = seller ? "/seller/login" : "/login";

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  async function sendOtp(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true); setError(""); setInfo("");
    try {
      const r = await api<{ message: string }>("/auth/forgot-password", { method: "POST", json: { phone } });
      setInfo(r.message); setStep("reset"); setWait(60);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function reset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (f.password !== f.confirm) return setError("The two passwords do not match.");
    setBusy(true); setError("");
    try {
      await api("/auth/reset-password", { method: "POST", json: { phone, otp: f.otp, password: f.password } });
      setStep("done");
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const field = "mt-1 w-full rounded-sm border border-ink/20 px-3 py-2";
  const link = "block text-center text-sm text-emerald underline underline-offset-4";
  return (
    <main className={`min-h-screen grid place-items-center px-5 ${seller ? "bg-emerald" : ""}`}>
      <div className="w-full max-w-sm rounded-sm bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl text-emerald">Reset password</h1>
        {step === "phone" && (
          <form onSubmit={sendOtp}>
            <p className="mt-2 text-sm text-ink/60">Enter the mobile number linked to your account. We will send you a 6-digit OTP.</p>
            <label className="mt-5 block text-sm">Mobile number<input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="numeric" required placeholder="9876543210" className={field} /></label>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="mt-6 w-full rounded-sm bg-gold py-3 font-medium text-white disabled:opacity-60">{busy ? "Sending…" : "Send OTP"}</button>
          </form>
        )}
        {step === "reset" && (
          <form onSubmit={reset}>
            <p className="mt-2 text-sm text-ink/60">{info} The OTP is valid for 10 minutes.</p>
            <label className="mt-5 block text-sm">OTP<input name="otp" inputMode="numeric" required pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className={field} /></label>
            <label className="mt-4 block text-sm">New password<input name="password" type="password" required minLength={8} className={field} /></label>
            <label className="mt-4 block text-sm">Confirm new password<input name="confirm" type="password" required minLength={8} className={field} /></label>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="mt-6 w-full rounded-sm bg-gold py-3 font-medium text-white disabled:opacity-60">{busy ? "Please wait…" : "Change password"}</button>
            <button type="button" disabled={wait > 0 || busy} onClick={() => sendOtp()} className="mt-3 w-full text-sm text-emerald underline underline-offset-4 disabled:no-underline disabled:opacity-50">{wait > 0 ? `Resend OTP in ${wait}s` : "Resend OTP"}</button>
          </form>
        )}
        {step === "done" && <p role="status" className="mt-4 text-sm">Your password has been changed. You can now log in with the new password.</p>}
        <div className="mt-5 space-y-2">
          <Link to={loginPath} className={link}>Back to login</Link>
        </div>
      </div>
    </main>
  );
}
