"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Download, ExternalLink, Mail, MessageCircle, Phone, Plus, StickyNote, Trash2, Video } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth, useData } from "@/lib/auth";
import { cap, dueLabel, fmtDate, fmtDateTime, fromLocalInput, toLocalInput } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import type { Activity, Attachment, Feature, FollowUp, HistoryRow, LeadDetail, Meeting, Requirements, Revision } from "@/lib/types";
import { MeetingModal } from "./MeetingModal";
import { Badge, Button, Empty, ErrorNote, Field, Input, Select, Spinner, Textarea, useToast } from "./ui";

const tomorrowAt10 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toLocalInput(d);
};

const TYPE_ICON: Record<string, typeof Phone> = { call: Phone, whatsapp: MessageCircle, email: Mail, note: StickyNote };

/* ================= Activity ================= */
export function ActivityTab({ lead, onChange }: { lead: LeadDetail; onChange: () => void }) {
  const { lookups, users } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get<{ activities: Activity[] }>(`/leads/${lead.id}/activities`), [lead.id]);
  const [typeId, setTypeId] = useState("");
  const [outcomeId, setOutcomeId] = useState("");
  const [contactId, setContactId] = useState("");
  const [summary, setSummary] = useState("");
  const [follow, setFollow] = useState(false);
  const [due, setDue] = useState(tomorrowAt10());
  const [purpose, setPurpose] = useState("");
  const [assignee, setAssignee] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const type = lookups?.activity_types.find((t) => String(t.id) === typeId);
  useEffect(() => {
    if (lookups && !typeId) setTypeId(String(lookups.activity_types.find((t) => t.name === "call")?.id ?? lookups.activity_types[0]?.id ?? ""));
  }, [lookups, typeId]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.post(`/leads/${lead.id}/activities`, {
        type_id: typeId,
        outcome_id: type?.name === "call" ? outcomeId || null : null,
        contact_id: contactId || null,
        summary,
        follow_up: follow ? { due_at: fromLocalInput(due), purpose, assigned_to: assignee || user?.id } : null,
      });
      toast(follow ? "Logged, and follow-up scheduled" : "Logged");
      setSummary("");
      setOutcomeId("");
      setFollow(false);
      setPurpose("");
      await reload();
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Log a call, message or note</p>
        {error && <ErrorNote message={error} />}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Type">
            <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              {lookups?.activity_types.map((t) => <option key={t.id} value={t.id}>{cap(t.name)}</option>)}
            </Select>
          </Field>
          {type?.name === "call" && (
            <Field label="Outcome">
              <Select value={outcomeId} onChange={(e) => setOutcomeId(e.target.value)}>
                <option value="">Select…</option>
                {lookups?.call_outcomes.map((o) => <option key={o.id} value={o.id}>{cap(o.name)}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Spoke to">
            <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">Not specified</option>
              {lead.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Summary"><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What was discussed? What did they decide?" /></Field>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /> Schedule a follow-up
        </label>
        {follow && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="When"><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
            <Field label="Who follows up">
              <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Me</option>
                {users.filter((u) => u.is_active && u.id !== user?.id).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Purpose"><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Share requirements form" /></Field>
          </div>
        )}
        <div className="flex justify-end"><Button onClick={save} loading={saving} disabled={!typeId || (!summary.trim() && !follow)}>Save</Button></div>
      </div>

      {loading ? <Spinner /> : data?.activities.length === 0 ? <Empty title="Nothing logged yet" hint="Log your first call above." /> : (
        <ol className="space-y-4">
          {data?.activities.map((a) => {
            const Icon = TYPE_ICON[a.type] ?? StickyNote;
            return (
              <li key={a.id} className="flex gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-medium capitalize">{a.type}</span>
                    {a.outcome && <span className="text-slate-500"> · {a.outcome}</span>}
                    {a.contact_name && <span className="text-slate-500"> · with {a.contact_name}</span>}
                  </p>
                  {a.summary && <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{a.summary}</p>}
                  <p className="mt-1 text-xs text-slate-400">{a.user_name ?? "Someone"} · {fmtDateTime(a.occurred_at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* ================= Follow-ups ================= */
export function FollowUpsTab({ lead, onChange }: { lead: LeadDetail; onChange: () => void }) {
  const { users } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get<{ follow_ups: FollowUp[] }>(`/leads/${lead.id}/follow-ups`), [lead.id]);
  const [due, setDue] = useState(tomorrowAt10());
  const [purpose, setPurpose] = useState("");
  const [assignee, setAssignee] = useState("");
  const [rescheduling, setRescheduling] = useState<{ id: number; value: string } | null>(null);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<unknown>, message: string) {
    setError("");
    try {
      await fn();
      toast(message);
      await reload();
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const pending = data?.follow_ups.filter((f) => f.status === "pending") ?? [];
  const past = data?.follow_ups.filter((f) => f.status !== "pending") ?? [];

  return (
    <div className="space-y-6">
      {error && <ErrorNote message={error} />}
      <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
        <Field label="When"><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <Field label="Who">
          <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Me</option>
            {users.filter((u) => u.is_active && u.id !== user?.id).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Purpose" className="sm:col-span-2"><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What should happen?" /></Field>
        <div className="sm:col-span-4 flex justify-end">
          <Button onClick={() => run(async () => { await api.post(`/leads/${lead.id}/follow-ups`, { due_at: fromLocalInput(due), purpose, assigned_to: assignee || user?.id }); setPurpose(""); }, "Follow-up scheduled")}>
            <Plus className="h-4 w-4" /> Add follow-up
          </Button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Coming up</h3>
            {pending.length === 0 ? <p className="text-sm text-slate-400">No pending follow-ups. Schedule one so this lead never goes quiet.</p> : (
              <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {pending.map((f) => {
                  const { text, tone } = dueLabel(f.due_at);
                  return (
                    <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{f.purpose ?? "Follow up"}</p>
                        <p className={`text-xs ${tone === "overdue" ? "font-medium text-rose-600" : "text-slate-500"}`}>{text} · {f.assigned_name ?? "Unassigned"}</p>
                      </div>
                      {rescheduling?.id === f.id ? (
                        <div className="flex items-center gap-2">
                          <Input type="datetime-local" value={rescheduling.value} onChange={(e) => setRescheduling({ id: f.id, value: e.target.value })} className="w-auto" />
                          <Button size="sm" onClick={() => run(async () => { await api.patch(`/follow-ups/${f.id}`, { action: "reschedule", due_at: fromLocalInput(rescheduling.value) }); setRescheduling(null); }, "Rescheduled")}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setRescheduling(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button size="sm" onClick={() => run(() => api.patch(`/follow-ups/${f.id}`, { action: "complete" }), "Marked done")}><CheckCircle2 className="h-3.5 w-3.5" /> Done</Button>
                          <Button size="sm" variant="secondary" onClick={() => setRescheduling({ id: f.id, value: toLocalInput(new Date(f.due_at)) })}><Calendar className="h-3.5 w-3.5" /> Move</Button>
                          <Button size="sm" variant="ghost" onClick={() => run(() => api.patch(`/follow-ups/${f.id}`, { action: "cancel" }), "Cancelled")}>Cancel</Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Earlier</h3>
              <ul className="space-y-1.5 text-sm text-slate-500">
                {past.map((f) => (
                  <li key={f.id}>{f.status === "done" ? "Done" : "Cancelled"} · {f.purpose ?? "Follow up"} · {fmtDate(f.due_at)}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ================= Requirements ================= */
export function RequirementsTab({ lead, onChange }: { lead: LeadDetail; onChange: () => void }) {
  const { lookups } = useData();
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get<{ requirements: Requirements | null }>(`/leads/${lead.id}/requirements`), [lead.id]);
  const [form, setForm] = useState({ project_type: "", status: "pending", expected_timeline: "", budget: "", notes: "" });
  const [techIds, setTechIds] = useState<number[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const r = data?.requirements;
    if (!data) return;
    setForm({
      project_type: r?.project_type ?? "", status: r?.status ?? "pending", expected_timeline: r?.expected_timeline ?? "",
      budget: r?.budget?.toString() ?? "", notes: r?.notes ?? "",
    });
    setTechIds(r?.tech_stack_ids ?? []);
    setFeatures(r?.features ?? []);
  }, [data]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const updateFeature = (i: number, patch: Partial<Feature>) => setFeatures((list) => list.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.put(`/leads/${lead.id}/requirements`, { ...form, tech_stack_ids: techIds, features });
      toast("Requirements saved");
      await reload();
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  return (
    <div className="space-y-5">
      {error && <ErrorNote message={error} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          <Select value={form.status} onChange={set("status")}>
            <option value="pending">Waiting for client</option>
            <option value="received">Received</option>
            <option value="confirmed">Confirmed with client</option>
          </Select>
        </Field>
        <Field label="Type of product">
          <Select value={form.project_type} onChange={set("project_type")}>
            <option value="">Not decided</option>
            <option value="web">Website / web app</option>
            <option value="mobile">Mobile app</option>
            <option value="both">Web and mobile</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Client's timeline"><Input value={form.expected_timeline} onChange={set("expected_timeline")} placeholder="e.g. 6 weeks" /></Field>
        <Field label="Client's budget (₹)"><Input value={form.budget} onChange={set("budget")} inputMode="numeric" /></Field>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-600">Tech stack</p>
        <div className="flex flex-wrap gap-2">
          {lookups?.tech_stacks.map((t) => {
            const on = techIds.includes(t.id);
            return (
              <button key={t.id} type="button" onClick={() => setTechIds((ids) => (on ? ids.filter((i) => i !== t.id) : [...ids, t.id]))} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${on ? "bg-indigo-600 text-white ring-indigo-600" : "text-slate-600 ring-slate-300 hover:bg-slate-50"}`}>
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-600">Features the client asked for</p>
          <Button size="sm" variant="secondary" onClick={() => setFeatures((f) => [...f, { title: "", priority: "should" }])}><Plus className="h-3.5 w-3.5" /> Add feature</Button>
        </div>
        {features.length === 0 && <p className="text-sm text-slate-400">No features listed yet.</p>}
        <div className="space-y-3">
          {features.map((f, i) => (
            <div key={i} className="group rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/80 transition-all hover:bg-white hover:shadow-card hover:ring-indigo-200">
              <div className="flex items-center gap-3">
                <Input value={f.title} onChange={(e) => updateFeature(i, { title: e.target.value })} placeholder="Feature, for example Online ordering" />
                <button type="button" onClick={() => setFeatures((list) => list.filter((_, idx) => idx !== i))} aria-label="Remove feature" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 inline-flex rounded-xl bg-slate-100/80 p-1" role="radiogroup" aria-label="Priority">
                {([["must", "Must have", "bg-rose-500"], ["should", "Should have", "bg-indigo-600"], ["nice", "Nice to have", "bg-emerald-500"]] as const).map(([value, label, dot]) => (
                  <button key={value} type="button" role="radio" aria-checked={f.priority === value} onClick={() => updateFeature(i, { priority: value })} className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${f.priority === value ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}>
                    <span className={`h-2 w-2 rounded-full ${dot} ${f.priority === value ? "" : "opacity-40"}`} /> {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Field label="Notes"><Textarea value={form.notes} onChange={set("notes")} /></Field>
      <div className="flex justify-end"><Button onClick={save} loading={saving}>Save requirements</Button></div>
    </div>
  );
}

/* ================= Prototype rounds ================= */
export function RevisionsTab({ lead, onChange }: { lead: LeadDetail; onChange: () => void }) {
  const { lookups, users } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get<{ revisions: Revision[] }>(`/leads/${lead.id}/revisions`), [lead.id]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ description: "", deadline: "", assigned_to: "", prototype_link: "", type_id: "" });
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  const revisions = data?.revisions ?? [];
  const staff = users.filter((u) => u.is_active && u.role !== "executive");

  async function run(fn: () => Promise<unknown>, message: string) {
    setError("");
    try {
      await fn();
      toast(message);
      await reload();
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-5">
      {error && <ErrorNote message={error} />}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="min-w-[14rem] flex-1 text-sm leading-relaxed text-slate-600">
          {revisions.length === 0 ? "No prototype rounds yet." : <>This lead is on <strong>round {revisions[0].round_number}</strong>. Every new request from the client becomes a new round.</>}
        </p>
        <Button className="shrink-0 whitespace-nowrap" onClick={() => setAdding((a) => !a)}><Plus className="h-4 w-4" /> New round</Button>
      </div>

      {adding && (
        <div className="animate-scale-in overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-28px_rgb(21_88_224/0.45)] ring-1 ring-indigo-100">
          <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-cyan-glow to-gold-400" />
          <div className="flex items-center gap-4 px-7 pb-2 pt-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-glow font-display text-lg font-bold text-white shadow-glow">{(revisions[0]?.round_number ?? 0) + 1}</span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">New prototype round</h3>
              <p className="text-sm text-slate-500">Describe what the client asked for. Only the first box is needed.</p>
            </div>
          </div>
          <div className="space-y-6 px-7 pb-7 pt-4">
            <Field label="What does the client want in this round?">
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="First prototype, change the header colours, add a payment page…" />
            </Field>
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <Field label="Type">
                <Select value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })}>
                  <option value="">{revisions.length === 0 ? "Initial" : "Change request"} (default)</option>
                  {lookups?.revision_types.map((t) => <option key={t.id} value={t.id}>{cap(t.name)}</option>)}
                </Select>
              </Field>
              <Field label="Deadline"><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
              <Field label="Built by">
                <Select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                  <option value="">Nobody yet</option>
                  {staff.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </Select>
              </Field>
              <Field label="Prototype link"><Input value={form.prototype_link} onChange={(e) => setForm({ ...form, prototype_link: e.target.value })} placeholder="Figma or demo link" /></Field>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
              <Button onClick={() => run(async () => { await api.post(`/leads/${lead.id}/revisions`, { ...form, assigned_to: form.assigned_to || (user?.role === "analyst" ? user.id : null), type_id: form.type_id || null }); setAdding(false); setForm({ description: "", deadline: "", assigned_to: "", prototype_link: "", type_id: "" }); }, "Round added")}>Add round</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="space-y-4">
          {revisions.map((r) => {
            const overdue = r.deadline && new Date(r.deadline) < new Date(new Date().toDateString()) && !["approved", "presented"].includes(r.status);
            return (
              <div key={r.id} className="rounded-xl ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-50 text-xs font-bold text-violet-700">{r.round_number}</span>
                    <span className="text-sm font-medium capitalize text-slate-800">{r.type}</span>
                    {r.deadline && <Badge className={overdue ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-50 text-slate-600 ring-slate-200"}>Due {fmtDate(r.deadline)}</Badge>}
                  </div>
                  <Select value={r.status_id} onChange={(e) => run(() => api.patch(`/revisions/${r.id}`, { status_id: e.target.value }), "Status updated")} className="w-auto" aria-label="Round status">
                    {lookups?.revision_statuses.map((s) => <option key={s.id} value={s.id}>{cap(s.name)}</option>)}
                  </Select>
                </div>
                <div className="space-y-3 px-4 py-3 text-sm">
                  {r.description && <p className="whitespace-pre-wrap text-slate-700">{r.description}</p>}
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Built by {r.assigned_name ?? "nobody yet"}</span>
                    {r.presented_at && <span>Presented {fmtDate(r.presented_at)}</span>}
                    {r.prototype_link && <a href={r.prototype_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline"><ExternalLink className="h-3 w-3" /> Open prototype</a>}
                  </p>
                  {r.feedback.length > 0 && (
                    <ul className="space-y-2 border-l-2 border-amber-200 pl-3">
                      {r.feedback.map((f) => (
                        <li key={f.id}>
                          <p className="text-slate-700">{f.feedback}</p>
                          <p className="text-xs text-slate-400">{f.recorded_by ?? "Someone"} · {fmtDate(f.received_at)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <Input value={feedback[r.id] ?? ""} onChange={(e) => setFeedback({ ...feedback, [r.id]: e.target.value })} placeholder="Add the client's feedback…" />
                    <Button variant="secondary" disabled={!feedback[r.id]?.trim()} onClick={() => run(async () => { await api.post(`/revisions/${r.id}/feedback`, { feedback: feedback[r.id] }); setFeedback({ ...feedback, [r.id]: "" }); }, "Feedback saved")}>Save</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= Meetings ================= */
export function MeetingsTab({ lead }: { lead: LeadDetail }) {
  const { data, loading, reload } = useLoad(() => api.get<{ meetings: Meeting[] }>(`/meetings?lead_id=${lead.id}`), [lead.id]);
  const [open, setOpen] = useState(false);
  const toast = useToast();

  async function remove(m: Meeting, series: boolean) {
    try {
      await api.del(`/meetings/${m.id}${series ? "?series=1" : ""}`);
      toast(series ? "Series deleted" : "Meeting deleted");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Schedule meeting</Button></div>
      {loading ? <Spinner /> : data?.meetings.length === 0 ? <Empty title="No meetings yet" hint="Schedule a prototype review or a check-in." /> : (
        <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
          {data?.meetings.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{m.title}{m.series_id && <Badge className="ml-2 bg-slate-50 text-slate-600 ring-slate-200">Repeats</Badge>}</p>
                <p className="text-xs text-slate-500">{fmtDateTime(m.start_at)} · {m.attendees.length} invited{m.status !== "scheduled" ? ` · ${m.status}` : ""}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {m.meeting_link && <a href={m.meeting_link} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><Video className="h-3.5 w-3.5" /> Join</Button></a>}
                <Button size="sm" variant="ghost" onClick={() => remove(m, false)} aria-label="Delete meeting"><Trash2 className="h-3.5 w-3.5" /></Button>
                {m.series_id && <Button size="sm" variant="ghost" onClick={() => remove(m, true)}>Delete series</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <MeetingModal open={open} onClose={() => setOpen(false)} onSaved={reload} fixedLeadId={lead.id} />
    </div>
  );
}

/* ================= Files ================= */
export function FilesTab({ lead }: { lead: LeadDetail }) {
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get<{ attachments: Attachment[]; storage: string }>(`/leads/${lead.id}/attachments`), [lead.id]);
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.upload(`/leads/${lead.id}/attachments`, form);
      toast("File uploaded");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await api.del(`/attachments/${id}`);
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
        <div>
          <p className="text-sm font-medium text-slate-800">Requirement documents, prototypes, contracts</p>
          <p className="text-xs text-slate-500">Up to 15 MB each. {data?.storage === "local" ? "Stored on the server for now; Backblaze B2 can be connected later." : "Stored in Backblaze B2."}</p>
        </div>
        <label className="cursor-pointer">
          <input type="file" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} disabled={busy} />
          <span className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700">{busy ? "Uploading…" : "Upload a file"}</span>
        </label>
      </div>
      {loading ? <Spinner /> : data?.attachments.length === 0 ? <Empty title="No files yet" /> : (
        <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
          {data?.attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{a.file_name}</p>
                <p className="text-xs text-slate-500">{a.size_bytes ? `${(a.size_bytes / 1024).toFixed(0)} KB · ` : ""}{a.uploaded_by ?? "Someone"} · {fmtDate(a.created_at)}</p>
              </div>
              <div className="flex gap-1.5">
                <a href={`/api/attachments/${a.id}`}><Button size="sm" variant="secondary"><Download className="h-3.5 w-3.5" /> Download</Button></a>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)} aria-label="Delete file"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================= Stage history ================= */
export function HistoryTab({ history }: { history: HistoryRow[] }) {
  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-5">
      {history.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
          <p className="text-sm text-slate-800">
            {h.from_stage ? <>Moved from <strong className="capitalize">{h.from_stage}</strong> to <strong className="capitalize">{h.to_stage}</strong></> : <>Entered as <strong className="capitalize">{h.to_stage}</strong></>}
          </p>
          {h.note && <p className="text-sm text-slate-500">{h.note}</p>}
          <p className="text-xs text-slate-400">{h.changed_by ?? "System"} · {fmtDateTime(h.changed_at)}</p>
        </li>
      ))}
    </ol>
  );
}
