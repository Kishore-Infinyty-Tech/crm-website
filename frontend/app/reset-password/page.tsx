"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { AuthLayout } from "@/components/AuthLayout";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setToken(new URLSearchParams(window.location.search).get("token") ?? ""), []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== again) return setError("The two passwords do not match");
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const input = "block w-full rounded-xl border-0 bg-white/80 py-3 pl-10 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <AuthLayout>
      {done ? (
        <div className="auth-card animate-scale-in p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-300 text-white shadow-lg"><CheckCircle2 className="h-8 w-8" /></span>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Password updated</h1>
          <p className="mt-2 text-sm text-slate-500">You can sign in with your new password now.</p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow">Go to sign in <ArrowRight className="h-4 w-4" /></Link>
        </div>
      ) : (
        <form onSubmit={submit} className="auth-card space-y-5 p-8 sm:p-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Choose a new password</h1>
            <p className="mt-1.5 text-sm text-slate-500">At least 8 characters.</p>
          </div>
          {!token && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-200">This page needs the link from your reset email. <Link href="/forgot-password" className="underline">Get a new link</Link></p>}
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">New password</span>
            <span className="relative block"><Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input suppressHydrationWarning type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" autoFocus className={input} /></span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Repeat it</span>
            <span className="relative block"><Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input suppressHydrationWarning type="password" value={again} onChange={(e) => setAgain(e.target.value)} required minLength={8} autoComplete="new-password" className={input} /></span>
          </label>
          <button type="submit" disabled={busy || !token} className="flex w-full items-center justify-center rounded-xl bg-brand-gradient py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60">
            {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : "Save new password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
