"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, BellRing, CalendarDays, ChevronDown, ChevronRight, FileUp, LayoutDashboard, LogOut, Menu, Plus, Search, SlidersHorizontal, Target, UserPlus, UserRound, Users, Video, X } from "lucide-react";
import { useAuth, DataProvider } from "@/lib/auth";
import { api } from "@/lib/api";
import type { FollowUp } from "@/lib/types";
import { roleLabel } from "@/lib/format";
import { Logo } from "./Logo";
import { CommandPalette } from "./CommandPalette";
import { Avatar, BrandLoader } from "./fx/effects";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { href: "/leads", label: "Leads", icon: Target, roles: ["admin", "technical_analyst", "business_development"] },
  { href: "/follow-ups", label: "Follow-ups", icon: BellRing, roles: ["admin", "technical_analyst", "business_development"] },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, roles: ["admin", "technical_analyst", "business_development"] },
  { href: "/import", label: "Add leads", icon: FileUp, roles: ["admin", "technical_analyst", "business_development"] },
  { href: "/team", label: "Team", icon: Users, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal, roles: ["admin"] },
];

/** The search field in the top bar. It opens the command palette, where the real searching happens. */
function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Search leads, people and pages"
      className="group relative min-w-0 flex-1 rounded-2xl bg-gradient-to-r from-slate-200 via-indigo-200 to-cyan-glow/50 p-px text-left shadow-sm transition-all duration-300 hover:from-indigo-500 hover:via-cyan-glow hover:to-gold-400 hover:shadow-[0_10px_30px_-10px_rgb(21_88_224/0.5)] sm:max-w-xl"
    >
      <span className="flex items-center gap-3 rounded-[15px] bg-white py-2 pl-2 pr-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-md transition-transform duration-300 group-hover:scale-110"><Search className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-700">Search anything</span>
          <span className="hidden truncate text-[11px] text-slate-400 sm:block">Leads, people, companies, pages and quick actions</span>
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <kbd className="rounded-md bg-slate-100 px-1.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">Ctrl</kbd>
          <kbd className="rounded-md bg-slate-100 px-1.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">K</kbd>
        </span>
      </span>
    </button>
  );
}

/** One button for everything you create. */
function QuickAdd() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-quick-add]") && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const items = [
    { icon: UserPlus, title: "New lead", hint: "Add one lead by hand", run: () => router.push("/import?tab=manual"), tone: "from-indigo-600 to-cyan-glow" },
    { icon: FileUp, title: "Import leads", hint: "Upload Excel or paste from Sheets", run: () => router.push("/import?tab=bulk"), tone: "from-emerald-600 to-emerald-300" },
    { icon: Video, title: "Schedule meeting", hint: "One-off or repeating, with invites", run: () => { sessionStorage.setItem("crm-open-meeting", "1"); router.push("/calendar"); window.dispatchEvent(new Event("crm:add-meeting")); }, tone: "from-gold-500 to-gold-300" },
  ];
  return (
    <div className="relative" data-quick-add>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 active:translate-y-0 sm:px-4">
        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New</span> <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="glass-strong animate-scale-in absolute right-0 top-12 z-50 w-72 rounded-2xl p-1.5">
          {items.map((it) => (
            <button key={it.title} onClick={() => { setOpen(false); it.run(); }} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-50">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${it.tone} text-white shadow-md transition-transform group-hover:scale-105`}><it.icon className="h-5 w-5" /></span>
              <span><span className="block text-sm font-bold text-slate-900">{it.title}</span><span className="block text-xs text-slate-500">{it.hint}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Avatar in the top bar: opens a small menu with Profile and Sign out. */
function UserMenu({ name, role, onLogout }: { name: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-user-menu]") && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="relative" data-user-menu>
      <button onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open} className="rounded-xl p-0.5 transition-transform hover:scale-105"><Avatar name={name} size={36} /></button>
      {open && (
        <div className="glass-strong animate-scale-in absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl p-1.5">
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar name={name} size={40} />
            <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{name}</p><p className="text-xs font-medium text-indigo-600">{roleLabel(role)}</p></div>
          </div>
          <div className="my-1 h-px bg-slate-200/70" />
          <Link href="/profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"><UserRound className="h-4 w-4" /> Profile & password</Link>
          <button onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [overdue, setOverdue] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  // Ctrl+K / Cmd+K opens the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // overdue follow-ups for the bell
  useEffect(() => {
    if (!user) return;
    api
      .get<{ follow_ups: FollowUp[] }>("/follow-ups?status=pending&mine=1")
      .then((r) => setOverdue(r.follow_ups.filter((f) => f.overdue).length))
      .catch(() => undefined);
  }, [user, pathname]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="aurora" />
        <BrandLoader size={96} />
      </div>
    );
  }

  const items = NAV.filter((n) => n.roles.includes(user.role));
  const isActive = (href: string) => pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-4 pt-6">
        <Link href={user.role === "admin" ? "/dashboard" : "/leads"} aria-label="Home"><Logo height={34} priority /></Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${active ? "bg-brand-gradient text-white shadow-glow" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`}
            >
              <Icon className={`h-[18px] w-[18px] transition-transform duration-200 ${active ? "" : "group-hover:scale-110"}`} />
              {label}
              {href === "/follow-ups" && overdue > 0 && (
                <span className={`ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${active ? "bg-white/25 text-white" : "bg-rose-500 text-white"}`}>{overdue}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/profile"
        className={`group m-3 flex items-center gap-3 rounded-2xl p-3 ring-1 transition-all ${pathname.startsWith("/profile") ? "bg-brand-gradient text-white shadow-glow ring-transparent" : "bg-gradient-to-br from-indigo-50 to-white ring-indigo-100/80 hover:shadow-md hover:ring-indigo-300"}`}
      >
        <Avatar name={user.full_name} size={40} ring />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-bold ${pathname.startsWith("/profile") ? "text-white" : "text-slate-900"}`}>{user.full_name}</p>
          <p className={`text-xs font-medium ${pathname.startsWith("/profile") ? "text-indigo-100" : "text-indigo-600"}`}>{roleLabel(user.role)} · Profile</p>
        </div>
        <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${pathname.startsWith("/profile") ? "text-white" : "text-slate-400"}`} />
      </Link>
    </div>
  );

  return (
    <DataProvider>
      <div className="aurora" />
      <div className="min-h-screen min-w-0 md:pl-72">
        <aside className="glass-strong fixed bottom-4 left-4 top-4 z-30 hidden w-64 overflow-hidden rounded-3xl md:block">{sidebar}</aside>

        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="animate-fade-in absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <aside className="glass-strong animate-slide-in absolute inset-y-3 left-3 w-72 overflow-hidden rounded-3xl">{sidebar}</aside>
          </div>
        )}

        {/* top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="glass-strong flex w-full max-w-7xl items-center gap-3 rounded-2xl px-3 py-2 sm:mx-auto">
            <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-900/5 md:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <SearchTrigger onOpen={() => setPaletteOpen(true)} />
            <div className="ml-auto flex items-center gap-2">
              <QuickAdd />
              <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
              <Link href="/follow-ups" aria-label={`${overdue} overdue follow-ups`} className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                <Bell className="h-5 w-5" />
                {overdue > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 animate-pulse-glow place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{overdue}</span>}
              </Link>
              <UserMenu name={user.full_name} role={user.role} onLogout={() => logout().then(() => router.replace("/"))} />
            </div>
          </div>
        </header>

        <main key={pathname} className="page-enter mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </DataProvider>
  );
}
