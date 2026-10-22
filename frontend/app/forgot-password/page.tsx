"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, MailCheck, Mail } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { AuthLayout } from "@/components/AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      {sent ? (
        <div className="auth-card animate-scale-in p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-cyan-glow text-white shadow-lg"><MailCheck className="h-8 w-8" /></span>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Check your inbox</h1>
          <p className="mt-2 text-sm text-slate-500">If <strong className="text-slate-700">{email}</strong> belongs to a team member, a link to choose a new password is on its way. It works once and expires in an hour.</p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="auth-card space-y-5 p-8 sm:p-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Forgot password?</h1>
            <p className="mt-1.5 text-sm text-slate-500">Enter your team email and we will send you a link to choose a new one.</p>
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input suppressHydrationWarning type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@company.com" className="block w-full rounded-xl border-0 bg-white/80 py-3 pl-10 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </span>
          </label>
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-xl bg-brand-gradient py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-70">
            {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : "Send reset link"}
          </button>
          <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
        </form>
      )}
    </AuthLayout>
  );
}
