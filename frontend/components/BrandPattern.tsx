/**
 * A quiet decoration for dark navy surfaces: a faint dot grid, two soft glows and an outlined
 * infinity loop. It stays low-contrast and sits behind the content so text always reads clearly.
 */
const LOOP = "M300 150C250 60 70 60 70 150s180 90 230 0c50-90 230-90 230 0s-180 90-230 0Z";

export function BrandPattern({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="dot-grid absolute inset-0 opacity-[0.09]" />
      <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-cyan-glow/15 blur-3xl" />
      <div className="absolute -bottom-36 -left-24 h-80 w-80 rounded-full bg-indigo-400/15 blur-3xl" />
      <svg viewBox="0 0 600 300" fill="none" className="absolute -right-24 top-1/2 h-[135%] -translate-y-1/2 text-white">
        {[1, 0.78, 0.58].map((s, i) => (
          <path key={s} d={LOOP} transform={`translate(${300 - 300 * s} ${150 - 150 * s}) scale(${s})`} stroke="currentColor" strokeWidth={i === 0 ? 1.6 : 1.2} opacity={0.1 - i * 0.025} />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
