"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Flame, LayoutGrid, List, Plus, Search, Sparkles, Upload, X } from "lucide-react";
import { api } from "@/lib/api";
import { useData } from "@/lib/auth";
import { STAGE_HEX, cap, dueLabel, fmtCompactMoney, fmtDate } from "@/lib/format";
import { useDebounced, useLoad } from "@/lib/hooks";
import type { LeadRow } from "@/lib/types";
import { AddLeadModal, StageModal } from "@/components/LeadModals";
import { Avatar } from "@/components/fx/effects";
import { Button, Card, Empty, ErrorNote, Input, PageHeader, PriorityBadge, Select, Skeleton, StageBadge, Tip } from "@/components/ui";

function DueText({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-slate-300">None</span>;
  const { text, tone } = dueLabel(iso);
  const style = tone === "overdue" ? "bg-rose-50 text-rose-600" : tone === "today" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{text}</span>;
}

/** Eight small segments showing how far along the pipeline a lead is. */
function MiniProgress({ position, stage }: { position: number; stage: string }) {
  const lost = stage === "lost";
  return (
    <div className="flex gap-[3px]" aria-label={`Stage ${position} of 8`}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="h-1.5 w-3 rounded-full" style={{ background: i < position ? (lost ? "#f43f5e" : STAGE_HEX[stage]) : "#e2e8f5", opacity: i < position ? 0.35 + (i / 8) * 0.65 : 1 }} />
      ))}
    </div>
  );
}

export default function LeadsPage() {
  const { lookups, users } = useData();
  const router = useRouter();
  const [view, setView] = useState<"list" | "board">("list");
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [owner, setOwner] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [mine, setMine] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [moving, setMoving] = useState<{ lead: LeadRow; stageId: number } | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<number | null>(null);
  const search = useDebounced(q);

  // opened from the command palette
  useEffect(() => {
    const open = () => {
      if (sessionStorage.getItem("crm-open-add")) {
        sessionStorage.removeItem("crm-open-add");
        setAddOpen(true);
      }
    };
    open();
    window.addEventListener("crm:add-lead", open);
    return () => window.removeEventListener("crm:add-lead", open);
  }, []);

  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (stage) params.set("stage_id", stage);
  if (owner) params.set("assigned_to", owner);
  if (source) params.set("source_id", source);
  if (priority) params.set("priority", priority);
  if (mine) params.set("mine", "1");

  const { data, loading, error, reload } = useLoad(() => api.get<{ leads: LeadRow[] }>(`/leads?${params}`), [search, stage, owner, source, priority, mine]);
  const leads = data?.leads ?? [];

  function onDrop(stageId: number) {
    const lead = leads.find((l) => l.id === dragId);
    setDragId(null);
    setOverStage(null);
    if (lead && lead.stage_id !== stageId) setMoving({ lead, stageId });
  }

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={loading && !data ? "Loading your pipeline…" : `${leads.length} lead${leads.length === 1 ? "" : "s"} in view`}
        actions={
          <>
            <Link href="/import"><Button variant="secondary"><Upload className="h-4 w-4" /> Import</Button></Link>
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add lead</Button>
          </>
        }
      />

      <Tip id="leads" title="Two ways to see your pipeline">
        Use <strong>List</strong> to scan and filter, or <strong>Board</strong> to drag a lead card to the next stage. Click any lead to log calls, set follow-ups and track prototype rounds.
      </Tip>

      <div className="glass animate-fade-up mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl p-3" style={{ animationDelay: "0.08s" }}>
        <div className="group relative min-w-[240px] flex-1 sm:max-w-md">
          <span className="pointer-events-none absolute left-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-500 transition-colors group-focus-within:bg-gradient-to-br group-focus-within:from-indigo-600 group-focus-within:to-cyan-glow group-focus-within:text-white"><Search className="h-4 w-4" /></span>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a company, person, phone or email" className="!rounded-2xl !py-3 pl-12 pr-10" />
          {q && <button onClick={() => setQ("")} aria-label="Clear search" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
        <Select value={stage} onChange={(e) => setStage(e.target.value)} className="w-auto" aria-label="Stage">
          <option value="">All stages</option>
          {lookups?.stages.map((s) => <option key={s.id} value={s.id}>{cap(s.name)}</option>)}
        </Select>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-auto" aria-label="Owner">
          <option value="">All owners</option>
          {users.filter((u) => u.is_active).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </Select>
        <Select value={source} onChange={(e) => setSource(e.target.value)} className="w-auto" aria-label="Source">
          <option value="">All sources</option>
          {lookups?.lead_sources.map((s) => <option key={s.id} value={s.id}>{cap(s.name)}</option>)}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-auto" aria-label="Priority">
          <option value="">Any priority</option>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </Select>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-900/5">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /> Mine only
        </label>
        <div className="ml-auto flex rounded-xl bg-slate-100/80 p-1">
          {([["list", List, "List"], ["board", LayoutGrid, "Board"]] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setView(id)} className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${view === id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorNote message={error} />}
      {loading && !data ? (
        <div className="space-y-3">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : leads.length === 0 ? (
        <Card><Empty icon={<Sparkles className="h-7 w-7" />} title="No leads match" hint="Try clearing the filters, or add your first lead to start the pipeline." action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add lead</Button>} /></Card>
      ) : view === "list" ? (
        <Card padded={false} className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200/70 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <tr>{["Company", "Stage", "Progress", "Owner", "Source", "Budget", "Next follow-up", "Added"].map((h) => <th key={h} className="px-5 py-3.5">{h}</th>)}</tr>
              </thead>
              <tbody className="stagger">
                {leads.map((l) => (
                  <tr key={l.id} onClick={() => router.push(`/leads/${l.id}`)} className="group cursor-pointer border-b border-slate-100/80 transition-colors last:border-0 hover:bg-indigo-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={l.company} size={40} className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-indigo-700">{l.company}{l.priority === "high" && <Flame className="h-3.5 w-3.5 text-rose-500" aria-label="High priority" />}</p>
                          <p className="truncate text-xs text-slate-500">{[l.contact_name, l.phone].filter(Boolean).join(" · ") || "No contact yet"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StageBadge name={l.stage} /></td>
                    <td className="px-5 py-3.5"><MiniProgress position={l.stage_position} stage={l.stage} /></td>
                    <td className="px-5 py-3.5">
                      {l.assigned_name ? <span className="flex items-center gap-2 text-slate-700"><Avatar name={l.assigned_name} size={24} />{l.assigned_name.split(" ")[0]}</span> : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3.5 capitalize text-slate-600">{l.source ?? "—"}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{fmtCompactMoney(l.estimated_budget)}</td>
                    <td className="px-5 py-3.5"><DueText iso={l.next_follow_up} /></td>
                    <td className="px-5 py-3.5 text-slate-500">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="stagger -mx-1 flex gap-4 overflow-x-auto px-1 pb-6">
          {lookups?.stages.map((s) => {
            const column = leads.filter((l) => l.stage_id === s.id);
            const total = column.reduce((sum, l) => sum + (l.estimated_budget ?? 0), 0);
            return (
              <div
                key={s.id}
                onDragOver={(e) => { e.preventDefault(); setOverStage(s.id); }}
                onDragLeave={() => setOverStage((c) => (c === s.id ? null : c))}
                onDrop={() => onDrop(s.id)}
                className={`w-72 shrink-0 rounded-2xl p-2.5 transition-all duration-200 ${overStage === s.id ? "scale-[1.015] bg-indigo-100/70 ring-2 ring-indigo-400 shadow-glow" : "bg-white/50 ring-1 ring-white/70 backdrop-blur"}`}
              >
                <div className="mb-3 rounded-xl bg-white/80 px-3 py-2.5 shadow-sm" style={{ borderTop: `3px solid ${STAGE_HEX[s.name]}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">{cap(s.name)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{column.length}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{fmtCompactMoney(total)}</p>
                </div>
                <div className="space-y-2.5">
                  {column.map((l) => (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={() => setDragId(l.id)}
                      onDragEnd={() => { setDragId(null); setOverStage(null); }}
                      className={`group cursor-grab rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/70 transition-all duration-200 hover:-translate-y-1 hover:shadow-lift active:cursor-grabbing ${dragId === l.id ? "rotate-2 opacity-40" : ""}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={l.company} size={32} />
                        <Link href={`/leads/${l.id}`} className="min-w-0 truncate text-sm font-bold text-slate-900 hover:text-indigo-600">{l.company}</Link>
                        {l.priority === "high" && <Flame className="ml-auto h-4 w-4 shrink-0 text-rose-500" aria-label="High priority" />}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{l.project_summary ?? l.contact_name ?? "No description yet"}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-500">{l.assigned_name && <Avatar name={l.assigned_name} size={20} />}{l.assigned_name?.split(" ")[0] ?? "—"}</span>
                        <span className="font-bold text-slate-800">{fmtCompactMoney(l.estimated_budget)}</span>
                      </div>
                      {l.next_follow_up && <div className="mt-2.5"><DueText iso={l.next_follow_up} /></div>}
                    </div>
                  ))}
                  {column.length === 0 && <p className="rounded-xl border-2 border-dashed border-slate-200 px-2 py-8 text-center text-xs text-slate-400">Drop a lead here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={reload} />
      {moving && <StageModal lead={moving.lead} targetStageId={moving.stageId} onClose={() => setMoving(null)} onDone={reload} />}
    </>
  );
}
