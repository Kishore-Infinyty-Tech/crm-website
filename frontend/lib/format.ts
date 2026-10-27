const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
const moneyFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });

export const fmtDate = (v?: string | null) => (v ? dateFmt.format(new Date(v)) : "—");
export const fmtTime = (v?: string | null) => (v ? timeFmt.format(new Date(v)) : "");
export const fmtDateTime = (v?: string | null) => (v ? `${dateFmt.format(new Date(v))}, ${timeFmt.format(new Date(v))}` : "—");
export const fmtMoney = (v?: number | null) => (v == null ? "—" : moneyFmt.format(v));
export const fmtCompactMoney = (v?: number | null) => (v == null ? "—" : compactFmt.format(v));

/** "Overdue by 2 days", "Today, 4:30 PM", "In 3 days" */
export function dueLabel(iso: string): { text: string; tone: "overdue" | "today" | "soon" | "later" } {
  const due = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDiff = Math.floor((new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - startOfToday) / 86400000);
  if (due.getTime() < now.getTime()) {
    const days = Math.max(0, -dayDiff);
    return { text: days === 0 ? `Overdue, was ${fmtTime(iso)}` : `Overdue by ${days} day${days > 1 ? "s" : ""}`, tone: "overdue" };
  }
  if (dayDiff === 0) return { text: `Today, ${fmtTime(iso)}`, tone: "today" };
  if (dayDiff === 1) return { text: `Tomorrow, ${fmtTime(iso)}`, tone: "soon" };
  return { text: `${fmtDate(iso)}, ${fmtTime(iso)}`, tone: "later" };
}

/** Value for <input type="datetime-local"> in the browser's own time zone. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Convert a datetime-local value to an ISO string with the right UTC offset. */
export const fromLocalInput = (value: string) => new Date(value).toISOString();

export const STAGE_COLORS: Record<string, string> = {
  "new lead": "bg-slate-100 text-slate-700 ring-slate-200",
  "reaching out": "bg-sky-50 text-sky-700 ring-sky-200",
  qualified: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  prototype: "bg-violet-50 text-violet-700 ring-violet-200",
  quotation: "bg-amber-50 text-amber-700 ring-amber-200",
  negotiation: "bg-orange-50 text-orange-700 ring-orange-200",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lost: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const STAGE_HEX: Record<string, string> = {
  "new lead": "#94a3b8",
  "reaching out": "#0ea5e9",
  qualified: "#6366f1",
  prototype: "#8b5cf6",
  quotation: "#f59e0b",
  negotiation: "#f97316",
  won: "#10b981",
  lost: "#f43f5e",
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-50 text-slate-600 ring-slate-200",
};

export const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

/** How a role is shown to people. The short keys (admin, technical_analyst, business_development_executive) never appear on screen. */
export const ROLE_LABELS: Record<string, string> = {
  admin: "CRM Administrator",
  technical_analyst: "Technical Analyst",
  business_development_executive: "Business Development Executive",
};
export const roleLabel = (role?: string | null) => (role ? ROLE_LABELS[role] ?? cap(role) : "");
