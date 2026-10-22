"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/* Where the infinity mark sits inside logo-layer-mark.png (fractions of the 1812x310 image). */
const MARK = { cx: 0.2086, cy: 0.5, w: 0.4084 };

interface IntroApi {
  /** Play the logo animation once, then continue to `next`. */
  play: (next: string) => void;
}
const IntroContext = createContext<IntroApi>({ play: () => undefined });
export const useIntro = () => useContext(IntroContext);

export function IntroProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const play = useCallback((next: string) => setTarget((cur) => cur ?? next), []);
  return (
    <IntroContext.Provider value={{ play }}>
      {children}
      {target && <LogoIntro onNavigate={() => router.push(target)} onDone={() => setTarget(null)} />}
    </IntroContext.Provider>
  );
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const COLORS = ["#0e2a6b", "#1558e0", "#2f73f5", "#5b97ff", "#19b5ff", "#1558e0", "#2f73f5", "#f4a90a"];

function LogoIntro({ onNavigate, onDone }: { onNavigate: () => void; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"run" | "out">("run");
  const [reduce] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const navigated = useRef(false);
  const timers = useRef<number[]>([]);

  const finish = useCallback(() => {
    if (!navigated.current) {
      navigated.current = true;
      onNavigate();
    }
    setPhase("out");
    timers.current.push(window.setTimeout(onDone, 750));
  }, [onNavigate, onDone]);

  // timeline
  useEffect(() => {
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    if (reduce) {
      at(900, finish);
    } else {
      at(4000, () => {
        if (!navigated.current) {
          navigated.current = true;
          onNavigate(); // the next page loads underneath while the logo is still on screen
        }
      });
      at(4700, finish);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    const stored = timers.current;
    return () => {
      stored.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // particles that fly in and form the infinity mark
  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;

    const r = box.getBoundingClientRect();
    const cx = r.left + r.width * MARK.cx;
    const cy = r.top + r.height * MARK.cy;
    const a = (r.width * MARK.w * 0.5) * 0.97;
    const yScale = 1.16;

    const N = 1700;
    const reach = Math.max(vw, vh) * 0.8;
    const parts = Array.from({ length: N }, () => {
      const t = rand(0, Math.PI * 2);
      const s = 1 + Math.sin(t) ** 2;
      const jitter = a * 0.03;
      const tx = cx + (a * Math.cos(t)) / s + rand(-jitter, jitter);
      const ty = cy + ((a * Math.sin(t) * Math.cos(t)) / s) * yScale + rand(-jitter, jitter);
      const ang = rand(0, Math.PI * 2);
      const dist = reach * rand(0.45, 1);
      const sx = cx + Math.cos(ang) * dist;
      const sy = cy + Math.sin(ang) * dist * 0.7;
      const mx = (sx + tx) / 2 + rand(-1, 1) * vw * 0.18;
      const my = (sy + ty) / 2 + rand(-1, 1) * vh * 0.18;
      return { sx, sy, tx, ty, mx, my, delay: rand(0, 0.7), size: rand(1.6, 4.6), color: COLORS[(Math.random() * COLORS.length) | 0], phase: rand(0, 6.28) };
    });

    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      const fade = t < 2.4 ? 1 : Math.max(0, 1 - (t - 2.4) / 0.85); // hand over to the real logo
      if (fade <= 0) return;
      for (const p of parts) {
        const raw = Math.min(1, Math.max(0, (t - p.delay) / 1.8));
        const e = easeInOutCubic(raw);
        const u = 1 - e;
        const x = u * u * p.sx + 2 * u * e * p.mx + e * e * p.tx;
        const y = u * u * p.sy + 2 * u * e * p.my + e * e * p.ty;
        const twinkle = raw >= 1 ? 0.75 + 0.25 * Math.sin(t * 6 + p.phase) : 1;
        ctx.globalAlpha = Math.min(1, raw * 3 + 0.05) * fade * twinkle;
        ctx.fillStyle = p.color;
        const s = p.size * (0.6 + 0.4 * e);
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <div
      className={`fixed inset-0 z-[300] grid place-items-center overflow-hidden transition-all duration-700 ease-out ${phase === "out" ? "pointer-events-none scale-[1.04] opacity-0 blur-sm" : "opacity-100"}`}
      style={{ background: "radial-gradient(900px 520px at 50% 48%, #ffffff 0%, #f1f6ff 55%, #e4eeff 100%)" }}
      onClick={finish}
      role="presentation"
    >
      <div className="dot-grid absolute inset-0 opacity-60" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* the real logo: mark fades in as the particles settle, the word is wiped in after it */}
      <div ref={boxRef} className="relative" style={{ width: "min(760px, 86vw)", aspectRatio: "1812 / 310" }}>
        {!reduce && (
          <>
            <span className="intro-glow pointer-events-none absolute rounded-full" style={{ left: `${MARK.cx * 100}%`, top: "50%", width: "58%", aspectRatio: "1", translate: "-50% -50%" }} />
            <span className="intro-ring pointer-events-none absolute rounded-full border-2 border-indigo-400/60" style={{ left: `${MARK.cx * 100}%`, top: "50%", width: "40%", aspectRatio: "1", translate: "-50% -50%" }} />
          </>
        )}
        <Image src="/logo-layer-mark.png" alt="" width={1812} height={310} priority className={`absolute inset-0 h-full w-full ${reduce ? "" : "intro-mark"}`} />
        <Image src="/logo-layer-word.png" alt="Infinyty" width={1812} height={310} priority className={`absolute inset-0 h-full w-full ${reduce ? "" : "intro-word"}`} />
        <p className="intro-tag absolute left-0 right-0 top-full mt-8 text-center text-[11px] font-medium uppercase tracking-[0.42em] text-indigo-700/70 sm:text-xs">Every lead. One infinite possibility.</p>
      </div>

      <p className="absolute bottom-6 text-xs text-slate-400">Click anywhere to skip</p>

      <style>{`
        .intro-mark { opacity: 0; transform: scale(.94); filter: blur(14px); animation: intro-mark 1.7s cubic-bezier(.2,.8,.2,1) 2s forwards; }
        .intro-word { clip-path: inset(0 100% 0 0); transform: translateX(-14px); animation: intro-word 1.1s cubic-bezier(.65,0,.2,1) 2.9s forwards; }
        .intro-glow { background: radial-gradient(circle, rgb(25 181 255 / .45), rgb(21 88 224 / .15) 45%, transparent 70%); opacity: 0; animation: intro-glow 2.4s ease-out 1.9s forwards; }
        .intro-ring { opacity: 0; animation: intro-ring 2.1s cubic-bezier(.2,.7,.2,1) 1.95s forwards; }
        .intro-tag { opacity: 0; animation: fade-in 1s ease 3.4s forwards; }
        @keyframes intro-mark { to { opacity: 1; transform: scale(1); filter: blur(0); } }
        @keyframes intro-word { to { clip-path: inset(0 0 0 0); transform: translateX(0); } }
        @keyframes intro-glow { 0% { opacity: 0; transform: scale(.3); } 35% { opacity: 1; } 100% { opacity: 0; transform: scale(1.5); } }
        @keyframes intro-ring { 0% { opacity: .9; transform: scale(.4); } 100% { opacity: 0; transform: scale(2.2); } }
      `}</style>
    </div>
  );
}
