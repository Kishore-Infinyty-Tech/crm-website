"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/api";
import { AuthLayout } from "@/components/AuthLayout";

/** One input row: a plain icon that turns blue on focus, a roomy field, no square outline. */
const wrap = "group relative block";
const tile = "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-indigo-600";
const input =
  "block w-full rounded-2xl border-0 bg-slate-50/80 py-3.5 pl-12 text-[15px] font-medium text-slate-900 ring-1 ring-inset ring-slate-200 transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 hover:bg-white hover:ring-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:shadow-[0_0_0_6px_rgb(47_115_245/0.12)]";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [welcome, setWelcome] = useState<string | null>(null);

  useEffect(() => {
    // already signed in when the page opened: skip straight to the workspace
    if (!loading && user && !welcome && !busy) router.replace(user.role === "admin" ? "/dashboard" : "/leads");
  }, [loading, user, router, welcome, busy]);

  useEffect(() => {
    if (user && busy && !welcome) setWelcome(user.full_name.split(" ")[0]);
  }, [user, busy, welcome]);

  useEffect(() => {
    if (!welcome || !user) return;
    const t = setTimeout(() => router.replace(user.role === "admin" ? "/dashboard" : "/leads"), 1100);
    return () => clearTimeout(t);
  }, [welcome, user, router]);

  function fail(message: string) {
    setError(message);
    setShake((n) => n + 1);
    setBusy(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      fail(errorMessage(err));
    }
  }

  return (
    <AuthLayout>
      {welcome ? (
        <div className="auth-card animate-scale-in p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-300 text-white shadow-lg"><CheckCircle2 className="h-8 w-8" /></span>
          <h1 className="mt-6 text-3xl font-bold text-slate-900">Welcome, {welcome}</h1>
          <p className="mt-2 text-slate-500">Opening your workspace…</p>
          <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-full origin-left animate-[grow_1.1s_ease-out_forwards] rounded-full bg-brand-gradient" /></div>
        </div>
      ) : (
        <form key={shake} onSubmit={submit} className={`auth-card space-y-5 p-7 sm:p-9 [@media(max-height:820px)]:space-y-4 [@media(max-height:820px)]:p-6 ${shake ? "animate-[shake_0.4s_ease]" : ""}`}>
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100 [@media(max-height:820px)]:hidden"><LockKeyhole className="h-3.5 w-3.5" /> Team sign-in</span>
            <h1 className="text-[1.9rem] font-extrabold leading-tight text-slate-900">Sign in</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">Use the email and password your CRM Administrator gave you.</p>
          </div>

          {error && (
            <p role="alert" className="animate-scale-in flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Email</span>
            <span className={wrap}>
              <span className={tile}><Mail className="h-[18px] w-[18px]" /></span>
              <input suppressHydrationWarning type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus placeholder="you@infinityanalyticsconsulting.com" className={`${input} pr-4`} />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Password
              <Link href="/forgot-password" className="text-[13px] font-semibold normal-case tracking-normal text-indigo-600 transition-colors hover:text-indigo-800 hover:underline">Forgot password?</Link>
            </span>
            <span className={wrap}>
              <span className={tile}><Lock className="h-[18px] w-[18px]" /></span>
              <input
                suppressHydrationWarning
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
                autoComplete="current-password"
                required
                placeholder="Your password"
                className={`${input} pr-14`}
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </span>
            {caps && <span className="animate-fade-in mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600"><AlertCircle className="h-3.5 w-3.5" /> Caps Lock is on</span>}
          </label>

          <button type="submit" disabled={busy} className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand-gradient py-3.5 text-[15px] font-bold text-white shadow-[0_18px_40px_-12px_rgb(21_88_224/0.75)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-12px_rgb(21_88_224/0.85)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-80">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <>Sign in <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></>}
          </button>

          <p className="flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
            <LockKeyhole className="h-3.5 w-3.5 text-emerald-500" /> Encrypted sign-in. Need access? Ask a CRM Administrator.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
