"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Phone } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { dueLabel, fromLocalInput, toLocalInput } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import type { FollowUp } from "@/lib/types";
import { Avatar } from "@/components/fx/effects";
import { Button, Card, Empty, ErrorNote, Input, PageHeader, Spinner, Tip, useToast } from "@/components/ui";

export default function FollowUpsPage() {
  const toast = useToast();
  const [everyone, setEveryone] = useState(false);
  const [moving, setMoving] = useState<{ id: number; value: string } | null>(null);
  const { data, loading, error, reload } = useLoad(() => api.get<{ follow_ups: FollowUp[] }>(`/follow-ups?status=pending&mine=${everyone ? 0 : 1}`), [everyone]);
  const items = data?.follow_ups ?? [];

  const groups = [
    { title: "Overdue", tone: "text-rose-600", rows: items.filter((f) => dueLabel(f.due_at).tone === "overdue") },
    { title: "Today", tone: "text-amber-600", rows: items.filter((f) => dueLabel(f.due_at).tone === "today") },
    { title: "Upcoming", tone: "text-slate-700", rows: items.filter((f) => ["soon", "later"].includes(dueLabel(f.due_at).tone)) },
  ];

  async function act(id: number, body: Record<string, unknown>, message: string) {
    try {
      await api.patch(`/follow-ups/${id}`, body);
      toast(message);
      setMoving(null);
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Follow-ups"
        subtitle={everyone ? "Everyone's pending follow-ups" : "Your pending follow-ups"}
        actions={
          <div className="flex rounded-xl bg-slate-100/80 p-1">
            {[["Mine", false], ["Everyone", true]].map(([label, value]) => (
              <button key={String(label)} onClick={() => setEveryone(value as boolean)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${everyone === value ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label as string}</button>
            ))}
          </div>
        }
      />
      <Tip id="follow-ups" title="Never let a lead go quiet">
        Schedule a follow-up at the end of every call. It lands here, and you get an email about 30 minutes before it is due. Tick <strong>Done</strong> when finished or <strong>Move</strong> to a new time.
      </Tip>
      {error && <ErrorNote message={error} />}
      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><Empty icon={<CheckCircle2 className="h-7 w-7" />} title="You're all caught up" hint="Schedule follow-ups when you log a call, and they will show up here." /></Card>
      ) : (
        <div className="space-y-6">
          {groups.filter((g) => g.rows.length > 0).map((g) => (
            <div key={g.title}>
              <h2 className={`mb-2.5 flex items-center gap-2 text-sm font-bold ${g.tone}`}>{g.title} <span className="rounded-full bg-white px-2 py-0.5 text-xs shadow-sm ring-1 ring-slate-200">{g.rows.length}</span></h2>
              <Card padded={false}>
                <ul className="divide-y divide-slate-100">
                  {g.rows.map((f) => (
                    <li key={f.id} className="group relative flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-indigo-50/40">
                      <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${g.title === "Overdue" ? "bg-rose-500" : g.title === "Today" ? "bg-gold-500" : "bg-indigo-400"}`} />
                      <div className="flex min-w-0 items-center gap-3.5">
                        <Avatar name={f.company ?? "?"} size={44} className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" />
                        <div className="min-w-0">
                          <Link href={`/leads/${f.lead_id}`} className="text-sm font-bold text-slate-900 hover:text-indigo-600">{f.company}</Link>
                          <p className="text-sm text-slate-600">{f.purpose ?? "Follow up"}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${g.title === "Overdue" ? "bg-rose-50 text-rose-600" : g.title === "Today" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{dueLabel(f.due_at).text}</span>
                            {everyone && <span>For {f.assigned_name ?? "nobody"}</span>}
                            {f.contact_name && <span>{f.contact_name}</span>}
                            {f.phone && <a href={`tel:${f.phone}`} className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"><Phone className="h-3 w-3" />{f.phone}</a>}
                          </p>
                        </div>
                      </div>
                      {moving?.id === f.id ? (
                        <div className="flex items-center gap-2">
                          <Input type="datetime-local" value={moving.value} onChange={(e) => setMoving({ id: f.id, value: e.target.value })} className="w-auto" />
                          <Button size="sm" onClick={() => act(f.id, { action: "reschedule", due_at: fromLocalInput(moving.value) }, "Rescheduled")}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setMoving(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button size="sm" onClick={() => act(f.id, { action: "complete" }, "Marked done")}><CheckCircle2 className="h-3.5 w-3.5" /> Done</Button>
                          <Button size="sm" variant="secondary" onClick={() => setMoving({ id: f.id, value: toLocalInput(new Date(f.due_at)) })}>Move</Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-slate-400">Reminder emails go out about 30 minutes before each follow-up is due.</p>
    </>
  );
}
