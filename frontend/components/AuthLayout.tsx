import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BellRing, CheckCircle2, Layers, Repeat, ShieldCheck } from "lucide-react";
import { Logo, LogoOnDark } from "./Logo";
import { Sparkles } from "./fx/Sparkles";

const FEATURES = [
  { icon: Layers, title: "One pipeline for the whole team", text: "Leads, follow-ups, requirements and prototype rounds, together.", tone: "from-indigo-500 to-cyan-glow" },
  { icon: Repeat, title: "Handovers that run themselves", text: "Each stage goes to its owner: Business Development, the CRM Administrator or the Technical Analyst.", tone: "from-gold-500 to-gold-300" },
  { icon: BellRing, title: "Reminders before it is late", text: "An email reaches you before every follow-up is due.", tone: "from-emerald-500 to-emerald-300" },
];

const STAGES = ["#94a3b8", "#0ea5e9", "#6366f1", "#8b5cf6", "#f59e0b", "#f97316", "#10b981"];

/**
 * Split screen for sign in, forgot password and reset password.
 * On desktop it always fits the window exactly (no scrolling): spacing tightens and the
 * extras hide as the window gets shorter. On phones it simply stacks and scrolls.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:h-dvh lg:grid-cols-[1.1fr_1fr] lg:overflow-hidden">
      {/* brand side */}
      <section className="bg-navy-gradient relative hidden overflow-hidden lg:block">
        <div className="dot-grid absolute inset-0 opacity-[0.1]" />
        <div className="absolute -left-40 top-1/3 h-[34rem] w-[34rem] rounded-full bg-indigo-500/25 blur-[110px]" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-cyan-glow/20 blur-[100px]" />
        <div className="absolute -bottom-40 right-10 h-96 w-96 rounded-full bg-gold-500/15 blur-[110px]" />
        <Sparkles className="[&_.sparkle-sheen]:opacity-60" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 90px)" }} />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/30 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between gap-6 px-10 py-8 xl:px-14 xl:py-10">
          <div className="animate-fade-up flex items-center justify-between">
            <LogoOnDark height={40} />
            <span className="hidden items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-100 ring-1 ring-white/20 backdrop-blur xl:inline-flex"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Secure team workspace</span>
          </div>

          <div className="max-w-lg">
            <h2 className="animate-fade-up text-[2.6rem] font-extrabold leading-[1.06] text-white xl:text-[3.3rem] [@media(max-height:640px)]:text-[2.2rem]" style={{ animationDelay: "0.1s" }}>
              Welcome back to your <span className="bg-gradient-to-r from-cyan-glow via-indigo-200 to-gold-300 bg-clip-text text-transparent">pipeline.</span>
            </h2>
            <p className="animate-fade-up mt-3 max-w-md text-base leading-relaxed text-indigo-100/85 [@media(max-height:580px)]:hidden" style={{ animationDelay: "0.2s" }}>Pick up exactly where you left off: your leads, your follow-ups and your clients.</p>

            <ul className="mt-6 space-y-2.5 [@media(max-height:700px)]:mt-4 [@media(max-height:700px)]:space-y-2">
              {FEATURES.map((f, i) => (
                <li key={f.title} className="animate-fade-up group flex items-center gap-3.5 rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/10" style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${f.tone} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}><f.icon className="h-5 w-5" /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">{f.title}</span>
                    <span className="block text-[13px] leading-snug text-indigo-100/75 [@media(max-height:700px)]:hidden">{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-end justify-between gap-6">
            <div className="animate-fade-up glass-strong animate-float-slow w-72 rounded-2xl p-3.5 text-slate-800 [@media(max-height:820px)]:hidden" style={{ animationDelay: "0.7s" }}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>Pipeline</span><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">Live</span></div>
              <div className="mt-2.5 flex gap-1.5">{STAGES.map((c, i) => <span key={c} className="h-2 flex-1 rounded-full" style={{ background: c, opacity: 0.35 + i * 0.1 }} />)}</div>
              <div className="mt-2.5 flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Round 3 approved</div>
              <p className="text-xs text-slate-500">Client signed off. Ready for the quotation.</p>
            </div>
            <p className="ml-auto max-w-[12rem] text-right text-xs leading-relaxed text-indigo-200/60">Internal tool.<br />Authorised team members only.</p>
          </div>
        </div>
      </section>

      {/* form side */}
      <section className="relative grid place-items-center overflow-hidden px-5 py-16 lg:py-6">
        <div className="aurora" />
        <div className="dot-grid pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

        <Link
          href="/"
          className="group absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-sm font-bold text-indigo-700 shadow-[0_8px_24px_-8px_rgb(21_88_224/0.45)] ring-1 ring-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-600 hover:text-white hover:ring-indigo-600 hover:shadow-[0_14px_30px_-8px_rgb(21_88_224/0.7)] xl:left-8 xl:top-7"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-50 text-indigo-600 transition-all duration-300 group-hover:-translate-x-0.5 group-hover:bg-white/20 group-hover:text-white"><ArrowLeft className="h-4 w-4" /></span>
          Back to home
        </Link>

        <div className="relative w-full max-w-[27rem]">
          <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-br from-indigo-300/40 via-cyan-glow/20 to-gold-300/30 blur-3xl" />
          <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="mb-6 lg:hidden"><Logo height={38} priority /></div>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
