"use client";

import { BrandPattern } from "@/components/BrandPattern";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRing, CalendarClock, KeyRound, LogOut, Mail, MailQuestion, ShieldCheck, Target, UserRound } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import type { FollowUp, LeadRow, Meeting, User } from "@/lib/types";
import { Avatar, CountUp } from "@/components/fx/effects";
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader, useToast } from "@/components/ui";

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const stats = useLoad(async () => {
    const [leads, follow, meetings] = await Promise.all([
      api.get<{ leads: LeadRow[] }>("/leads?mine=1"),
      api.get<{ follow_ups: FollowUp[] }>("/follow-ups?status=pending&mine=1"),
      api.get<{ meetings: Meeting[] }>(`/meetings?from=${encodeURIComponent(new Date().toISOString())}`),
    ]);
    return {
      open: leads.leads.filter((l) => !["won", "lost"].includes(l.stage)).length,
      won: leads.leads.filter((l) => l.stage === "won").length,
      follow: follow.follow_ups.length,
      overdue: follow.follow_ups.filter((f) => f.overdue).length,
      meetings: meetings.meetings.filter((m) => m.status === "scheduled").length,
    };
  }, [user?.id]);

  if (!user) return null;

  async function saveDetails() {
    setSaving(true);
    setDetailsError("");
    try {
      const r = await api.patch<{ user: User }>("/auth/profile", { full_name: name, phone });
      setUser(r.user);
      toast("Profile updated");
    } catch (e) {
      setDetailsError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (next !== again) return setPwError("The two new passwords do not match");
    setPwBusy(true);
    setPwError("");
    try {
      await api.post("/auth/change-password", { current_password: current, new_password: next });
      toast("Password changed");
      setCurrent("");
      setNext("");
      setAgain("");
    } catch (e) {
      setPwError(errorMessage(e));
    } finally {
      setPwBusy(false);
    }
  }

  async function emailReset() {
    setEmailBusy(true);
    try {
      const r = await api.post<{ message: string }>("/auth/send-my-reset");
      toast(r.message);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setEmailBusy(false);
    }
  }

  const s = stats.data;
  return (
    <div className="space-y-6">
      <PageHeader title="Your profile" subtitle="Your details, password and sign-in" />

      <section className="glass-strong animate-fade-up overflow-hidden rounded-[1.75rem]" style={{ animationDelay: "0.05s" }}>
        <div className="bg-navy-gradient relative h-32 sm:h-40">
          <BrandPattern />
        </div>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 px-6 pb-6 sm:px-8">
          <div className="-mt-10 flex items-start gap-5">
            <Avatar name={user.full_name} size={92} ring className="!rounded-3xl text-3xl shadow-xl" />
            <div className="pt-12">
              <h2 className="text-2xl font-bold text-slate-900">{user.full_name}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200"><ShieldCheck className="h-3.5 w-3.5" />{roleLabel(user.role)}</Badge>
                <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" />{user.email}</span>
              </div>
            </div>
          </div>
          <div className="pt-12">
            <Button variant="danger" onClick={() => logout().then(() => router.replace("/"))}><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-slate-200/60 bg-slate-50/50 px-6 py-5 sm:grid-cols-4 sm:px-8">
          {[
            { icon: Target, label: "Open leads", value: s?.open, tone: "from-indigo-600 to-cyan-glow" },
            { icon: BellRing, label: "Pending follow-ups", value: s?.follow, tone: "from-gold-500 to-gold-300", note: s?.overdue ? `${s.overdue} overdue` : undefined },
            { icon: CalendarClock, label: "Upcoming meetings", value: s?.meetings, tone: "from-indigo-800 to-indigo-400" },
            { icon: ShieldCheck, label: "Deals won", value: s?.won, tone: "from-emerald-600 to-emerald-300" },
          ].map((x) => (
            <div key={x.label} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3.5 ring-1 ring-slate-200/60">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${x.tone} text-white shadow-md`}><x.icon className="h-5 w-5" /></span>
              <div>
                <dd className="font-display text-xl font-bold text-slate-900">{x.value == null ? "—" : <CountUp value={x.value} />}</dd>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{x.label}</dt>
                {x.note && <p className="text-xs font-semibold text-rose-600">{x.note}</p>}
              </div>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-indigo-500" /> Your details</span>}>
          <div className="space-y-4">
            {detailsError && <ErrorNote message={detailsError} />}
            <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" name="phone" autoComplete="tel" inputMode="tel" placeholder="+91 00000 00000" /></Field>
            <Field label="Email" hint="Your email is your login. A CRM Administrator can change it if needed."><Input value={user.email ?? ""} disabled /></Field>
            <div className="flex justify-end"><Button onClick={saveDetails} loading={saving} disabled={!name.trim()}>Save changes</Button></div>
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-indigo-500" /> Password</span>}>
          <div className="space-y-4">
            {pwError && <ErrorNote message={pwError} />}
            <Field label="Current password"><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" hint="At least 8 characters"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
              <Field label="Repeat new password"><Input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" /></Field>
            </div>
            <div className="flex justify-end"><Button onClick={changePassword} loading={pwBusy} disabled={!current || !next}>Change password</Button></div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
              <div className="flex items-start gap-3">
                <MailQuestion className="mt-0.5 h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Forgot your current password?</p>
                  <p className="text-xs text-slate-500">We will email a one-time reset link to {user.email}.</p>
                </div>
              </div>
              <Button variant="secondary" onClick={emailReset} loading={emailBusy}>Email me a reset link</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
