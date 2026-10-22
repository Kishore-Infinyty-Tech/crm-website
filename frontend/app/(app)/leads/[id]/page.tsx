"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, BellRing, CalendarClock, Check, Clock, Files, GitBranch, Globe, History, IndianRupee, ListChecks, Mail, MapPin, MessageSquare, Pencil, Phone, Plus, Star, Trash2, Trophy, XCircle } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth, useData } from "@/lib/auth";
import { STAGE_HEX, cap, dueLabel, fmtDate, fmtMoney } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import type { LeadDetail } from "@/lib/types";
import { EditLeadModal, StageModal } from "@/components/LeadModals";
import { ActivityTab, FilesTab, FollowUpsTab, HistoryTab, MeetingsTab, RequirementsTab, RevisionsTab } from "@/components/LeadTabs";
import { Avatar, CountUp } from "@/components/fx/effects";
import { Button, Card, ErrorNote, Field, Input, Modal, PriorityBadge, Spinner, StageBadge, Tabs, useToast } from "@/components/ui";

type TabId = "activity" | "follow-ups" | "requirements" | "rounds" | "meetings" | "files" | "history";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children || <span className="text-slate-300">Not added</span>}</dd>
    </div>
  );
}

/** The whole journey at a glance. Click any step to move the lead there. */
function Stepper({ lead, onPick }: { lead: LeadDetail; onPick: (stageId: number) => void }) {
  const { lookups } = useData();
  const visited = useMemo(() => new Set(lead.history.map((h) => h.to_stage)), [lead.history]);
  const steps = (lookups?.stages ?? []).filter((s) => s.name !== "lost");
  const lost = lead.stage === "lost";
  const currentIndex = steps.findIndex((s) => s.name === lead.stage);
  const lostStage = lookups?.stages.find((s) => s.name === "lost");

  return (
    <div className="overflow-x-auto px-2 pb-2 pt-1">
      <ol className="flex min-w-[720px] items-start">
        {steps.map((s, i) => {
          const isCurrent = i === currentIndex;
          const done = !isCurrent && (visited.has(s.name) || i < currentIndex);
          const color = STAGE_HEX[s.name];
          return (
            <li key={s.id} className="relative flex flex-1 flex-col items-center">
              {i > 0 && (
                <span className="absolute right-1/2 top-[19px] h-[3px] w-full -translate-y-1/2 overflow-hidden rounded-full bg-slate-200">
                  <span className="block h-full origin-left rounded-full transition-transform duration-1000 ease-out" style={{ transform: `scaleX(${done || isCurrent ? 1 : 0})`, background: `linear-gradient(90deg, ${STAGE_HEX[steps[i - 1].name]}, ${color})` }} />
                </span>
              )}
              <button
                onClick={() => onPick(s.id)}
                aria-label={`Move to ${s.name}`}
                className={`relative z-10 grid place-items-center rounded-full text-xs font-bold transition-all duration-300 hover:scale-110 ${isCurrent ? "h-10 w-10 text-white" : "h-9 w-9"} ${done ? "text-white" : isCurrent ? "" : "bg-white text-slate-400 ring-2 ring-slate-200"}`}
                style={done || isCurrent ? { background: color, boxShadow: isCurrent ? `0 0 0 5px ${color}33, 0 10px 24px -6px ${color}` : `0 6px 14px -6px ${color}` } : undefined}
              >
                {done ? <Check className="h-4 w-4" /> : s.name === "won" ? <Trophy className="h-4 w-4" /> : i + 1}
              </button>
              <span className={`mt-2 text-xs font-semibold ${isCurrent ? "text-slate-900" : done ? "text-slate-600" : "text-slate-400"}`}>{cap(s.name)}</span>
            </li>
          );
        })}
        {lost && lostStage && (
          <li className="flex flex-col items-center px-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-rose-500 text-white shadow-[0_0_0_5px_rgb(244_63_94/0.2),0_10px_24px_-6px_#f43f5e]"><XCircle className="h-5 w-5" /></span>
            <span className="mt-2 text-xs font-bold text-rose-600">Lost</span>
          </li>
        )}
      </ol>
    </div>
  );
}

export default function LeadPage() {
  const { id } = useParams<{ id: string }>();
  const leadId = Number(id);
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { data: lead, loading, error, reload } = useLoad(() => api.get<LeadDetail>(`/leads/${leadId}`), [leadId]);
  const [tab, setTab] = useState<TabId>("activity");
  const [editOpen, setEditOpen] = useState(false);
  const [stageTarget, setStageTarget] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contact, setContact] = useState({ name: "", job_title: "", phone: "", email: "" });
  const [contactError, setContactError] = useState("");

  if (loading && !lead) return <Spinner label="Opening lead" />;
  if (error || !lead) {
    return (
      <div className="space-y-4">
        <ErrorNote message={error ?? "Lead not found"} />
        <Link href="/leads" className="text-sm font-semibold text-indigo-600 hover:underline">Back to leads</Link>
      </div>
    );
  }

  const primary = lead.contacts.find((c) => c.is_primary) ?? lead.contacts[0];
  const daysInStage = Math.max(0, Math.floor((Date.now() - new Date(lead.stage_changed_at).getTime()) / 86400000));
  const age = Math.max(0, Math.floor(((lead.closed_at ? new Date(lead.closed_at).getTime() : Date.now()) - new Date(lead.created_at).getTime()) / 86400000));

  async function addContact() {
    setContactError("");
    try {
      await api.post(`/leads/${leadId}/contacts`, { ...contact, is_primary: lead!.contacts.length === 0 });
      setContactOpen(false);
      setContact({ name: "", job_title: "", phone: "", email: "" });
      toast("Contact added");
      reload();
    } catch (e) {
      setContactError(errorMessage(e));
    }
  }

  async function makePrimary(contactId: number) {
    await api.patch(`/leads/${leadId}/contacts/${contactId}`, { is_primary: true });
    reload();
  }

  async function removeLead() {
    if (!confirm(`Delete ${lead!.company} and everything recorded about it? This cannot be undone.`)) return;
    try {
      await api.del(`/leads/${leadId}`);
      toast("Lead deleted");
      router.replace("/leads");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <div className="space-y-6">
      {/* hero */}
      <section className="glass-strong animate-fade-up overflow-hidden rounded-[1.75rem]">
        <div className="bg-navy-gradient relative h-32 sm:h-36">
          <div className="dot-grid absolute inset-0 opacity-[0.16]" />
          <div className="absolute -right-10 -top-16 h-56 w-56 animate-blob rounded-full bg-cyan-glow/30 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-48 w-48 animate-blob rounded-full bg-gold-500/25 blur-3xl" style={{ animationDelay: "-7s" }} />
          <Link href="/leads" className="absolute left-5 top-4 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/20"><ArrowLeft className="h-3.5 w-3.5" /> All leads</Link>
        </div>
        <div className="relative z-10 px-5 pb-6 sm:px-8">
          <div className="-mt-9 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Avatar name={lead.company} size={84} ring className="!rounded-2xl shadow-xl" />
              <div className="pt-11">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{lead.company}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StageBadge name={lead.stage} />
                  <PriorityBadge value={lead.priority} />
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><Clock className="h-3.5 w-3.5" /> {daysInStage} day{daysInStage === 1 ? "" : "s"} in this stage</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-11">
              {primary?.phone && <a href={`tel:${primary.phone}`}><Button variant="secondary"><Phone className="h-4 w-4" /> Call</Button></a>}
              {primary?.email && <a href={`mailto:${primary.email}`}><Button variant="secondary"><Mail className="h-4 w-4" /> Email</Button></a>}
              <Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
              <Button onClick={() => setStageTarget(lead.stage_id)}>Change stage</Button>
              {user?.role === "admin" && <Button variant="ghost" onClick={removeLead} aria-label="Delete lead"><Trash2 className="h-4 w-4 text-rose-600" /></Button>}
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: IndianRupee, label: "Estimated budget", value: lead.estimated_budget ? fmtMoney(lead.estimated_budget) : "Not set", tone: "from-indigo-600 to-cyan-glow" },
              { icon: Trophy, label: lead.deal_value ? "Final deal value" : "Deal value", value: lead.deal_value ? fmtMoney(lead.deal_value) : "Pending", tone: "from-emerald-600 to-emerald-300" },
              { icon: BellRing, label: "Next follow-up", value: lead.next_follow_up ? dueLabel(lead.next_follow_up).text : "None scheduled", tone: "from-gold-500 to-gold-300" },
              { icon: CalendarClock, label: lead.closed_at ? "Days to close" : "Days in pipeline", value: <><CountUp value={age} /> days</>, tone: "from-indigo-800 to-indigo-400" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-2xl bg-white/70 p-3.5 ring-1 ring-slate-200/60">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${s.tone} text-white shadow-md`}><s.icon className="h-5 w-5" /></span>
                <div className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.label}</dt><dd className="truncate text-sm font-bold text-slate-900">{s.value}</dd></div>
              </div>
            ))}
          </dl>

          <div className="mt-6 rounded-2xl bg-slate-50/80 px-2 py-4 ring-1 ring-slate-200/60">
            <Stepper lead={lead} onPick={(sid) => setStageTarget(sid)} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title="Deal details" hover>
            <dl className="space-y-4">
              <Detail label="What they want built"><span className="whitespace-pre-wrap">{lead.project_summary}</span></Detail>
              <Detail label="Owner">{lead.assigned_name && <span className="flex items-center gap-2"><Avatar name={lead.assigned_name} size={26} />{lead.assigned_name}</span>}</Detail>
              <Detail label="Source"><span className="capitalize">{lead.source}</span></Detail>
              <Detail label="Industry">{lead.industry}</Detail>
              <Detail label="Location">{lead.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{lead.location}</span>}</Detail>
              <Detail label="Website">{lead.website && <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 break-all text-indigo-600 hover:underline"><Globe className="h-3.5 w-3.5 shrink-0" />{lead.website}</a>}</Detail>
              <Detail label="Added">{fmtDate(lead.created_at)}</Detail>
            </dl>
          </Card>

          <Card title="People" actions={<Button size="sm" variant="secondary" onClick={() => setContactOpen(true)}><Plus className="h-3.5 w-3.5" /> Add</Button>}>
            {lead.contacts.length === 0 ? <p className="text-sm text-slate-400">No contacts yet.</p> : (
              <ul className="space-y-4">
                {lead.contacts.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <Avatar name={c.name} size={40} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        {c.name}
                        {c.is_primary ? <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-500" aria-label="Primary contact" /> : <button onClick={() => makePrimary(c.id)} className="text-xs font-medium text-slate-400 hover:text-indigo-600">Make primary</button>}
                      </p>
                      {c.job_title && <p className="text-xs text-slate-500">{c.job_title}</p>}
                      <div className="mt-1.5 flex flex-col gap-1 text-sm">
                        {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline"><Phone className="h-3.5 w-3.5" />{c.phone}</a>}
                        {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 break-all text-indigo-600 hover:underline"><Mail className="h-3.5 w-3.5 shrink-0" />{c.email}</a>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card padded={false} className="min-w-0 self-start">
          <Tabs<TabId>
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "activity", label: "Activity", icon: <MessageSquare className="h-4 w-4" /> },
              { id: "follow-ups", label: "Follow-ups", icon: <BellRing className="h-4 w-4" /> },
              { id: "requirements", label: "Requirements", icon: <ListChecks className="h-4 w-4" /> },
              { id: "rounds", label: "Prototype rounds", icon: <GitBranch className="h-4 w-4" /> },
              { id: "meetings", label: "Meetings", icon: <CalendarClock className="h-4 w-4" /> },
              { id: "files", label: "Files", icon: <Files className="h-4 w-4" /> },
              { id: "history", label: "History", icon: <History className="h-4 w-4" />, count: lead.history.length },
            ]}
          />
          <div key={tab} className="page-enter p-5">
            {tab === "activity" && <ActivityTab lead={lead} onChange={reload} />}
            {tab === "follow-ups" && <FollowUpsTab lead={lead} onChange={reload} />}
            {tab === "requirements" && <RequirementsTab lead={lead} onChange={reload} />}
            {tab === "rounds" && <RevisionsTab lead={lead} onChange={reload} />}
            {tab === "meetings" && <MeetingsTab lead={lead} />}
            {tab === "files" && <FilesTab lead={lead} />}
            {tab === "history" && <HistoryTab history={lead.history} />}
          </div>
        </Card>
      </div>

      <EditLeadModal lead={lead} open={editOpen} onClose={() => setEditOpen(false)} onSaved={reload} />
      <StageModal lead={lead} targetStageId={stageTarget} onClose={() => setStageTarget(null)} onDone={reload} />
      <Modal open={contactOpen} title="Add a person" onClose={() => setContactOpen(false)} footer={<><Button variant="secondary" onClick={() => setContactOpen(false)}>Cancel</Button><Button onClick={addContact} disabled={!contact.name.trim()}>Add</Button></>}>
        {contactError && <ErrorNote message={contactError} />}
        <Field label="Name"><Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoFocus /></Field>
        <Field label="Job title"><Input value={contact.job_title} onChange={(e) => setContact({ ...contact, job_title: e.target.value })} /></Field>
        <Field label="Phone"><Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></Field>
      </Modal>
    </div>
  );
}
