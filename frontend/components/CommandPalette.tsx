"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CalendarDays, CornerDownLeft, FileUp, LayoutDashboard, Search, SlidersHorizontal, Sparkles, Target, UserPlus, UserRound, Users, Video, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDebounced } from "@/lib/hooks";
import type { LeadRow } from "@/lib/types";
import { StageBadge } from "./ui";
import { Avatar } from "./fx/effects";

type Group = "Leads" | "Quick actions" | "Go to";
interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: string;
  run: () => void;
  group: Group;
  right?: React.ReactNode;
}

const tile = (Icon: React.ComponentType<{ className?: string }>, tone: string) => ({ icon: <Icon className="h-[18px] w-[18px]" />, tone });

/** Open with Ctrl+K (or Cmd+K) or the search bar. Find a lead, jump to a page, or start an action. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [recent, setRecent] = useState<LeadRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useDebounced(q, 200);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIndex(0);
    setTimeout(() => input.current?.focus(), 30);
    api.get<{ leads: LeadRow[] }>("/leads").then((r) => setRecent(r.leads.slice(0, 4))).catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open || search.trim().length < 2) {
      setLeads([]);
      setSearching(false);
      return;
    }
    let alive = true;
    setSearching(true);
    api.get<{ leads: LeadRow[] }>(`/leads?q=${encodeURIComponent(search.trim())}`)
      .then((r) => alive && setLeads(r.leads.slice(0, 6)))
      .catch(() => undefined)
      .finally(() => alive && setSearching(false));
    return () => {
      alive = false;
    };
  }, [search, open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => router.push(href);
    const leadItem = (l: LeadRow): Item => ({
      id: `l-${l.id}`, label: l.company, hint: [l.contact_name, l.phone].filter(Boolean).join(" · ") || "Open lead",
      icon: <Avatar name={l.company} size={36} />, run: go(`/leads/${l.id}`), group: "Leads", right: <StageBadge name={l.stage} />,
    });
    const actions: Item[] = [
      { id: "a-lead", label: "New lead", hint: "Add one lead by hand", ...tile(UserPlus, "from-indigo-600 to-cyan-glow"), run: go("/import?tab=manual"), group: "Quick actions" },
      { id: "a-import", label: "Import leads", hint: "Upload Excel or paste from Sheets", ...tile(FileUp, "from-emerald-600 to-emerald-300"), run: go("/import?tab=bulk"), group: "Quick actions" },
      { id: "a-meet", label: "Schedule a meeting", hint: "One-off or repeating, with invites", ...tile(Video, "from-gold-500 to-gold-300"), group: "Quick actions", run: () => { sessionStorage.setItem("crm-open-meeting", "1"); router.push("/calendar"); window.dispatchEvent(new Event("crm:add-meeting")); } },
    ];
    const admin = user?.role === "admin";
    const pages: Item[] = [
      ...(admin ? [{ id: "p-dash", label: "Dashboard", hint: "Numbers and charts", ...tile(LayoutDashboard, "from-indigo-800 to-indigo-400"), run: go("/dashboard"), group: "Go to" as const }] : []),
      { id: "p-leads", label: "Leads", hint: "List and board", ...tile(Target, "from-indigo-600 to-indigo-400"), run: go("/leads"), group: "Go to" },
      { id: "p-fu", label: "Follow-ups", hint: "What to do today", ...tile(BellRing, "from-gold-500 to-gold-300"), run: go("/follow-ups"), group: "Go to" },
      { id: "p-cal", label: "Calendar", hint: "Meetings and invites", ...tile(CalendarDays, "from-cyan-glow to-indigo-500"), run: go("/calendar"), group: "Go to" },
      { id: "p-imp", label: "Add or import leads", hint: "Manual form, Excel, Sheets", ...tile(FileUp, "from-emerald-600 to-emerald-300"), run: go("/import"), group: "Go to" },
      ...(admin ? [
        { id: "p-team", label: "Team", hint: "People and roles", ...tile(Users, "from-violet-600 to-violet-400"), run: go("/team"), group: "Go to" as const },
        { id: "p-set", label: "Settings", hint: "Dropdown lists", ...tile(SlidersHorizontal, "from-slate-700 to-slate-500"), run: go("/settings"), group: "Go to" as const },
      ] : []),
      { id: "p-prof", label: "Profile & password", hint: "Your details and sign out", ...tile(UserRound, "from-slate-600 to-slate-400"), run: go("/profile"), group: "Go to" },
    ];
    const needle = q.trim().toLowerCase();
    const matching = [...actions, ...pages].filter((i) => !needle || `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(needle));
    const leadRows = needle.length >= 2 ? leads.map(leadItem) : recent.map(leadItem);
    return [...leadRows, ...matching];
  }, [leads, recent, q, router, user]);

  useEffect(() => setIndex(0), [q, leads]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && items[index]) {
      e.preventDefault();
      items[index].run();
      onClose();
    } else if (e.key === "Escape") onClose();
  }

  let lastGroup = "";
  const showingRecent = q.trim().length < 2;
  return (
    <div className="animate-fade-in fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/50 px-4 pt-[10vh] backdrop-blur-md" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Search" className="animate-scale-in w-full max-w-2xl overflow-hidden rounded-[1.75rem] bg-white shadow-[0_40px_100px_-20px_rgb(8_15_42/0.65)] ring-1 ring-white/60" onKeyDown={onKey}>
        {/* the search field */}
        <div className="relative border-b border-slate-200/80 bg-gradient-to-b from-indigo-50/70 to-white px-5 pb-4 pt-5">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-3 shadow-[0_0_0_1.5px_rgb(188_214_255)] transition-shadow focus-within:shadow-[0_0_0_2px_rgb(47_115_245),0_8px_30px_-8px_rgb(47_115_245/0.5)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-md">
              {searching ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Search className="h-5 w-5" />}
            </span>
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a company, person, phone or email…"
              aria-label="Search"
              className="h-14 w-full border-0 bg-transparent text-base font-medium text-slate-900 outline-none ring-0 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:outline-none"
              suppressHydrationWarning
            />
            {q ? (
              <button onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Clear" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
            ) : (
              <kbd className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">Esc</kbd>
            )}
          </div>
        </div>

        <ul ref={list} className="max-h-[55vh] overflow-y-auto px-3 py-2">
          {items.length === 0 && (
            <li className="px-4 py-12 text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Sparkles className="h-6 w-6" /></span>
              <p className="text-sm font-semibold text-slate-700">Nothing found for “{q}”</p>
              <p className="mt-1 text-xs text-slate-400">Try a company name, a person or a phone number.</p>
            </li>
          )}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? (it.group === "Leads" && showingRecent ? "Recent leads" : it.group) : null;
            lastGroup = it.group;
            const on = i === index;
            return (
              <li key={it.id} data-index={i}>
                {header && <p className="px-3 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{header}</p>}
                <button
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => { it.run(); onClose(); }}
                  className={`flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 ${on ? "bg-indigo-50 shadow-[inset_0_0_0_1.5px_rgb(188_214_255)]" : ""}`}
                >
                  {it.tone ? (
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${it.tone} text-white shadow-md transition-transform ${on ? "scale-105" : ""}`}>{it.icon}</span>
                  ) : (
                    <span className={`shrink-0 transition-transform ${on ? "scale-105" : ""}`}>{it.icon}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-bold ${on ? "text-indigo-900" : "text-slate-800"}`}>{it.label}</span>
                    {it.hint && <span className="block truncate text-xs text-slate-500">{it.hint}</span>}
                  </span>
                  {it.right}
                  {on && <CornerDownLeft className="h-4 w-4 shrink-0 text-indigo-400" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-5 py-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><kbd className="rounded bg-white px-1.5 py-0.5 font-bold shadow-sm ring-1 ring-slate-200">↑</kbd><kbd className="rounded bg-white px-1.5 py-0.5 font-bold shadow-sm ring-1 ring-slate-200">↓</kbd> to move</span>
            <span className="flex items-center gap-1.5"><kbd className="rounded bg-white px-1.5 py-0.5 font-bold shadow-sm ring-1 ring-slate-200">↵</kbd> to open</span>
          </span>
          <span className="hidden font-semibold text-indigo-500 sm:block">Infinyty search</span>
        </div>
      </div>
    </div>
  );
}
