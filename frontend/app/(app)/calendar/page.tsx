"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Video } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { fmtDateTime, fmtTime } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import type { Meeting } from "@/lib/types";
import { MeetingModal } from "@/components/MeetingModal";
import { Badge, Button, Card, ErrorNote, Modal, PageHeader, Tip, useToast } from "@/components/ui";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function CalendarPage() {
  const toast = useToast();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [createAt, setCreateAt] = useState<Date | null>(null);
  const [selected, setSelected] = useState<Meeting | null>(null);

  // opened from the command palette
  useEffect(() => {
    const open = () => {
      if (sessionStorage.getItem("crm-open-meeting")) {
        sessionStorage.removeItem("crm-open-meeting");
        setCreateAt(new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)));
      }
    };
    open();
    window.addEventListener("crm:add-meeting", open);
    return () => window.removeEventListener("crm:add-meeting", open);
  }, []);

  // 6 weeks starting on the Monday on or before the 1st
  const days = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [month]);

  const { data, error, reload } = useLoad(
    () => api.get<{ meetings: Meeting[] }>(`/meetings?from=${encodeURIComponent(days[0].toISOString())}&to=${encodeURIComponent(new Date(days[41].getTime() + 86400000).toISOString())}`),
    [days],
  );
  const meetings = data?.meetings ?? [];
  const today = new Date();
  const upcoming = meetings.filter((m) => new Date(m.end_at) >= today && m.status === "scheduled").slice(0, 6);

  async function setStatus(m: Meeting, status: Meeting["status"]) {
    try {
      await api.patch(`/meetings/${m.id}`, { status });
      toast("Updated");
      setSelected(null);
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  async function remove(m: Meeting, series: boolean) {
    if (!confirm(series ? "Delete every meeting in this series?" : "Delete this meeting?")) return;
    try {
      await api.del(`/meetings/${m.id}${series ? "?series=1" : ""}`);
      toast("Deleted");
      setSelected(null);
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Prototype reviews, client calls and team syncs"
        actions={<Button onClick={() => setCreateAt(new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)))}><Plus className="h-4 w-4" /> Schedule meeting</Button>}
      />
      <Tip id="calendar" title="Meetings in two clicks">
        Click any day to schedule a meeting. Choose <strong>Repeat</strong> for a series, add attendee emails, and an invite with a calendar file is emailed to everyone.
      </Tip>
      {error && <ErrorNote message={error} />}

      <div className="mb-3 flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="min-w-[10rem] text-center text-base font-semibold text-slate-800">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
        <Button variant="secondary" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</Button>
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 border-b border-slate-100 text-xs font-medium text-slate-400">
              {DAY_NAMES.map((d) => <div key={d} className="px-2 py-2 text-center">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const inMonth = day.getMonth() === month.getMonth();
                const list = meetings.filter((m) => sameDay(new Date(m.start_at), day));
                const isToday = sameDay(day, today);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setCreateAt(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0))}
                    className={`group min-h-[112px] cursor-pointer border-b border-r border-slate-200/50 p-2 transition-colors hover:bg-indigo-50/60 ${inMonth ? "" : "bg-slate-50/50"} ${isToday ? "bg-indigo-50/50" : ""}`}
                  >
                    <span className={`mb-1.5 inline-grid h-7 w-7 place-items-center rounded-full text-xs font-semibold transition-transform group-hover:scale-110 ${isToday ? "bg-brand-gradient text-white shadow-glow" : inMonth ? "text-slate-700" : "text-slate-300"}`}>{day.getDate()}</span>
                    <div className="space-y-1">
                      {list.slice(0, 3).map((m) => (
                        <button
                          key={m.id}
                          onClick={(e) => { e.stopPropagation(); setSelected(m); }}
                          className={`block w-full truncate rounded-lg px-2 py-1 text-left text-xs font-semibold transition-all hover:-translate-y-px hover:shadow-md ${m.status === "cancelled" ? "bg-slate-100 text-slate-400 line-through" : m.status === "done" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white"}`}
                        >
                          {fmtTime(m.start_at)} {m.title}
                        </button>
                      ))}
                      {list.length > 3 && <p className="px-1 text-xs text-slate-400">+{list.length - 3} more</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {upcoming.length > 0 && (
        <Card title="Coming up" className="mt-6" padded={false}>
          <ul className="divide-y divide-slate-100">
            {upcoming.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <button onClick={() => setSelected(m)} className="text-left">
                  <p className="text-sm font-medium text-slate-800">{m.title}</p>
                  <p className="text-xs text-slate-500">{fmtDateTime(m.start_at)}{m.company ? ` · ${m.company}` : ""}</p>
                </button>
                {m.meeting_link && <a href={m.meeting_link} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><Video className="h-3.5 w-3.5" /> Join</Button></a>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <MeetingModal open={createAt !== null} onClose={() => setCreateAt(null)} onSaved={reload} defaultStart={createAt ?? undefined} />

      <Modal open={selected !== null} title={selected?.title ?? ""} onClose={() => setSelected(null)}
        footer={selected && (
          <>
            {selected.series_id && <Button variant="ghost" onClick={() => remove(selected, true)}>Delete series</Button>}
            <Button variant="ghost" onClick={() => remove(selected, false)}>Delete</Button>
            {selected.status === "scheduled" ? <Button onClick={() => setStatus(selected, "done")}>Mark done</Button> : <Button variant="secondary" onClick={() => setStatus(selected, "scheduled")}>Reopen</Button>}
          </>
        )}>
        {selected && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-700">{fmtDateTime(selected.start_at)} to {fmtTime(selected.end_at)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-slate-50 text-slate-600 ring-slate-200 capitalize">{selected.status}</Badge>
              {selected.series_id && <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">Repeating</Badge>}
              {selected.lead_id && <Link href={`/leads/${selected.lead_id}`} className="text-indigo-600 hover:underline">{selected.company ?? "Open lead"}</Link>}
            </div>
            {selected.description && <p className="whitespace-pre-wrap text-slate-600">{selected.description}</p>}
            {selected.meeting_link && <a href={selected.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline"><Video className="h-4 w-4" /> Join the meeting</a>}
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Invited ({selected.attendees.length})</p>
              {selected.attendees.length === 0 ? <p className="text-slate-400">Nobody invited.</p> : (
                <ul className="space-y-1">
                  {selected.attendees.map((a) => <li key={a.email} className="text-slate-700">{a.name ? `${a.name} · ` : ""}{a.email} {a.invited && <span className="text-xs text-emerald-600">invite sent</span>}</li>)}
                </ul>
              )}
            </div>
            <p className="text-xs text-slate-400">Organized by {selected.organizer_name ?? "someone"}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
