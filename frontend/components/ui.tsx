"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ChevronDown, Inbox, Lightbulb, Loader2, X, XCircle } from "lucide-react";
import { PRIORITY_COLORS, STAGE_COLORS, STAGE_HEX, cap } from "@/lib/format";
import { BrandLoader } from "./fx/effects";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* ---------- buttons ---------- */
type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-glow shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-8px_rgb(21_88_224/0.7)] active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0",
  secondary:
    "bg-white/80 text-slate-700 ring-1 ring-inset ring-slate-300/90 backdrop-blur hover:bg-white hover:ring-indigo-300 hover:text-indigo-700 active:scale-[0.98] disabled:opacity-50",
  ghost: "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 active:scale-[0.98] disabled:opacity-40",
  danger:
    "bg-gradient-to-br from-rose-600 to-rose-500 text-white shadow-[0_10px_30px_-10px_rgb(225_29_72/0.6)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- form fields ---------- */
const fieldBase =
  "block w-full rounded-xl border-0 bg-white/80 px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300/90 transition-all duration-200 placeholder:text-slate-400 hover:ring-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:shadow-[0_0_0_5px_rgb(47_115_245/0.12)] disabled:bg-slate-100 disabled:text-slate-400";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  // suppressHydrationWarning: browser extensions (email fillers, password managers) add attributes to inputs
  return <input suppressHydrationWarning {...rest} className={cx(fieldBase, className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...rest} className={cx(fieldBase, "cursor-pointer appearance-none pr-9", className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </span>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(fieldBase, "min-h-[88px] resize-y", className)} />;
}

/* ---------- layout pieces ---------- */
export function Card({ title, actions, children, className, padded = true, hover }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean; hover?: boolean }) {
  return (
    <section className={cx("glass min-w-0 rounded-2xl", hover && "hover-lift", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/60 px-5 py-3.5">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-cyan-glow" />
            {title}
          </h2>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="animate-fade-up mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

/** A short, dismissible hint at the top of a page. Once closed it stays closed on this computer. */
export function Tip({ id, title, children, icon }: { id: string; title: string; children: ReactNode; icon?: ReactNode }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(`crm-tip-${id}`) === "1");
    } catch {
      setHidden(false);
    }
  }, [id]);
  if (hidden) return null;
  return (
    <div className="animate-fade-up relative mb-6 flex items-start gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-cyan-glow/10 p-4 pr-12 ring-1 ring-indigo-100">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-md">{icon ?? <Lightbulb className="h-5 w-5" />}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <div className="mt-0.5 text-sm leading-relaxed text-slate-600">{children}</div>
      </div>
      <button
        onClick={() => {
          setHidden(true);
          try { localStorage.setItem(`crm-tip-${id}`, "1"); } catch { /* storage unavailable: tip just returns next visit */ }
        }}
        aria-label="Hide this tip"
        className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", className)}>{children}</span>;
}

export const StageBadge = ({ name }: { name: string }) => (
  <Badge className={STAGE_COLORS[name] ?? STAGE_COLORS["new lead"]}>
    <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_HEX[name] ?? "#94a3b8" }} />
    {cap(name)}
  </Badge>
);

export const PriorityBadge = ({ value }: { value: string | null }) =>
  value ? (
    <Badge className={PRIORITY_COLORS[value]}>{cap(value)} priority</Badge>
  ) : null;

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid place-items-center py-24 animate-fade-in">
      <BrandLoader size={84} label={`${label}…`} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("shimmer rounded-xl", className)} />;
}

export function Empty({ title, hint, action, icon }: { title: string; hint?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="animate-fade-up flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-50 to-white text-indigo-500 ring-1 ring-indigo-100">
        <span className="absolute inset-0 animate-pulse-glow rounded-2xl" />
        {icon ?? <Inbox className="h-7 w-7" />}
      </span>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="animate-scale-in rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{message}</p>;
}

/* ---------- tabs with a sliding highlight ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number; icon?: ReactNode }[]; value: T; onChange: (id: T) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const active = track.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    if (active) setPill({ left: active.offsetLeft, width: active.offsetWidth, ready: true });
  }, [value, tabs.length]);

  return (
    <div className="overflow-x-auto px-3 pt-3">
      <div ref={track} className="relative inline-flex min-w-full gap-1 rounded-xl bg-slate-100/80 p-1 sm:min-w-0">
        <span className="absolute inset-y-1 rounded-lg bg-white shadow-[0_2px_8px_-2px_rgb(15_26_61/0.18)] ring-1 ring-slate-200/70" style={{ left: pill.left, width: pill.width, transition: pill.ready ? "left 0.35s cubic-bezier(0.3, 0.9, 0.3, 1), width 0.35s cubic-bezier(0.3, 0.9, 0.3, 1)" : "none" }} />
        {tabs.map((t) => (
          <button
            key={t.id}
            data-tab={t.id}
            onClick={() => onChange(t.id)}
            className={cx("relative z-10 flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", value === t.id ? "text-indigo-700" : "text-slate-500 hover:text-slate-800")}
          >
            {t.icon}
            {t.label}
            {t.count ? <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[11px] font-bold text-indigo-700">{t.count}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- modal ---------- */
export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  // Rendered on <body> so a blurred or animated parent card can never trap or clip the dialog.
  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm sm:py-14" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx("glass-strong animate-scale-in w-full overflow-hidden rounded-3xl", wide ? "max-w-2xl" : "max-w-lg")}>
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-cyan-glow to-gold-400" />
        <header className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-4 px-6 pb-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-200/70 bg-slate-50/60 px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- toasts ---------- */
interface Toast {
  id: number;
  message: string;
  kind: "success" | "error";
}
const ToastContext = createContext<(message: string, kind?: Toast["kind"]) => void>(() => undefined);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[260] flex flex-col gap-2.5" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="animate-slide-in pointer-events-auto relative flex max-w-sm items-start gap-3 overflow-hidden rounded-2xl bg-slate-900/95 px-4 py-3.5 text-sm font-medium text-white shadow-[0_20px_50px_-12px_rgb(8_15_42/0.6)] backdrop-blur">
            {t.kind === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />}
            {t.message}
            <span className={cx("absolute bottom-0 left-0 h-0.5 w-full origin-left animate-[grow_4.2s_linear_reverse_forwards]", t.kind === "success" ? "bg-emerald-400" : "bg-rose-400")} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
