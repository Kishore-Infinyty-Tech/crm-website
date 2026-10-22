"use client";

import { BellRing, CalendarDays, CheckCircle2, LayoutDashboard, Search, Settings, Target, TrendingUp } from "lucide-react";
import { Avatar, CountUp, Tilt } from "./fx/effects";
import { Sparkles } from "./fx/Sparkles";

const COLUMNS = [
  { name: "Reaching out", color: "#0ea5e9", cards: [{ co: "Orbit Logistics", amount: "₹40K", due: "Today, 4:30 pm", hot: true }, { co: "Sunrise Traders", amount: "₹75K", due: "Tomorrow" }] },
  { name: "Prototype", color: "#8b5cf6", cards: [{ co: "Pixel Studio", amount: "₹5L", due: "Round 2" }, { co: "Apex Fitness", amount: "₹1.2L", due: "Demo Fri" }] },
  { name: "Negotiation", color: "#f97316", cards: [{ co: "Harbor Legal", amount: "₹3.5L", due: "Terms sent", hot: true }, { co: "Quantum Labs", amount: "₹2L", due: "Mon" }] },
];

/** A live-looking slice of the real app (built from real components, not a picture) for the home page. */
export function HeroShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-[660px] lg:max-w-none">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-indigo-300/40 via-cyan-glow/20 to-gold-300/30 blur-3xl" />
      <Sparkles className="!-z-10 [&_.sparkle-sheen]:hidden" />

      <Tilt className="animate-float-slow" max={4}>
        <div className="glass-strong overflow-hidden rounded-[1.75rem] shadow-[0_40px_90px_-30px_rgb(14_42_107/0.55)] ring-1 ring-white/70">
          {/* window bar */}
          <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white/80 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff6b6b]" /><span className="h-3 w-3 rounded-full bg-[#fbbf3a]" /><span className="h-3 w-3 rounded-full bg-[#34d399]" />
            <div className="mx-auto flex w-1/2 items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-400"><Search className="h-3 w-3" /> Search leads or jump anywhere</div>
            <Avatar name="Aayush Mahendru" size={24} />
          </div>

          <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[64px_1fr]">
            {/* sidebar */}
            <div className="bg-navy-gradient flex flex-col items-center gap-3 py-4">
              {[LayoutDashboard, Target, BellRing, CalendarDays, Settings].map((Icon, i) => (
                <span key={i} className={`grid h-9 w-9 place-items-center rounded-xl ${i === 1 ? "bg-brand-gradient text-white shadow-glow" : "text-indigo-200/80"}`}><Icon className="h-[18px] w-[18px]" /></span>
              ))}
            </div>

            <div className="space-y-3 bg-slate-50/70 p-3 sm:p-4">
              {/* greeting */}
              <div className="bg-navy-gradient relative overflow-hidden rounded-2xl px-4 py-3.5">
                <Sparkles />
                <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-glow">Dashboard</p>
                <p className="font-display relative mt-0.5 text-lg font-bold text-white sm:text-xl">Good morning, <span className="bg-gradient-to-r from-cyan-glow to-gold-300 bg-clip-text text-transparent">Aayush</span></p>
              </div>

              {/* numbers */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: "Total leads", value: 36, tone: "from-indigo-600 to-cyan-glow", icon: Target },
                  { label: "Won this month", value: 3.5, tone: "from-emerald-600 to-emerald-300", icon: TrendingUp, fmt: (n: number) => `₹${n.toFixed(1)}L` },
                  { label: "Win rate", value: 57, tone: "from-gold-500 to-gold-300", icon: CheckCircle2, fmt: (n: number) => `${Math.round(n)}%` },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/70">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${k.tone} text-white`}><k.icon className="h-3.5 w-3.5" /></span>
                    <p className="font-display mt-2 text-base font-bold text-slate-900 sm:text-lg"><CountUp value={k.value} format={k.fmt} /></p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* pipeline */}
              <div className="grid grid-cols-3 gap-2.5">
                {COLUMNS.map((c) => (
                  <div key={c.name} className="rounded-xl bg-white/70 p-2 ring-1 ring-slate-200/60">
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-700"><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}</p>
                    <div className="space-y-2">
                      {c.cards.map((card) => (
                        <div key={card.co} className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200/70">
                          <div className="flex items-center gap-1.5"><Avatar name={card.co} size={20} /><span className="truncate text-[11px] font-bold text-slate-800">{card.co}</span></div>
                          <div className="mt-1.5 flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-slate-700">{card.amount}</span>
                            <span className={`rounded-full px-1.5 py-0.5 font-semibold ${card.hot ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>{card.due}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Tilt>

      {/* notifications floating around the window */}
      <Tilt className="absolute -left-12 bottom-[12%] hidden w-60 sm:block" max={8}>
        <div className="glass-strong animate-float flex items-center gap-3 rounded-2xl p-3.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 text-white"><BellRing className="h-5 w-5" /></span>
          <div><p className="text-sm font-bold text-slate-900">Follow-up at 4:30 PM</p><p className="text-xs text-slate-500">Share the requirements form</p></div>
        </div>
      </Tilt>
      <Tilt className="absolute -right-3 -top-5 hidden w-56 sm:block" max={8}>
        <div className="glass-strong animate-float flex items-center gap-3 rounded-2xl p-3.5" style={{ animationDelay: "-3s" }}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-300 text-white"><CheckCircle2 className="h-5 w-5" /></span>
          <div><p className="text-sm font-bold text-slate-900">Round 3 approved</p><p className="text-xs text-slate-500">Client signed off</p></div>
        </div>
      </Tilt>
      <Tilt className="absolute -bottom-12 right-2 hidden w-52 sm:block" max={8}>
        <div className="glass-strong animate-float-slow flex items-center gap-3 rounded-2xl p-3.5" style={{ animationDelay: "-5s" }}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white"><Target className="h-5 w-5" /></span>
          <div><p className="text-sm font-bold text-slate-900">New lead</p><p className="text-xs text-slate-500">Acme Traders · ₹1.5L</p></div>
        </div>
      </Tilt>
    </div>
  );
}
