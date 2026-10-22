"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowUpRight, CalendarClock, Clock, Crown, IndianRupee, Layers, Percent, Plus, Trophy, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { STAGE_HEX, cap, roleLabel, dueLabel, fmtCompactMoney, fmtDateTime } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import type { DashboardData } from "@/lib/types";
import { Sparkles } from "@/components/fx/Sparkles";
import { Avatar, CountUp, Tilt } from "@/components/fx/effects";
import { Card, Empty, ErrorNote, Skeleton } from "@/components/ui";

const axis = { fontSize: 12, fill: "#62759b" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/* a glass tooltip for every chart */
function GlassTip({ active, payload, label, money }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3.5 py-2.5 text-xs shadow-lg">
      {label && <p className="mb-1 font-bold text-slate-800">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <strong className="text-slate-900">{money ? fmtCompactMoney(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

function Sparkline({ data, stroke = "#1558e0" }: { data: number[]; stroke?: string }) {
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * 100},${34 - (v / max) * 28}`);
  const id = `sp-${stroke.slice(1)}`;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,40 ${pts.join(" ")} 100,40`} fill={`url(#${id})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Ring({ value, color = "#1558e0" }: { value: number; color?: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 52 52" className="h-14 w-14 -rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgb(21 88 224 / 0.12)" strokeWidth="6" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (Math.min(value, 100) / 100) * c} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.2,0.8,0.2,1)" }} />
    </svg>
  );
}

function Kpi({ icon, label, value, format, hint, tone = "from-indigo-600 to-cyan-glow", href, extra }: { icon: ReactNode; label: string; value: number | null; format?: (n: number) => string; hint?: string; tone?: string; href?: string; extra?: ReactNode }) {
  const body = (
    <Tilt className="h-full rounded-2xl" max={6}>
      <div className="glass hover-lift relative h-full overflow-hidden rounded-2xl p-5">
        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${tone} opacity-[0.12] blur-xl`} />
        <div className="flex items-start justify-between">
          <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-lg`}>{icon}</span>
          {href && <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-500" />}
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="font-display mt-1 text-3xl font-bold text-slate-900">{value == null ? "—" : <CountUp value={value} format={format} />}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        {extra}
      </div>
    </Tilt>
  );
  return href ? <Link href={href} className="group block h-full">{body}</Link> : body;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState(30);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (user && !isAdmin) router.replace("/leads");
  }, [user, isAdmin, router]);

  const { data, loading, error } = useLoad(() => (isAdmin ? api.get<DashboardData>(`/dashboard?days=${days}`) : Promise.resolve(null)), [days, isAdmin]);

  const funnel = useMemo(() => {
    if (!data) return [];
    const max = Math.max(...data.funnel.map((f) => f.count), 1);
    return data.funnel.map((f) => ({ ...f, pct: (f.count / max) * 100 }));
  }, [data]);

  if (!isAdmin) return null;
  if (error) return <ErrorNote message={error} />;
  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-36" />)}</div>
        <Skeleton className="h-80" />
      </div>
    );
  }
  const k = data.kpis;
  const first = user?.full_name.split(" ")[0];
  const spark = data.trend.map((t) => t.created);
  const lostTotal = data.lost_reasons.reduce((s, r) => s + r.count, 0);
  const PIE = ["#f43f5e", "#f97316", "#f59e0b", "#8b5cf6", "#64748b"];
  const topWon = Math.max(...data.team.map((t) => t.won), 1);

  return (
    <div className={`space-y-6 transition-opacity duration-300 ${loading ? "opacity-60" : ""}`}>
      {/* hero */}
      <section className="bg-navy-gradient relative isolate overflow-hidden rounded-[1.75rem] px-6 py-8 shadow-[0_30px_70px_-28px_rgb(14_42_107/0.8)] sm:px-10 sm:py-12">
        <Sparkles />
        <div className="relative z-10 max-w-xl">
          <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.2em] text-cyan-glow">Dashboard</p>
          <h1 className="animate-fade-up mt-3 text-3xl font-bold text-white sm:text-5xl" style={{ animationDelay: "0.08s" }}>
            {greeting()}, <span className="bg-gradient-to-r from-cyan-glow to-gold-300 bg-clip-text text-transparent">{first}</span>
          </h1>
          <p className="animate-fade-up mt-4 text-base leading-relaxed text-indigo-100/90" style={{ animationDelay: "0.16s" }}>
            {k.overdue_follow_ups > 0 ? <><strong className="text-gold-300">{k.overdue_follow_ups} follow-up{k.overdue_follow_ups === 1 ? "" : "s"}</strong> need attention. </> : "Every follow-up is on track. "}
            {k.meetings_today > 0 ? `${k.meetings_today} meeting${k.meetings_today === 1 ? "" : "s"} today. ` : "No meetings today. "}
            {k.open_leads} open leads worth <strong className="text-white">{fmtCompactMoney(k.pipeline_value)}</strong> are in play.
          </p>
          <div className="animate-fade-up mt-7 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.24s" }}>
            <Link href="/follow-ups" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-900 shadow-lg transition-transform hover:-translate-y-0.5">Review follow-ups <ArrowUpRight className="h-4 w-4" /></Link>
            <Link href="/leads" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/20"><Plus className="h-4 w-4" /> Add a lead</Link>
          </div>
          <div className="animate-fade-up mt-8 inline-flex rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur" style={{ animationDelay: "0.3s" }} role="group" aria-label="Date range">
            {[[7, "7 days"], [30, "30 days"], [90, "90 days"], [365, "1 year"]].map(([d, l]) => (
              <button key={d} onClick={() => setDays(d as number)} className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${days === d ? "bg-white text-indigo-900 shadow" : "text-indigo-100 hover:text-white"}`}>{l}</button>
            ))}
          </div>
        </div>
      </section>

      {k.total_leads === 0 && (
        <section className="glass-strong animate-fade-up rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">Let&apos;s get your CRM started</h2>
          <p className="mt-1 text-sm text-slate-500">Four steps and your dashboard comes alive with real numbers.</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { n: 1, title: "Add your first lead", text: "Enter one by hand or import a sheet.", href: "/import", cta: "Add a lead", tone: "from-indigo-600 to-cyan-glow" },
              { n: 2, title: "Log a call", text: "Open the lead and record what was said.", href: "/leads", cta: "Open leads", tone: "from-emerald-600 to-emerald-300" },
              { n: 3, title: "Set a follow-up", text: "So no lead ever goes quiet.", href: "/follow-ups", cta: "See follow-ups", tone: "from-gold-500 to-gold-300" },
              { n: 4, title: "Invite the team", text: "Add Executives and an Analyst.", href: "/team", cta: "Open team", tone: "from-violet-600 to-violet-400" },
            ].map((s) => (
              <li key={s.n} className="hover-lift rounded-2xl bg-white p-5 ring-1 ring-slate-200/70">
                <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${s.tone} text-sm font-bold text-white shadow-md`}>{s.n}</span>
                <p className="mt-3 text-sm font-bold text-slate-900">{s.title}</p>
                <p className="mt-1 text-xs text-slate-500">{s.text}</p>
                <Link href={s.href} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">{s.cta} <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* kpis */}
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Layers className="h-5 w-5" />} label="Total leads" value={k.total_leads} hint={`${k.open_leads} still open`} extra={<div className="-mx-1 mt-2"><Sparkline data={spark} /></div>} />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label={`New in ${days} days`} value={k.new_leads} tone="from-cyan-glow to-indigo-500" hint="Added by the team" />
        <Kpi icon={<IndianRupee className="h-5 w-5" />} label="Open pipeline" value={k.pipeline_value} format={(n) => fmtCompactMoney(n)} tone="from-indigo-800 to-indigo-400" hint="Sum of estimated budgets" />
        <Kpi icon={<Trophy className="h-5 w-5" />} label={`Won in ${days} days`} value={k.revenue} format={(n) => fmtCompactMoney(n)} tone="from-emerald-600 to-emerald-300" hint={`${k.won_in_range} deal${k.won_in_range === 1 ? "" : "s"} closed`} />
        <Kpi icon={<Percent className="h-5 w-5" />} label="Win rate" value={k.win_rate} format={(n) => `${Math.round(n)}%`} tone="from-gold-500 to-gold-300" hint={`${k.won} won · ${k.lost} lost`} extra={<div className="absolute right-4 top-14"><Ring value={k.win_rate} color="#f4a90a" /></div>} />
        <Kpi icon={<Clock className="h-5 w-5" />} label="Avg days to win" value={k.avg_days_to_win} tone="from-indigo-600 to-indigo-300" hint={`${k.avg_rounds} prototype rounds per lead`} />
        <Kpi icon={<AlertTriangle className="h-5 w-5" />} label="Overdue follow-ups" value={k.overdue_follow_ups} tone={k.overdue_follow_ups > 0 ? "from-rose-600 to-rose-400" : "from-slate-500 to-slate-300"} href="/follow-ups" hint={`${k.follow_ups_today} due today`} />
        <Kpi icon={<CalendarClock className="h-5 w-5" />} label="Meetings today" value={k.meetings_today} tone="from-cyan-glow to-indigo-600" href="/calendar" hint="See the calendar" />
      </div>

      {/* funnel + trend */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Pipeline by stage" className="lg:col-span-3" actions={<span className="text-xs text-slate-400">Where every lead is right now</span>}>
          <ul className="space-y-3.5">
            {funnel.map((f, i) => (
              <li key={f.id} className="group">
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_HEX[f.name] }} />
                    {cap(f.name)}
                  </span>
                  <span className="text-slate-500"><strong className="text-slate-900">{f.count}</strong> · {fmtCompactMoney(f.value)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-[width] duration-1000 ease-out"
                    style={{ width: `${Math.max(f.pct, f.count ? 3 : 0)}%`, background: `linear-gradient(90deg, ${STAGE_HEX[f.name]}, ${STAGE_HEX[f.name]}aa)`, transitionDelay: `${i * 70}ms`, boxShadow: `0 4px 14px -4px ${STAGE_HEX[f.name]}` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Leads added vs deals won" className="lg:col-span-2" actions={<span className="text-xs text-slate-400">Last 12 weeks</span>}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ left: -18, right: 6, top: 8 }}>
                <defs>
                  <linearGradient id="g-created" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f73f5" stopOpacity="0.45" /><stop offset="1" stopColor="#2f73f5" stopOpacity="0" /></linearGradient>
                  <linearGradient id="g-won" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity="0.5" /><stop offset="1" stopColor="#10b981" stopOpacity="0" /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e4ebf7" strokeDasharray="4 6" />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={2} />
                <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTip />} />
                <Area type="monotone" dataKey="created" name="Leads added" stroke="#2f73f5" strokeWidth={3} fill="url(#g-created)" />
                <Area type="monotone" dataKey="won" name="Won" stroke="#10b981" strokeWidth={3} fill="url(#g-won)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* sources + lost reasons */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Where leads come from" actions={<span className="text-xs text-slate-400">Last {days} days</span>}>
          {data.by_source.length === 0 ? <Empty title="No leads in this period" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_source} margin={{ left: -18, top: 8 }} barGap={6}>
                  <defs>
                    <linearGradient id="g-src" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5b97ff" /><stop offset="1" stopColor="#1558e0" /></linearGradient>
                    <linearGradient id="g-src-won" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#059669" /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e4ebf7" strokeDasharray="4 6" />
                  <XAxis dataKey="source" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgb(21 88 224 / 0.05)" }} content={<GlassTip />} />
                  <Bar dataKey="total" name="Leads" fill="url(#g-src)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="won" name="Won" fill="url(#g-src-won)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Why leads are lost">
          {lostTotal === 0 ? <Empty title="No lost leads yet" hint="Reasons will appear here as deals close." /> : (
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="relative h-56 w-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.lost_reasons} dataKey="count" nameKey="reason" innerRadius={62} outerRadius={96} paddingAngle={3} cornerRadius={6} stroke="none">
                      {data.lost_reasons.map((r, i) => <Cell key={r.reason} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip content={<GlassTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div><p className="font-display text-3xl font-bold text-slate-900">{lostTotal}</p><p className="text-xs text-slate-500">lost leads</p></div>
                </div>
              </div>
              <ul className="min-w-[200px] flex-1 space-y-2.5">
                {data.lost_reasons.map((r, i) => (
                  <li key={r.reason} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5 text-slate-700"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} />{cap(r.reason)}</span>
                    <span className="font-semibold text-slate-900">{r.count} <span className="font-normal text-slate-400">({Math.round((r.count / lostTotal) * 100)}%)</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* leaderboard */}
      <Card title="Team leaderboard" padded={false} actions={<span className="text-xs text-slate-400">Last {days} days</span>}>
        <ul className="divide-y divide-slate-200/60">
          {data.team.map((t, i) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 transition-colors hover:bg-indigo-50/40">
              <div className="flex min-w-[210px] flex-1 items-center gap-3">
                <span className="relative">
                  <Avatar name={t.full_name} size={44} />
                  {i === 0 && t.won > 0 && <Crown className="absolute -right-2 -top-3 h-5 w-5 rotate-12 fill-gold-400 text-gold-500 drop-shadow" />}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.full_name}</p>
                  <p className="text-xs font-medium text-slate-500">{roleLabel(t.role)}</p>
                </div>
              </div>
              <div className="min-w-[160px] flex-1">
                <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Deals won</span><strong className="text-emerald-600">{t.won}</strong></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-1000" style={{ width: `${(t.won / topWon) * 100}%` }} /></div>
              </div>
              <dl className="grid grid-cols-4 gap-5 text-center text-xs">
                {[["Added", t.leads_added], ["Open", t.open_leads], ["Calls", t.activities], ["Overdue", t.overdue]].map(([l, v]) => (
                  <div key={l as string}><dd className={`text-base font-bold ${l === "Overdue" && (v as number) > 0 ? "text-rose-600" : "text-slate-900"}`}>{v}</dd><dt className="text-slate-400">{l}</dt></div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </Card>

      {/* follow-ups + activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Next follow-ups" padded={false} actions={<Link href="/follow-ups" className="text-xs font-semibold text-indigo-600 hover:underline">See all</Link>}>
          {data.upcoming_follow_ups.length === 0 ? <Empty title="Nothing scheduled" /> : (
            <ul className="divide-y divide-slate-200/60">
              {data.upcoming_follow_ups.map((f) => (
                <li key={f.id} className="relative flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-indigo-50/40">
                  <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${f.overdue ? "bg-rose-500" : "bg-indigo-400"}`} />
                  <Avatar name={f.company} size={38} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/leads/${f.lead_id}`} className="block truncate text-sm font-bold text-slate-900 hover:text-indigo-600">{f.company}</Link>
                    <p className="truncate text-xs text-slate-500">{f.purpose ?? "Follow up"} · {f.assigned_name ?? "Unassigned"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${f.overdue ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}>{dueLabel(f.due_at).text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent activity" padded={false}>
          {data.recent_activity.length === 0 ? <Empty title="No activity yet" /> : (
            <ol className="relative px-5 py-4">
              <span className="absolute bottom-6 left-[34px] top-6 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />
              {data.recent_activity.map((a) => (
                <li key={a.id} className="relative flex gap-4 pb-5 last:pb-0">
                  <span className="z-10 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[11px] font-bold uppercase text-indigo-600 ring-2 ring-indigo-100">{a.type.slice(0, 2)}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800"><strong>{a.user_name ?? "Someone"}</strong> logged a <span className="capitalize">{a.type}</span> with <Link href={`/leads/${a.lead_id}`} className="font-bold text-indigo-600 hover:underline">{a.company}</Link></p>
                    {a.summary && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.summary}</p>}
                    <p className="mt-1 text-xs text-slate-400">{fmtDateTime(a.occurred_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
