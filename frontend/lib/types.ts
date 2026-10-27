export type RoleName = "admin" | "technical_analyst" | "business_development_executive";

export interface User {
  id: number;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: RoleName;
  role_id: number;
  is_active: boolean;
}

export interface Named {
  id: number;
  name: string;
}

export interface Stage extends Named {
  position: number;
  owner_role: number | null;
  owner_role_name: string | null;
}

export interface Lookups {
  roles: Named[];
  stages: Stage[];
  lead_sources: Named[];
  lost_reasons: Named[];
  activity_types: Named[];
  call_outcomes: Named[];
  revision_types: Named[];
  revision_statuses: Named[];
  tech_stacks: Named[];
}

export interface LeadRow {
  id: number;
  project_summary: string | null;
  estimated_budget: number | null;
  priority: "high" | "medium" | "low" | null;
  stage_id: number;
  stage: string;
  stage_position: number;
  stage_changed_at: string;
  created_at: string;
  assigned_to: number | null;
  assigned_name: string | null;
  created_by: number | null;
  company_id: number;
  company: string;
  industry: string | null;
  location: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  source_id: number | null;
  next_follow_up: string | null;
}

export interface Contact {
  id: number;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  is_primary: boolean;
}

export interface HistoryRow {
  id: number;
  from_stage: string | null;
  to_stage: string;
  changed_by: string | null;
  changed_at: string;
  note: string | null;
}

export interface LeadDetail extends LeadRow {
  website: string | null;
  deal_value: number | null;
  closed_at: string | null;
  lost_reason_id: number | null;
  primary_contact_id: number | null;
  contacts: Contact[];
  history: HistoryRow[];
}

export interface Activity {
  id: number;
  type: string;
  outcome: string | null;
  summary: string | null;
  occurred_at: string;
  user_name: string | null;
  contact_name: string | null;
}

export interface FollowUp {
  id: number;
  lead_id?: number;
  due_at: string;
  purpose: string | null;
  status: "pending" | "done" | "cancelled";
  completed_at: string | null;
  assigned_to: number | null;
  assigned_name: string | null;
  company?: string;
  contact_name?: string | null;
  phone?: string | null;
  overdue?: boolean;
}

export interface Feature {
  id?: number;
  title: string;
  description?: string | null;
  priority: "must" | "should" | "nice";
}

export interface Requirements {
  id: number;
  project_type: "web" | "mobile" | "both" | "other" | null;
  expected_timeline: string | null;
  budget: number | null;
  notes: string | null;
  status: "pending" | "received" | "confirmed";
  tech_stack_ids: number[];
  features: Feature[];
}

export interface Revision {
  id: number;
  round_number: number;
  description: string | null;
  deadline: string | null;
  prototype_link: string | null;
  presented_at: string | null;
  type_id: number;
  type: string;
  status_id: number;
  status: string;
  assigned_to: number | null;
  assigned_name: string | null;
  feedback: { id: number; feedback: string; received_at: string; recorded_by: string | null }[];
}

export interface Meeting {
  id: number;
  series_id: number | null;
  lead_id: number | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  meeting_link: string | null;
  status: "scheduled" | "done" | "cancelled";
  organizer_id: number | null;
  organizer_name: string | null;
  company: string | null;
  attendees: { email: string; name: string | null; invited: boolean }[];
}

export interface Attachment {
  id: number;
  file_name: string;
  size_bytes: number | null;
  revision_id: number | null;
  created_at: string;
  uploaded_by: string | null;
}

export interface DashboardData {
  days: number;
  kpis: {
    total_leads: number;
    new_leads: number;
    won: number;
    lost: number;
    won_in_range: number;
    revenue: number;
    pipeline_value: number;
    open_leads: number;
    avg_days_to_win: number | null;
    overdue_follow_ups: number;
    follow_ups_today: number;
    meetings_today: number;
    win_rate: number;
    avg_rounds: number;
  };
  funnel: { id: number; name: string; position: number; count: number; value: number }[];
  by_source: { source: string; total: number; won: number }[];
  team: {
    id: number;
    full_name: string;
    role: string;
    leads_added: number;
    open_leads: number;
    won: number;
    activities: number;
    overdue: number;
  }[];
  trend: { label: string; created: number; won: number }[];
  lost_reasons: { reason: string; count: number }[];
  recent_activity: { id: number; lead_id: number; type: string; summary: string | null; occurred_at: string; user_name: string | null; company: string }[];
  upcoming_follow_ups: { id: number; lead_id: number; due_at: string; purpose: string | null; company: string; assigned_name: string | null; overdue: boolean }[];
}
