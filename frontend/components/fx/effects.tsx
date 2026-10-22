"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* ---------- fade + rise when scrolled into view ---------- */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------- numbers that count up ---------- */
export function CountUp({ value, format, duration = 1300, className }: { value: number; format?: (n: number) => string; duration?: number; className?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const base = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(base + (value - base) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const n = Number.isInteger(value) ? Math.round(shown) : Math.round(shown * 10) / 10;
  return <span className={className}>{format ? format(shown) : n.toLocaleString("en-IN")}</span>;
}

/* ---------- 3D tilt that follows the pointer, with a moving highlight ---------- */
export function Tilt({ children, max = 7, className = "", style }: { children: ReactNode; max?: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max * 1.4}deg) translateZ(0)`;
    if (glare.current) {
      glare.current.style.opacity = "1";
      glare.current.style.background = `radial-gradient(260px circle at ${px * 100}% ${py * 100}%, rgb(255 255 255 / 0.55), transparent 60%)`;
    }
  }
  function leave() {
    if (ref.current) ref.current.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
    if (glare.current) glare.current.style.opacity = "0";
  }
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`${/\babsolute\b/.test(className) ? "" : "relative"} transition-transform duration-300 ease-out will-change-transform ${className}`} style={{ transformStyle: "preserve-3d", ...style }}>
      {children}
      <div ref={glare} aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300" />
    </div>
  );
}

/* ---------- initials avatar with a colour picked from the name ---------- */
const GRADIENTS = [
  "from-indigo-500 to-cyan-glow",
  "from-indigo-700 to-indigo-400",
  "from-gold-500 to-gold-300",
  "from-cyan-glow to-indigo-300",
  "from-indigo-900 to-indigo-500",
  "from-indigo-600 to-gold-400",
];
export function Avatar({ name, size = 36, className = "", ring = false }: { name: string; size?: number; className?: string; ring?: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-xl bg-gradient-to-br ${GRADIENTS[hash % GRADIENTS.length]} font-semibold text-white shadow-sm ${ring ? "ring-2 ring-white" : ""} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

/* ---------- a branded loader: an infinity loop that draws itself ---------- */
export function BrandLoader({ size = 64, label }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-label={label ?? "Loading"}>
      <svg width={size} height={size * 0.5} viewBox="0 0 120 60" fill="none">
        <defs>
          <linearGradient id="bl-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1558e0" />
            <stop offset="0.6" stopColor="#19b5ff" />
            <stop offset="1" stopColor="#f4a90a" />
          </linearGradient>
        </defs>
        <path d="M60 30C48 10 14 10 14 30s34 20 46 0c12-20 46-20 46 0s-34 20-46 0Z" stroke="rgb(21 88 224 / 0.15)" strokeWidth="6" strokeLinecap="round" />
        <path d="M60 30C48 10 14 10 14 30s34 20 46 0c12-20 46-20 46 0s-34 20-46 0Z" stroke="url(#bl-g)" strokeWidth="6" strokeLinecap="round" strokeDasharray="200 200" className="animate-draw" style={{ strokeDashoffset: 400 }} />
      </svg>
      {label && <p className="text-sm text-slate-400">{label}</p>}
    </div>
  );
}

/* ---------- confetti for a won deal ---------- */
export function fireConfetti() {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200";
  document.body.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();
  const colors = ["#1558e0", "#2f73f5", "#19b5ff", "#5b97ff", "#f4a90a", "#ffd37a", "#0e2a6b"];
  const parts = Array.from({ length: 170 }, (_, i) => {
    const fromLeft = i % 2 === 0;
    return {
      x: (fromLeft ? 0.1 : 0.9) * canvas.width,
      y: canvas.height * 0.75,
      vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9) * dpr,
      vy: -(11 + Math.random() * 13) * dpr,
      size: (5 + Math.random() * 7) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: colors[(Math.random() * colors.length) | 0],
      round: Math.random() > 0.7,
    };
  });
  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.vy += 0.38 * dpr;
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 3200);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.restore();
    });
    if (t < 3300) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
