"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Check, Mail, Minus, Pencil, Phone, ShieldCheck, UserPlus, Users, Wrench } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth, useData } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import type { User } from "@/lib/types";
import { Avatar } from "@/components/fx/effects";
import { Badge, Button, Card, ErrorNote, Field, Input, Modal, PageHeader, Select, Spinner, useToast } from "@/components/ui";

const ROLE_STYLE: Record<string, { badge: string; icon: typeof ShieldCheck }> = {
  admin: { badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", icon: ShieldCheck },
  technical_analyst: { badge: "bg-amber-50 text-amber-700 ring-amber-200", icon: BarChart3 },
  business_development: { badge: "bg-slate-100 text-slate-700 ring-slate-200", icon: Wrench },
};

const PERMISSIONS: { what: string; admin: boolean; technical_analyst: boolean; business_development: boolean }[] = [
  { what: "See every lead", admin: true, technical_analyst: false, business_development: false },
  { what: "See leads from the prototype stage onward", admin: true, technical_analyst: true, business_development: false },
  { what: "See leads they added or own", admin: true, technical_analyst: true, business_development: true },
  { what: "Add, import and edit leads", admin: true, technical_analyst: true, business_development: true },
  { what: "Log calls, follow-ups and meetings", admin: true, technical_analyst: true, business_development: true },
  { what: "Reassign a lead to someone else", admin: true, technical_analyst: true, business_development: false },
  { what: "Delete a lead", admin: true, technical_analyst: false, business_development: false },
  { what: "Open the dashboard", admin: true, technical_analyst: false, business_development: false },
  { what: "Manage team members and settings", admin: true, technical_analyst: false, business_development: false },
];

function UserModal({ target, onClose, onSaved }: { target: User | "new" | null; onClose: () => void; onSaved: () => void }) {
  const { lookups } = useData();
  const { user: me } = useAuth();
  const toast = useToast();
  const editing = target && target !== "new" ? target : null;
  const [form, setForm] = useState({ email: "", full_name: "", phone: "", role_id: "", password: "", is_active: true });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setError("");
    setForm(editing
      ? { email: editing.email ?? "", full_name: editing.full_name, phone: editing.phone ?? "", role_id: String(editing.role_id), password: "", is_active: editing.is_active }
      : { email: "", full_name: "", phone: "", role_id: String(lookups?.roles.find((r) => r.name === "business_development")?.id ?? ""), password: "", is_active: true });
  }, [target, editing, lookups]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.patch(`/users/${editing.id}`, { full_name: form.full_name, phone: form.phone, role_id: form.role_id, is_active: form.is_active, ...(form.password ? { password: form.password } : {}) });
      } else {
        await api.post("/users", form);
      }
      toast(editing ? "Saved" : "Team member added");
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const isSelf = editing?.id === me?.id;
  return (
    <Modal open={target !== null} title={editing ? `Edit ${editing.full_name}` : "Add a team member"} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
      {error && <ErrorNote message={error} />}
      <Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoFocus /></Field>
      <Field label="Email (used to sign in)"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} /></Field>
      <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Role" hint={isSelf ? "You cannot change your own role" : "What each role can do is listed on this page"}>
        <Select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} disabled={isSelf}>
          {lookups?.roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>)}
        </Select>
      </Field>
      <Field label={editing ? "New password (leave empty to keep the current one)" : "Password"} hint="At least 8 characters">
        <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
      </Field>
      {editing && !isSelf && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /> Can sign in
        </label>
      )}
    </Modal>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const { users, lookups, reload } = useData();
  const router = useRouter();
  const [target, setTarget] = useState<User | "new" | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/leads");
  }, [user, router]);

  if (!user || user.role !== "admin" || !lookups) return <Spinner />;
  const active = users.filter((u) => u.is_active).length;

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`${active} active member${active === 1 ? "" : "s"}. Add people, change roles and reset passwords here.`}
        actions={<Button onClick={() => setTarget("new")}><UserPlus className="h-4 w-4" /> Add team member</Button>}
      />

      <div className="stagger mb-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {users.map((u) => {
          const style = ROLE_STYLE[u.role] ?? ROLE_STYLE.business_development;
          return (
            <article key={u.id} className={`glass hover-lift group relative overflow-hidden rounded-3xl p-6 ${u.is_active ? "" : "opacity-60"}`}>
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/20 to-cyan-glow/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />
              <div className="relative flex items-start justify-between gap-3">
                <Avatar name={u.full_name} size={60} className="!rounded-2xl text-xl shadow-lg" />
                <button onClick={() => setTarget(u)} aria-label={`Edit ${u.full_name}`} className="grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-slate-500 opacity-70 ring-1 ring-slate-200 transition-all hover:bg-white hover:text-indigo-600 group-hover:opacity-100"><Pencil className="h-4 w-4" /></button>
              </div>
              <h3 className="relative mt-4 text-lg font-bold text-slate-900">{u.full_name}</h3>
              <div className="relative mt-2 flex flex-wrap items-center gap-2">
                <Badge className={style.badge}><style.icon className="h-3.5 w-3.5" />{roleLabel(u.role)}</Badge>
                {!u.is_active && <Badge className="bg-slate-100 text-slate-500 ring-slate-200">Disabled</Badge>}
              </div>
              <dl className="relative mt-4 space-y-1.5 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><dd className="min-w-0 break-all">{u.email}</dd></div>
                {u.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-400" /><dd>{u.phone}</dd></div>}
              </dl>
            </article>
          );
        })}
      </div>

      <Card title={<span className="flex items-center gap-2"><Users className="h-4 w-4 text-indigo-500" /> What each role can do</span>} padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Permission</th>
                {(["admin", "technical_analyst", "business_development"] as const).map((r) => <th key={r} className="px-4 py-3.5 text-center">{roleLabel(r)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PERMISSIONS.map((p) => (
                <tr key={p.what} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-6 py-3 font-medium text-slate-700">{p.what}</td>
                  {(["admin", "technical_analyst", "business_development"] as const).map((r) => (
                    <td key={r} className="px-4 py-3 text-center">
                      {p[r] ? <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-3.5 w-3.5" /></span> : <Minus className="mx-auto h-4 w-4 text-slate-300" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <UserModal target={target} onClose={() => setTarget(null)} onSaved={reload} />
    </>
  );
}
