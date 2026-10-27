"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth, useData } from "@/lib/auth";
import type { LeadDetail, LeadRow } from "@/lib/types";
import { fireConfetti } from "./fx/effects";
import { cap, roleLabel } from "@/lib/format";
import { Button, ErrorNote, Field, Input, Modal, Select, Textarea, useToast } from "./ui";

const blank = {
  company_name: "", contact_name: "", job_title: "", phone: "", email: "", website: "", industry: "", location: "",
  source_id: "", project_summary: "", estimated_budget: "", priority: "",
};

/* ---------- add a new lead ---------- */
export function AddLeadModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const { lookups } = useData();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(blank);
      setError("");
      setDuplicate(null);
    }
  }, [open]);

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(force = false) {
    setSaving(true);
    setError("");
    setDuplicate(null);
    try {
      const r = await api.post<{ id: number }>("/leads", { ...form, force });
      toast("Lead added");
      onCreated?.();
      onClose();
      router.push(`/leads/${r.id}`);
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) setDuplicate(Number(e.data.duplicate_lead_id));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Add a lead"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {duplicate && <Button variant="secondary" onClick={() => save(true)} loading={saving}>Add anyway</Button>}
          <Button onClick={() => save(false)} loading={saving} disabled={!form.company_name.trim()}>Add lead</Button>
        </>
      }
    >
      {error && (
        <ErrorNote message={error} />
      )}
      {duplicate && (
        <p className="text-sm text-slate-600">
          <Link href={`/leads/${duplicate}`} className="font-medium text-indigo-600 hover:underline">Open the existing lead</Link>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company *" className="sm:col-span-2"><Input value={form.company_name} onChange={set("company_name")} autoFocus /></Field>
        <Field label="Contact person"><Input value={form.contact_name} onChange={set("contact_name")} /></Field>
        <Field label="Job title"><Input value={form.job_title} onChange={set("job_title")} /></Field>
        <Field label="Phone" hint="Phone or email is required"><Input value={form.phone} onChange={set("phone")} type="tel" autoComplete="off" inputMode="tel" placeholder="+91 00000 00000" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="Source">
          <Select value={form.source_id} onChange={set("source_id")}>
            <option value="">Select…</option>
            {lookups?.lead_sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={set("priority")}>
            <option value="">Not set</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        <Field label="What do they want built?" className="sm:col-span-2"><Textarea value={form.project_summary} onChange={set("project_summary")} /></Field>
        <Field label="Estimated budget (₹)"><Input value={form.estimated_budget} onChange={set("estimated_budget")} inputMode="numeric" /></Field>
        <Field label="Industry"><Input value={form.industry} onChange={set("industry")} /></Field>
        <Field label="Location"><Input value={form.location} onChange={set("location")} /></Field>
        <Field label="Website"><Input value={form.website} onChange={set("website")} /></Field>
      </div>
    </Modal>
  );
}

/* ---------- edit a lead ---------- */
export function EditLeadModal({ lead, open, onClose, onSaved }: { lead: LeadDetail; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { lookups, users } = useData();
  const { user } = useAuth();
  const canReassign = user?.role !== "business_development_executive";
  const toast = useToast();
  const [form, setForm] = useState({ company_name: "", website: "", industry: "", location: "", project_summary: "", estimated_budget: "", priority: "", source_id: "", assigned_to: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open)
      setForm({
        company_name: lead.company ?? "", website: lead.website ?? "", industry: lead.industry ?? "", location: lead.location ?? "",
        project_summary: lead.project_summary ?? "", estimated_budget: lead.estimated_budget?.toString() ?? "", priority: lead.priority ?? "",
        source_id: lead.source_id?.toString() ?? "", assigned_to: lead.assigned_to?.toString() ?? "",
      });
  }, [open, lead]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/leads/${lead.id}`, { ...form, assigned_to: canReassign ? form.assigned_to : undefined });
      toast("Lead updated");
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Edit lead" onClose={onClose} wide footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
      {error && <ErrorNote message={error} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" className="sm:col-span-2"><Input value={form.company_name} onChange={set("company_name")} /></Field>
        <Field label="Industry"><Input value={form.industry} onChange={set("industry")} /></Field>
        <Field label="Location"><Input value={form.location} onChange={set("location")} /></Field>
        <Field label="Website" className="sm:col-span-2"><Input value={form.website} onChange={set("website")} /></Field>
        <Field label="What do they want built?" className="sm:col-span-2"><Textarea value={form.project_summary} onChange={set("project_summary")} /></Field>
        <Field label="Estimated budget (₹)"><Input value={form.estimated_budget} onChange={set("estimated_budget")} inputMode="numeric" /></Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={set("priority")}>
            <option value="">Not set</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Source">
          <Select value={form.source_id} onChange={set("source_id")}>
            <option value="">Select…</option>
            {lookups?.lead_sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        {canReassign && (
          <Field label="Owner">
            <Select value={form.assigned_to} onChange={set("assigned_to")}>
              {users.filter((u) => u.is_active).map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}

/* ---------- move a lead to another stage ---------- */
export function StageModal({ lead, targetStageId, onClose, onDone }: { lead: Pick<LeadRow, "id" | "company" | "stage_id" | "stage">; targetStageId: number | null; onClose: () => void; onDone: () => void }) {
  const { lookups } = useData();
  const toast = useToast();
  const [stageId, setStageId] = useState<number | null>(targetStageId);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStageId(targetStageId);
    setNote("");
    setReason("");
    setDealValue("");
    setError("");
  }, [targetStageId, lead.id]);

  const stage = lookups?.stages.find((s) => s.id === stageId);

  async function save() {
    if (!stageId) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/leads/${lead.id}/stage`, { stage_id: stageId, note, lost_reason_id: reason || null, deal_value: dealValue || null });
      if (stage?.name === "won") {
        fireConfetti();
        toast("Deal won. Congratulations!");
      } else toast(`Moved to ${cap(stage?.name ?? "")}`);
      onDone();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={targetStageId !== null} title={`Move ${lead.company}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving} disabled={!stageId || stageId === lead.stage_id}>Move lead</Button></>}>
      {error && <ErrorNote message={error} />}
      <Field label="New stage">
        <Select value={stageId ?? ""} onChange={(e) => setStageId(Number(e.target.value))}>
          {lookups?.stages.map((s) => <option key={s.id} value={s.id}>{cap(s.name)}{s.id === lead.stage_id ? " (current)" : ""}</option>)}
        </Select>
      </Field>
      {stage && stage.owner_role_name && !["won", "lost"].includes(stage.name) && (
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          This stage is handled by the <strong>{roleLabel(stage.owner_role_name)}</strong>. The lead is handed over automatically if its owner has a different role.
        </p>
      )}
      {stage?.name === "lost" && (
        <Field label="Why was it lost? *">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason…</option>
            {lookups?.lost_reasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
      )}
      {stage?.name === "won" && (
        <Field label="Final deal value (₹)"><Input value={dealValue} onChange={(e) => setDealValue(e.target.value)} inputMode="numeric" /></Field>
      )}
      <Field label="Note (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is it moving?" /></Field>
    </Modal>
  );
}
