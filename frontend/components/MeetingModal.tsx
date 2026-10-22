"use client";

import { useEffect, useState } from "react";
import { ClipboardPaste, Video } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth, useData } from "@/lib/auth";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import type { LeadRow } from "@/lib/types";
import { Button, ErrorNote, Field, Input, Modal, Select, Textarea, useToast } from "./ui";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultStart?: Date;
  fixedLeadId?: number;
}

export function MeetingModal({ open, onClose, onSaved, defaultStart, fixedLeadId }: Props) {
  const { user } = useAuth();
  const { users } = useData();
  const toast = useToast();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [link, setLink] = useState("");
  const [meetOpened, setMeetOpened] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [extraEmails, setExtraEmails] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [everyDays, setEveryDays] = useState("2");
  const [count, setCount] = useState("3");
  const [invite, setInvite] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const s = defaultStart ? new Date(defaultStart) : new Date();
    if (!defaultStart) {
      s.setMinutes(0, 0, 0);
      s.setHours(s.getHours() + 1);
    }
    const e = new Date(s.getTime() + 45 * 60000);
    setTitle("");
    setDescription("");
    setStart(toLocalInput(s));
    setEnd(toLocalInput(e));
    setLink("");
    setMeetOpened(false);
    setLeadId(fixedLeadId ? String(fixedLeadId) : "");
    setTeamEmails([]);
    setExtraEmails("");
    setRepeat(false);
    setError("");
    if (!fixedLeadId) api.get<{ leads: LeadRow[] }>("/leads").then((r) => setLeads(r.leads)).catch(() => undefined);
  }, [open, defaultStart, fixedLeadId]);

  function onStartChange(value: string) {
    // keep the same length when the start moves
    const length = new Date(end).getTime() - new Date(start).getTime();
    setStart(value);
    if (length > 0 && value) setEnd(toLocalInput(new Date(new Date(value).getTime() + length)));
  }

  async function pasteLink() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!/^https?:\/\//i.test(text)) return toast("The clipboard does not hold a link yet. Copy the Meet link first.", "error");
      setLink(text);
      toast("Link pasted");
    } catch {
      toast("Your browser blocked clipboard access. Paste with Ctrl+V into the box instead.", "error");
    }
  }

  const toggleTeam =(email: string) => setTeamEmails((list) => (list.includes(email) ? list.filter((e) => e !== email) : [...list, email]));

  async function save() {
    setSaving(true);
    setError("");
    try {
      const people = users.filter((u) => u.email && teamEmails.includes(u.email));
      const attendees = [
        ...people.map((u) => ({ email: u.email, name: u.full_name, user_id: u.id })),
        ...extraEmails.split(/[\s,;]+/).filter(Boolean).map((email) => ({ email, name: null })),
      ];
      await api.post("/meetings", {
        title,
        description,
        start_at: fromLocalInput(start),
        end_at: fromLocalInput(end),
        meeting_link: link,
        lead_id: leadId || null,
        attendees,
        repeat_every_days: repeat ? Number(everyDays) : null,
        repeat_count: repeat ? Number(count) : 1,
        send_invites: invite,
      });
      toast(repeat ? `Scheduled ${count} meetings` : "Meeting scheduled");
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  // Team emails are only visible to CRM Administrators; for others the list just won't have addresses.
  const teamWithEmail = users.filter((u) => u.is_active && u.email && u.id !== user?.id);

  return (
    <Modal open={open} title="Schedule a meeting" onClose={onClose} wide footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving} disabled={!title.trim()}>Schedule</Button></>}>
      {error && <ErrorNote message={error} />}

      <Field label="Meeting name *"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prototype review with Acme" autoFocus /></Field>

      <section className="space-y-4 rounded-2xl bg-slate-50/70 p-5 ring-1 ring-slate-200/70">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-600"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> When</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts"><Input type="datetime-local" value={start} onChange={(e) => onStartChange(e.target.value)} /></Field>
          <Field label="Ends"><Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <div className="rounded-xl bg-white/80 p-4 ring-1 ring-slate-200/70">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span><span className="block text-sm font-semibold text-slate-800">Repeat this meeting</span><span className="block text-xs text-slate-500">For a weekly check-in or a recurring review</span></span>
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} className="peer sr-only" />
            <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-indigo-600 peer-checked:after:translate-x-5" />
          </label>
          {repeat && (
            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <Field label="Every how many days?"><Input type="number" min={1} value={everyDays} onChange={(e) => setEveryDays(e.target.value)} /></Field>
              <Field label="How many meetings in total?" hint="At most 60"><Input type="number" min={2} max={60} value={count} onChange={(e) => setCount(e.target.value)} /></Field>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-slate-50/70 p-5 ring-1 ring-slate-200/70">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-600"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Where</h3>
        <Field label="Meeting link (Meet, Zoom…)"><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/…" /></Field>
        <div className="flex flex-wrap items-center gap-2.5">
          <a href="https://meet.new" target="_blank" rel="noreferrer" onClick={() => setMeetOpened(true)}>
            <Button type="button" variant="secondary" size="sm"><Video className="h-3.5 w-3.5" /> Create Google Meet link</Button>
          </a>
          <Button type="button" variant={meetOpened ? "primary" : "secondary"} size="sm" onClick={pasteLink}><ClipboardPaste className="h-3.5 w-3.5" /> Paste link</Button>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">{meetOpened ? "Copy the link from the new Meet tab, then click Paste link." : "Opens Google Meet in a new tab. Copy its link, then paste it here."}</p>
      </section>

      {!fixedLeadId && (
        <Field label="Related lead (optional)">
          <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">None</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.company}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Agenda / notes"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should this meeting cover?" /></Field>

      <section className="space-y-3 rounded-2xl bg-slate-50/70 p-5 ring-1 ring-slate-200/70">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-600"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Who should get the invite?</h3>
        {teamWithEmail.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {teamWithEmail.map((u) => (
              <label key={u.id} className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-inset transition-all ${teamEmails.includes(u.email!) ? "bg-indigo-600 text-white shadow-glow ring-indigo-600" : "bg-white text-slate-600 ring-slate-300 hover:ring-indigo-300"}`}>
                <input type="checkbox" className="sr-only" checked={teamEmails.includes(u.email!)} onChange={() => toggleTeam(u.email!)} />
                {u.full_name}
              </label>
            ))}
          </div>
        )}
        <Input value={extraEmails} onChange={(e) => setExtraEmails(e.target.value)} placeholder="Client or other emails, separated by commas" />
        <label className="flex cursor-pointer items-center gap-3 pt-1 text-sm text-slate-700">
          <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /> Email a calendar invite to everyone above
        </label>
      </section>
    </Modal>
  );
}
