"use client";

/**
 * Twinkling four-point stars and a slow light sweep for dark gradient banners.
 * Positions are fixed (not random) so server and browser always draw the same thing.
 * `side="right"` keeps most of the stars away from the text on the left.
 */
const STARS: { x: number; y: number; s: number; d: number; t: number; c: string }[] = [
  { x: 58, y: 14, s: 22, d: 0, t: 3.2, c: "#ffffff" },
  { x: 72, y: 30, s: 14, d: 0.9, t: 2.6, c: "#ffd37a" },
  { x: 84, y: 12, s: 18, d: 1.7, t: 3.8, c: "#7dd3fc" },
  { x: 91, y: 44, s: 24, d: 0.4, t: 3.4, c: "#ffffff" },
  { x: 66, y: 62, s: 12, d: 2.1, t: 2.8, c: "#ffffff" },
  { x: 80, y: 74, s: 20, d: 1.2, t: 3.6, c: "#ffd37a" },
  { x: 95, y: 82, s: 12, d: 2.6, t: 2.9, c: "#7dd3fc" },
  { x: 50, y: 84, s: 10, d: 0.6, t: 3.1, c: "#ffffff" },
  { x: 97, y: 18, s: 10, d: 1.5, t: 2.7, c: "#ffffff" },
  { x: 76, y: 52, s: 9, d: 2.9, t: 3.3, c: "#ffffff" },
  { x: 62, y: 38, s: 8, d: 1.9, t: 2.5, c: "#7dd3fc" },
  { x: 88, y: 62, s: 8, d: 0.2, t: 3.0, c: "#ffffff" },
];

const DOTS = Array.from({ length: 26 }, (_, i) => ({
  x: 40 + ((i * 37) % 58),
  y: 6 + ((i * 53) % 88),
  s: 2 + (i % 3),
  d: (i * 0.37) % 3,
  t: 2.4 + (i % 5) * 0.5,
}));

const STAR_PATH = "M12 0C12.6 6.6 17.4 11.4 24 12C17.4 12.6 12.6 17.4 12 24C11.4 17.4 6.6 12.6 0 12C6.6 11.4 11.4 6.6 12 0Z";

export function Sparkles({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* soft colour behind the stars */}
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-cyan-glow/25 blur-3xl" />
      <div className="absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />

      {/* a slow band of light sliding across */}
      <div className="sparkle-sheen absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      {DOTS.map((p, i) => (
        <span key={i} className="sparkle-dot absolute rounded-full bg-white" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, animationDelay: `${p.d}s`, animationDuration: `${p.t}s` }} />
      ))}

      {STARS.map((p, i) => (
        <svg key={i} viewBox="0 0 24 24" className="sparkle-star absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, animationDelay: `${p.d}s`, animationDuration: `${p.t}s`, filter: `drop-shadow(0 0 ${p.s / 2}px ${p.c})` }}>
          <path d={STAR_PATH} fill={p.c} />
        </svg>
      ))}

      <style>{`
        .sparkle-star { opacity: .15; transform: scale(.5) rotate(0deg); animation: sparkle-twinkle ease-in-out infinite; }
        .sparkle-dot { opacity: .1; animation: sparkle-dot ease-in-out infinite; }
        .sparkle-sheen { animation: sparkle-sheen 9s ease-in-out infinite; }
        @keyframes sparkle-twinkle { 0%, 100% { opacity: .15; transform: scale(.5) rotate(0deg); } 50% { opacity: 1; transform: scale(1) rotate(45deg); } }
        @keyframes sparkle-dot { 0%, 100% { opacity: .08; } 50% { opacity: .7; } }
        @keyframes sparkle-sheen { 0% { transform: translateX(0) skewX(-18deg); } 60%, 100% { transform: translateX(520%) skewX(-18deg); } }
      `}</style>
    </div>
  );
}
