"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { ArrowRight, BellRing, CalendarClock, FileSpreadsheet, GitBranch, LayoutDashboard, Layers, Sparkles, Target, Users2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { HeroVisual } from "@/components/HeroVisual";
import { useIntro } from "@/components/fx/Intro";
import { Reveal, Tilt } from "@/components/fx/effects";
import { useAuth } from "@/lib/auth";
import { STAGE_HEX, cap } from "@/lib/format";

const STAGES = ["new lead", "reaching out", "qualified", "prototype", "quotation", "negotiation", "won"];

const FEATURES = [
  { icon: Target, title: "A pipeline that moves", text: "Drag leads across eight stages. Every move is logged and hands the lead to the right person automatically.", tone: "from-indigo-600 to-cyan-glow" },
  { icon: BellRing, title: "Follow-ups that never slip", text: "Schedule the next step at the end of every call. Reminders land in your inbox before it is due.", tone: "from-gold-500 to-gold-300" },
  { icon: GitBranch, title: "The prototype loop, tracked", text: "Every change request becomes a numbered round with deadline, link and client feedback. Nothing gets lost.", tone: "from-indigo-800 to-indigo-400" },
  { icon: CalendarClock, title: "Meetings and invites", text: "Schedule one-off or repeating meetings and email calendar invites to your team and the client.", tone: "from-cyan-glow to-indigo-500" },
  { icon: FileSpreadsheet, title: "Import in seconds", text: "Drop in an Excel or CSV file. Duplicates are caught by phone and email before they reach the team.", tone: "from-indigo-600 to-indigo-300" },
  { icon: LayoutDashboard, title: "An administrator's dashboard", text: "Pipeline value, win rate, sources, lost reasons and who is closing. Live, from your own lead data.", tone: "from-indigo-900 to-indigo-500" },
];

const FLOW = [
  { role: "Business Development", text: "Import and add leads, tidy the details.", tone: "bg-slate-100 text-slate-700" },
  { role: "CRM Administrators", text: "Call, qualify, follow up and negotiate.", tone: "bg-indigo-100 text-indigo-800" },
  { role: "Technical Analyst", text: "Gather requirements, run prototype rounds and demos.", tone: "bg-gold-300/60 text-gold-600" },
];

export default function HomePage() {
  const router = useRouter();
  const intro = useIntro();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const enter = () => (user ? router.push(user.role === "admin" ? "/dashboard" : "/leads") : intro.play("/login"));
  const label = user ? "Open workspace" : "Sign in";

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="aurora" />
      <div className="dot-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[780px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      {/* navigation */}
      <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
        <div className={`mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 sm:px-6 ${scrolled ? "glass mx-3 sm:mx-auto" : ""}`}>
          <Logo height={34} priority />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#flow" className="transition-colors hover:text-indigo-600">How it flows</a>
            <a href="#features" className="transition-colors hover:text-indigo-600">Features</a>
            <a href="#roles" className="transition-colors hover:text-indigo-600">Your team</a>
          </nav>
          <button onClick={enter} className="group inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_44px_-8px_rgb(21_88_224/0.75)] active:translate-y-0">
            {label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-6 px-5 pb-16 pt-28 sm:px-8 lg:min-h-[92vh] lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:pb-10 lg:pt-24">
        <div className="relative z-10">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100 backdrop-blur" style={{ animationDelay: "0.1s" }}>
            <Sparkles className="h-3.5 w-3.5 text-gold-500" /> Infinyty internal CRM
          </div>
          <h1 className="animate-fade-up mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl xl:text-[3.4rem]" style={{ animationDelay: "0.2s" }}>
            Turn every conversation into a <span className="text-gradient">lasting client.</span>
          </h1>
          <p className="animate-fade-up mt-5 max-w-lg text-[15px] leading-relaxed text-slate-600" style={{ animationDelay: "0.35s" }}>
            From the first call to the signed deal, your whole team works from one place: leads, follow-ups, requirements, prototype rounds and meetings, all connected.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.5s" }}>
            <button onClick={enter} className="group inline-flex items-center gap-2.5 rounded-xl bg-navy-gradient py-2.5 pl-5 pr-2.5 text-sm font-semibold text-white shadow-[0_18px_50px_-12px_rgb(14_42_107/0.7)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_60px_-10px_rgb(21_88_224/0.7)]">
              {user ? "Open your workspace" : "Sign in to your workspace"}
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 transition-transform group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span>
            </button>
            <a href="#flow" className="rounded-xl bg-white/60 px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300/70 backdrop-blur transition-all hover:bg-white hover:ring-indigo-300">See how it works</a>
          </div>
          <dl className="animate-fade-up mt-10 grid max-w-sm grid-cols-3 gap-6 border-t border-slate-200/70 pt-6" style={{ animationDelay: "0.65s" }}>
            {[["8", "pipeline stages"], ["3", "roles, one flow"], ["1", "source of truth"]].map(([n, l]) => (
              <div key={l}>
                <dt className="font-display text-2xl font-bold text-slate-900">{n}</dt>
                <dd className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <HeroVisual />
      </section>

      {/* pipeline flow */}
      <section id="flow" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">How it flows</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">One lead. Eight steps. Zero guesswork.</h2>
          <p className="mt-4 text-slate-600">Every stage has a clear owner, so nothing waits for someone who does not know it is theirs.</p>
        </Reveal>
        <Reveal className="relative mt-14" delay={150}>
          <div className="absolute left-0 right-0 top-6 hidden h-0.5 bg-gradient-to-r from-slate-200 via-indigo-300 to-gold-300 md:block" />
          <ol className="relative grid gap-5 sm:grid-cols-4 md:grid-cols-7">
            {STAGES.map((s, i) => (
              <li key={s} className="flex flex-col items-center text-center">
                <span className="z-10 grid h-12 w-12 place-items-center rounded-2xl text-sm font-bold text-white shadow-lg" style={{ background: STAGE_HEX[s], boxShadow: `0 10px 24px -8px ${STAGE_HEX[s]}` }}>{i + 1}</span>
                <span className="mt-3 text-sm font-semibold text-slate-800">{cap(s)}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Everything in one place</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Built around the way you actually work.</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <Tilt className="h-full rounded-3xl" max={6}>
                <div className="glass hover-lift h-full rounded-3xl p-7">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.tone} text-white shadow-lg`}><f.icon className="h-6 w-6" /></span>
                  <h3 className="mt-6 text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      {/* roles */}
      <section id="roles" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Your team</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">The right work reaches the right person.</h2>
        </Reveal>
        <div className="mt-14 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {FLOW.map((f, i) => (
            <Fragment key={f.role}>
              <Reveal delay={i * 140}>
                <div className="glass hover-lift h-full rounded-3xl p-7 text-center">
                  <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${f.tone}`}><Users2 className="h-6 w-6" /></span>
                  <h3 className="mt-5 text-xl font-bold text-slate-900">{f.role}</h3>
                  <p className="mt-2 text-sm text-slate-600">{f.text}</p>
                </div>
              </Reveal>
              {i < FLOW.length - 1 && <ArrowRight className="mx-auto hidden h-6 w-6 self-center text-indigo-400 md:block" />}
            </Fragment>
          ))}
        </div>
      </section>

      {/* closing call to action */}
      <section className="mx-auto max-w-7xl px-5 pb-24 pt-6 sm:px-8">
        <Reveal>
          <div className="bg-navy-gradient relative overflow-hidden rounded-[2rem] px-8 py-16 text-center shadow-[0_40px_90px_-30px_rgb(14_42_107/0.8)] sm:px-16">
            <div className="dot-grid absolute inset-0 opacity-20" />
            <div className="absolute -right-24 -top-24 h-80 w-80 animate-blob rounded-full bg-cyan-glow/30 blur-3xl" />
            <div className="absolute -bottom-28 -left-16 h-80 w-80 animate-blob rounded-full bg-gold-500/25 blur-3xl" style={{ animationDelay: "-8s" }} />
            <Layers className="relative mx-auto h-9 w-9 text-gold-300" />
            <h2 className="relative mx-auto mt-5 max-w-2xl text-3xl font-bold text-white sm:text-4xl">Ready when you are.</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-indigo-100/90">Your pipeline, your follow-ups and your clients are waiting inside.</p>
            <button onClick={enter} className="group relative mt-9 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-900 shadow-2xl transition-all hover:-translate-y-1">
              {label} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-slate-200/70 px-5 py-8 text-sm text-slate-500 sm:px-8">
        <Logo height={26} />
        <p>Internal tool. Authorised team members only.</p>
      </footer>
    </div>
  );
}
