"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Check, CircleDot, Code, GitBranch, Layers, Lock, Megaphone, MessagesSquare, Pencil, PhoneCall, Plus, Search, ThumbsDown, Trash2, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth, useData } from "@/lib/auth";
import { STAGE_HEX, cap, fmtDate, roleLabel } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import { Button, Empty, Input, PageHeader, Skeleton, useToast } from "@/components/ui";

type ListKey = "lead_sources" | "lost_reasons" | "call_outcomes" | "activity_types" | "revision_types" | "revision_statuses" | "tech_stacks";
interface Item { id: number; name: string; created_at: string; used: number }
interface Settings extends Record<ListKey, Item[]> {
  stages: { id: number; name: string; position: number; owner_role: string | null }[];
}

const LISTS: { key: ListKey; title: string; blurb: string; used: string; icon: ComponentType<{ className?: string }>; tone: string }[] = [
  { key: "lead_sources", title: "Lead sources", blurb: "Where your leads come from. Shown when adding a lead and in the dashboard's source chart.", used: "leads", icon: Megaphone, tone: "from-indigo-600 to-cyan-glow" },
  { key: "lost_reasons", title: "Lost reasons", blurb: "Why a deal was lost. Required when a lead is moved to Lost, and charted on the dashboard.", used: "lost leads", icon: ThumbsDown, tone: "from-rose-600 to-rose-400" },
  { key: "call_outcomes", title: "Call outcomes", blurb: "How a call ended, picked when you log a call.", used: "calls", icon: PhoneCall, tone: "from-emerald-600 to-emerald-300" },
  { key: "activity_types", title: "Activity types", blurb: "The kinds of contact you can log on a lead, such as call, WhatsApp, email or note.", used: "activities", icon: MessagesSquare, tone: "from-indigo-800 to-indigo-400" },
  { key: "revision_types", title: "Prototype round types", blurb: "What a prototype round is about, for example an initial prototype or a change request.", used: "rounds", icon: GitBranch, tone: "from-violet-600 to-violet-400" },
  { key: "revision_statuses", title: "Prototype round statuses", blurb: "Where a round stands, from planned through presented to approved.", used: "rounds", icon: CircleDot, tone: "from-gold-500 to-gold-300" },
  { key: "tech_stacks", title: "Tech stacks", blurb: "Technologies offered in the Requirements form, so you can see what clients ask for.", used: "requirements", icon: Code, tone: "from-cyan-glow to-indigo-500" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { reload: reloadShared } = useData();
  const router = useRouter();
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get<Settings>("/settings/lists"), []);
  const [active, setActive] = useState<ListKey | "stages">("lead_sources");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/leads");
  }, [user, router]);
  useEffect(() => {
    setDraft("");
    setEditing(null);
    setFilter("");
  }, [active]);

  const meta = LISTS.find((l) => l.key === active);
  const items = useMemo(() => (active === "stages" || !data ? [] : data[active]), [data, active]);
  const shown = filter ? items.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase())) : items;

  async function run(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await fn();
      toast(message);
      await Promise.all([reload(), reloadShared()]);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const add = () => draft.trim() && run(async () => { await api.post(`/lookups/${active}`, { name: draft }); setDraft(""); }, "Value added");
  const rename = () => editing && editing.name.trim() && run(async () => { await api.patch(`/lookups/${active}/${editing.id}`, { name: editing.name }); setEditing(null); }, "Renamed everywhere");
  const remove = (item: Item) => confirm(`Delete "${item.name}"?`) && run(() => api.del(`/lookups/${active}/${item.id}`), "Value deleted");

  if (!user || user.role !== "admin") return null;

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage the dropdown lists your team picks from. Changes apply everywhere straight away." />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* categories */}
        <nav aria-label="Lists" className="glass stagger h-fit space-y-1 rounded-2xl p-2 lg:sticky lg:top-24">
          {LISTS.map((l) => {
            const on = active === l.key;
            return (
              <button key={l.key} onClick={() => setActive(l.key)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${on ? "bg-white shadow-md ring-1 ring-indigo-200" : "hover:bg-white/70"}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${l.tone} text-white shadow-md transition-transform group-hover:scale-105`}><l.icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-bold ${on ? "text-indigo-800" : "text-slate-800"}`}>{l.title}</span>
                  <span className="block text-xs text-slate-400">{data ? `${data[l.key].length} value${data[l.key].length === 1 ? "" : "s"}` : "…"}</span>
                </span>
                {on && <span className="h-6 w-1 rounded-full bg-brand-gradient" />}
              </button>
            );
          })}
          <div className="my-1 h-px bg-slate-200/70" />
          <button onClick={() => setActive("stages")} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${active === "stages" ? "bg-white shadow-md ring-1 ring-indigo-200" : "hover:bg-white/70"}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-500 text-white shadow-md"><Layers className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">Pipeline stages</span><span className="flex items-center gap-1 text-xs text-slate-400"><Lock className="h-3 w-3" /> Fixed, view only</span></span>
          </button>
        </nav>

        {/* values */}
        <section className="glass-strong min-w-0 rounded-3xl">
          {loading && !data ? (
            <div className="space-y-3 p-6"><Skeleton className="h-16" /><Skeleton className="h-12" /><Skeleton className="h-40" /></div>
          ) : active === "stages" ? (
            <div key="stages" className="page-enter p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-500 text-white shadow-lg"><Layers className="h-7 w-7" /></span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Pipeline stages</h2>
                  <p className="mt-1 max-w-xl text-sm text-slate-500">The path every lead follows. Each stage has an owner role, and a lead is handed to that role automatically when it enters the stage. These are fixed so handovers and reports stay reliable.</p>
                </div>
              </div>
              <ol className="mt-8 space-y-3">
                {data?.stages.map((s) => (
                  <li key={s.id} className="flex items-center gap-4 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-md" style={{ background: STAGE_HEX[s.name] }}>{s.position}</span>
                    <span className="flex-1 text-sm font-bold text-slate-800">{cap(s.name)}</span>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">{["won", "lost"].includes(s.name) ? "Closed" : roleLabel(s.owner_role)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : meta ? (
            <div key={active} className="page-enter">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/60 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${meta.tone} text-white shadow-lg`}><meta.icon className="h-7 w-7" /></span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{meta.title}</h2>
                    <p className="mt-1 max-w-xl text-sm text-slate-500">{meta.blurb}</p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">{items.length} value{items.length === 1 ? "" : "s"}</span>
              </header>

              {/* add */}
              <div className="border-b border-slate-200/60 bg-slate-50/50 p-6 sm:px-8">
                <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex flex-wrap gap-3">
                  <div className="relative min-w-[220px] flex-1">
                    <Plus className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-indigo-400" />
                    <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Add a new ${meta.title.toLowerCase().replace(/s$/, "")}…`} className="!rounded-2xl pl-10" />
                  </div>
                  <Button type="submit" loading={busy} disabled={!draft.trim()} className="!rounded-2xl px-6">Add value</Button>
                </form>
              </div>

              <div className="p-6 sm:p-8">
                {items.length > 8 && (
                  <div className="relative mb-5 max-w-xs">
                    <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter values" className="pl-10" />
                  </div>
                )}
                {shown.length === 0 ? (
                  <Empty title={filter ? "No value matches" : "Nothing here yet"} hint={filter ? "Try a different word." : "Add your first value above."} />
                ) : (
                  <ul className="stagger grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    {shown.map((item) => (
                      <li key={item.id} className="group relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                        {editing?.id === item.id ? (
                          <form onSubmit={(e) => { e.preventDefault(); rename(); }} className="flex items-center gap-2">
                            <Input value={editing.name} onChange={(e) => setEditing({ id: item.id, name: e.target.value })} autoFocus onKeyDown={(e) => e.key === "Escape" && setEditing(null)} />
                            <button type="submit" aria-label="Save" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Check className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setEditing(null)} aria-label="Cancel" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 break-words text-sm font-bold text-slate-900">{item.name}</p>
                              <div className="flex shrink-0 gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                                <button onClick={() => setEditing({ id: item.id, name: item.name })} aria-label={`Rename ${item.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                                <button onClick={() => remove(item)} disabled={item.used > 0} title={item.used > 0 ? "Already used, so it can only be renamed" : "Delete"} aria-label={`Delete ${item.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className={`rounded-full px-2.5 py-1 font-semibold ${item.used ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>{item.used ? `Used in ${item.used} ${meta.used}` : "Not used yet"}</span>
                              <span className="text-slate-400">Added {fmtDate(item.created_at)}</span>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
