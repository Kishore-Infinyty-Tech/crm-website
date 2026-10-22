"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardPaste, Download, FileSpreadsheet, FileUp, Sparkles, Table2, Trash2, Upload, UserPlus } from "lucide-react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth, useData } from "@/lib/auth";
import { cap } from "@/lib/format";
import { Button, Card, ErrorNote, Field, Input, PageHeader, Select, Textarea, useToast } from "@/components/ui";

type Mode = "manual" | "bulk";
type BulkWay = "file" | "paste";

interface Result { imported: number; skipped: number; problems: string[] }

const blank = { company_name: "", industry: "", location: "", website: "", contact_name: "", job_title: "", phone: "", alt_phone: "", email: "", source_id: "", priority: "", estimated_budget: "", project_summary: "", assigned_to: "" };

/* column names the importer understands (kept in step with the server) */
const ALIASES: Record<string, string> = {
  company: "Company", "company name": "Company", company_name: "Company", organisation: "Company", organization: "Company", business: "Company",
  name: "Contact", contact: "Contact", "contact name": "Contact", contact_name: "Contact", person: "Contact",
  title: "Job title", "job title": "Job title", job_title: "Job title", designation: "Job title",
  phone: "Phone", mobile: "Phone", "phone number": "Phone", "mobile number": "Phone", "contact number": "Phone",
  email: "Email", "email id": "Email", "email address": "Email", mail: "Email",
  website: "Website", site: "Website", url: "Website", industry: "Industry", location: "Location", city: "Location", address: "Location",
  requirement: "Requirement", requirements: "Requirement", summary: "Requirement", description: "Requirement", notes: "Requirement", project_summary: "Requirement",
  budget: "Budget", estimated_budget: "Budget", source: "Source", "lead source": "Source", priority: "Priority", temperature: "Priority",
};
const normalise = (h: string) => ALIASES[h.trim().toLowerCase().replace(/[\s_]+/g, " ")] ?? ALIASES[h.trim().toLowerCase()] ?? null;

function parseTable(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  const tabs = lines.some((l) => l.includes("\t"));
  return lines.map((line) => (tabs ? line.split("\t") : line.split(",")).map((c) => c.trim().replace(/^"|"$/g, "")));
}
const toCsv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");

/* ---------------------------------------------------------------- manual form */
function ManualForm() {
  const { lookups, users } = useData();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<number | null>(null);
  const [saving, setSaving] = useState<"" | "open" | "another">("");
  const first = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canAssign = user?.role !== "executive";

  async function save(next: "open" | "another", force = false) {
    setSaving(next);
    setError("");
    setDuplicate(null);
    try {
      const r = await api.post<{ id: number }>("/leads", { ...form, assigned_to: canAssign ? form.assigned_to || undefined : undefined, force });
      toast("Lead added");
      if (next === "open") router.push(`/leads/${r.id}`);
      else {
        setForm(blank);
        first.current?.focus();
      }
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) setDuplicate(Number(e.data.duplicate_lead_id));
    } finally {
      setSaving("");
    }
  }

  const ready = form.company_name.trim() && (form.phone.trim() || form.email.trim());

  return (
    <form onSubmit={(e) => { e.preventDefault(); save("open"); }} className="space-y-6">
      {error && (
        <div className="space-y-2">
          <ErrorNote message={error} />
          {duplicate && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link href={`/leads/${duplicate}`} className="font-semibold text-indigo-600 hover:underline">Open the existing lead</Link>
              <Button type="button" variant="secondary" size="sm" onClick={() => save("open", true)}>Add anyway</Button>
            </div>
          )}
        </div>
      )}

      <Card title="1. The company" hover>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name *" className="sm:col-span-2"><Input ref={first} value={form.company_name} onChange={set("company_name")} placeholder="Acme Traders" autoFocus /></Field>
          <Field label="Industry"><Input value={form.industry} onChange={set("industry")} placeholder="Retail, healthcare, education…" /></Field>
          <Field label="Location"><Input value={form.location} onChange={set("location")} placeholder="City" /></Field>
          <Field label="Website" className="sm:col-span-2"><Input value={form.website} onChange={set("website")} placeholder="https://" /></Field>
        </div>
      </Card>

      <Card title="2. Who to contact" hover>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact person"><Input value={form.contact_name} onChange={set("contact_name")} placeholder="Priya Sharma" /></Field>
          <Field label="Job title"><Input value={form.job_title} onChange={set("job_title")} placeholder="Owner, Director…" /></Field>
          <Field label="Phone *" hint="A phone number or an email is required"><Input value={form.phone} onChange={set("phone")} type="tel" autoComplete="off" inputMode="tel" placeholder="+91 00000 00000" /></Field>
          <Field label="Alternate phone"><Input value={form.alt_phone} onChange={set("alt_phone")} type="tel" autoComplete="off" inputMode="tel" placeholder="+91 00000 00000" /></Field>
          <Field label="Email *" className="sm:col-span-2"><Input type="email" value={form.email} onChange={set("email")} placeholder="name@company.com" /></Field>
        </div>
      </Card>

      <Card title="3. The opportunity" hover>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What do they want built?" className="sm:col-span-2"><Textarea value={form.project_summary} onChange={set("project_summary")} placeholder="A few lines about the requirement" /></Field>
          <Field label="Where did this lead come from?">
            <Select value={form.source_id} onChange={set("source_id")}>
              <option value="">Select a source…</option>
              {lookups?.lead_sources.map((s) => <option key={s.id} value={s.id}>{cap(s.name)}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={set("priority")}>
              <option value="">Not set</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </Select>
          </Field>
          <Field label="Estimated budget (₹)"><Input value={form.estimated_budget} onChange={set("estimated_budget")} inputMode="numeric" placeholder="150000" /></Field>
          {canAssign && (
            <Field label="Owner" hint="Leave empty to keep it yourself">
              <Select value={form.assigned_to} onChange={set("assigned_to")}>
                <option value="">Me</option>
                {users.filter((u) => u.is_active && u.id !== user?.id).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </Select>
            </Field>
          )}
        </div>
      </Card>

      <div className="glass-strong sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3.5">
        <p className="text-sm text-slate-500">{ready ? "Ready to save." : "Add a company and a phone number or email to save."}</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={!ready} loading={saving === "another"} onClick={() => save("another")}>Save and add another</Button>
          <Button type="submit" disabled={!ready} loading={saving === "open"}>Save lead <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- bulk: file or paste */
function ResultPanel({ result, onReset }: { result: Result; onReset: () => void }) {
  return (
    <div className="animate-scale-in space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-5 ring-1 ring-emerald-200"><p className="font-display text-3xl font-bold text-emerald-700">{result.imported}</p><p className="text-sm font-medium text-emerald-700">leads imported</p></div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white p-5 ring-1 ring-amber-200"><p className="font-display text-3xl font-bold text-amber-700">{result.skipped}</p><p className="text-sm font-medium text-amber-700">rows skipped</p></div>
      </div>
      {result.problems.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Why rows were skipped</p>
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{result.problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Link href="/leads"><Button>View all leads <ArrowRight className="h-4 w-4" /></Button></Link>
        <Button variant="secondary" onClick={onReset}>Import more</Button>
      </div>
    </div>
  );
}

function BulkImport() {
  const [way, setWay] = useState<BulkWay>("file");
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const table = useMemo(() => (pasted.trim() ? parseTable(pasted) : []), [pasted]);
  const headers = table[0] ?? [];
  const mapped = headers.map(normalise);
  const hasCompany = mapped.includes("Company");
  const hasContactWay = mapped.includes("Phone") || mapped.includes("Email");
  const rows = table.slice(1);

  async function send(upload: File) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", upload);
      setResult(await api.upload<Result>("/leads/import", form));
      setFile(null);
      setPasted("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (result) return <ResultPanel result={result} onReset={() => setResult(null)} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {([["file", FileSpreadsheet, "Upload a file", "Excel (.xlsx) or CSV from your computer"], ["paste", ClipboardPaste, "Paste from Sheets", "Copy rows in Google Sheets or Excel and paste here"]] as const).map(([id, Icon, title, hint]) => (
          <button key={id} onClick={() => { setWay(id); setError(""); }} className={`group flex items-center gap-4 rounded-2xl p-4 text-left ring-1 transition-all ${way === id ? "bg-white shadow-lift ring-indigo-300" : "bg-white/60 ring-slate-200 hover:bg-white"}`}>
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105 ${way === id ? "bg-brand-gradient text-white shadow-glow" : "bg-slate-100 text-slate-500"}`}><Icon className="h-6 w-6" /></span>
            <span><span className="block text-sm font-bold text-slate-900">{title}</span><span className="block text-xs text-slate-500">{hint}</span></span>
          </button>
        ))}
      </div>

      {error && <ErrorNote message={error} />}

      {way === "file" ? (
        <div key="file" className="page-enter space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0] ?? null); }}
            onClick={() => input.current?.click()}
            className={`group flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-all duration-300 ${dragging ? "scale-[1.01] border-indigo-500 bg-indigo-50 shadow-glow" : file ? "border-emerald-400 bg-emerald-50/50" : "border-slate-300 bg-white/50 hover:border-indigo-400 hover:bg-indigo-50/40"}`}
          >
            <span className={`grid h-16 w-16 place-items-center rounded-2xl ring-1 transition-transform duration-300 group-hover:-translate-y-1 ${file ? "bg-emerald-100 text-emerald-600 ring-emerald-200" : "bg-gradient-to-br from-indigo-50 to-white text-indigo-500 ring-indigo-100"}`}>{file ? <CheckCircle2 className="h-8 w-8" /> : <FileUp className="h-8 w-8" />}</span>
            <p className="text-base font-bold text-slate-800">{file ? file.name : "Drop an Excel or CSV file here"}</p>
            <p className="text-sm text-slate-500">{file ? `${(file.size / 1024).toFixed(0)} KB, ready to import` : "or click to choose a file. The first row must hold the column names."}</p>
            <input ref={input} type="file" accept=".csv,.xlsx,.xlsm" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex justify-end gap-2">
            {file && <Button variant="ghost" onClick={() => setFile(null)}><Trash2 className="h-4 w-4" /> Remove</Button>}
            <Button onClick={() => file && send(file)} loading={busy} disabled={!file}><Upload className="h-4 w-4" /> Import leads</Button>
          </div>
        </div>
      ) : (
        <div key="paste" className="page-enter space-y-4">
          <Field label="Paste your rows here" hint="Include the header row. Copying cells from Google Sheets or Excel works as it is.">
            <Textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={7} placeholder={"Company\tName\tPhone\tEmail\nAcme Traders\tPriya Sharma\t9876543210\tpriya@acme.com"} className="font-mono text-xs" />
          </Field>

          {table.length > 0 && (
            <div className="animate-fade-up space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Columns found:</span>
                {headers.map((h, i) => (
                  <span key={i} className={`rounded-full px-2.5 py-1 font-semibold ring-1 ${mapped[i] ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>{h || "(empty)"}{mapped[i] ? ` → ${mapped[i]}` : " (ignored)"}</span>
                ))}
              </div>
              {(!hasCompany || !hasContactWay) && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{!hasCompany ? "There is no Company column, so no row can be imported. " : ""}{!hasContactWay ? "Add a Phone or Email column so the team can reach each lead." : ""}</p>
              )}
              <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400"><tr>{headers.map((h, i) => <th key={i} className="px-3 py-2.5">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 6).map((r, i) => <tr key={i}>{headers.map((_, c) => <td key={c} className="max-w-[180px] truncate px-3 py-2 text-slate-700">{r[c]}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">{rows.length} row{rows.length === 1 ? "" : "s"} found{rows.length > 6 ? `, showing the first 6` : ""}. Rows without a company, or matching an existing phone or email, are skipped.</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {pasted && <Button variant="ghost" onClick={() => setPasted("")}><Trash2 className="h-4 w-4" /> Clear</Button>}
            <Button onClick={() => send(new File([toCsv(table)], "pasted.csv", { type: "text/csv" }))} loading={busy} disabled={!hasCompany || rows.length === 0}><Table2 className="h-4 w-4" /> Import {rows.length || ""} row{rows.length === 1 ? "" : "s"}</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-white p-4 ring-1 ring-indigo-100">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
          <p className="text-sm text-slate-600"><strong className="text-slate-800">Company</strong> is required, plus a <strong className="text-slate-800">Phone</strong> or <strong className="text-slate-800">Email</strong>. Optional: Name, Job title, Website, Industry, Location, Requirement, Budget, Source, Priority.</p>
        </div>
        <a href="/api/leads/import/template"><Button variant="secondary" size="sm"><Download className="h-4 w-4" /> Download template</Button></a>
      </div>
    </div>
  );
}

export default function ImportPage() {
  const [mode, setMode] = useState<Mode>("manual");

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "bulk" || tab === "manual") setMode(tab);
  }, []);

  function choose(m: Mode) {
    setMode(m);
    window.history.replaceState(null, "", `/import?tab=${m}`);
  }

  return (
    <>
      <PageHeader title="Add leads" subtitle="Enter one lead by hand, or bring many at once from Excel or Google Sheets." />

      <div className="glass-strong mb-6 inline-flex rounded-2xl p-1.5" role="tablist">
        {([["manual", UserPlus, "Add one lead"], ["bulk", FileSpreadsheet, "Bulk import"]] as const).map(([id, Icon, label]) => (
          <button key={id} role="tab" aria-selected={mode === id} onClick={() => choose(id)} className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${mode === id ? "bg-brand-gradient text-white shadow-glow" : "text-slate-500 hover:text-slate-800"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl">
        <div key={mode} className="page-enter">{mode === "manual" ? <ManualForm /> : <BulkImport />}</div>
      </div>
    </>
  );
}
