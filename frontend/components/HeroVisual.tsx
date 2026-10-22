"use client";

import { BellRing, CheckCircle2, Target } from "lucide-react";
import { Tilt } from "./fx/effects";

/**
 * Home page picture: the team-around-the-dashboard illustration at /public/art/hero-illustration.webp.
 * To change it, replace that file. Its white background is blended away (multiply) so it sits directly
 * on the page's light gradient, and the edges fade out softly.
 */
const PICTURE = "/art/hero-illustration.webp";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[680px] lg:max-w-none">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-indigo-300/40 via-cyan-glow/20 to-gold-300/30 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-2xl" />

      <Tilt className="animate-float-slow" max={3}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PICTURE}
          alt="A team reviewing pipeline charts together"
          className="h-auto w-full select-none"
          draggable={false}
        />
      </Tilt>

      <Tilt className="absolute left-0 top-[8%] hidden w-60 sm:block" max={8}>
        <div className="glass-strong animate-float flex items-center gap-3 rounded-2xl p-3.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 text-white"><BellRing className="h-5 w-5" /></span>
          <div><p className="text-sm font-bold text-slate-900">Follow-up at 4:30 PM</p><p className="text-xs text-slate-500">Share the requirements form</p></div>
        </div>
      </Tilt>
      <Tilt className="absolute -right-2 top-[44%] hidden w-56 sm:block" max={8}>
        <div className="glass-strong animate-float flex items-center gap-3 rounded-2xl p-3.5" style={{ animationDelay: "-3s" }}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-300 text-white"><CheckCircle2 className="h-5 w-5" /></span>
          <div><p className="text-sm font-bold text-slate-900">Round 3 approved</p><p className="text-xs text-slate-500">Client signed off</p></div>
        </div>
      </Tilt>
      <Tilt className="absolute bottom-[2%] left-[6%] hidden w-52 sm:block" max={8}>
        <div className="glass-strong animate-float-slow flex items-center gap-3 rounded-2xl p-3.5" style={{ animationDelay: "-5s" }}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white"><Target className="h-5 w-5" /></span>
          <div><p className="text-sm font-bold text-slate-900">New lead</p><p className="text-xs text-slate-500">Acme Traders · ₹1.5L</p></div>
        </div>
      </Tilt>
    </div>
  );
}
