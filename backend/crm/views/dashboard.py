"""Dashboard for CRM Administrators only. Every number comes from ONE SQL statement (one trip to the database)."""
from ..common import to_int
from ..db import fetch_one
from ..http import api, ok


def rows(sql: str) -> str:
    """Wrap a SELECT so it returns all its rows as a JSON array."""
    return f"(SELECT coalesce(json_agg(t), '[]'::json) FROM ({sql}) t)"


def row(sql: str) -> str:
    """Wrap a single-row SELECT so it returns that row as a JSON object."""
    return f"(SELECT row_to_json(t) FROM ({sql}) t)"


def build_sql(days: int) -> str:
    since = f"now() - make_interval(days => {days})"  # days is an int we parsed, not user text
    parts = {
        "lead_kpis": row(
            f"""
            SELECT count(*) AS total_leads,
              count(*) FILTER (WHERE l.created_at >= {since}) AS new_leads,
              count(*) FILTER (WHERE s.name = 'won') AS won,
              count(*) FILTER (WHERE s.name = 'lost') AS lost,
              count(*) FILTER (WHERE s.name = 'won' AND l.closed_at >= {since}) AS won_in_range,
              coalesce(sum(l.deal_value) FILTER (WHERE s.name = 'won' AND l.closed_at >= {since}), 0) AS revenue,
              coalesce(sum(l.estimated_budget) FILTER (WHERE s.name NOT IN ('won','lost')), 0) AS pipeline_value,
              count(*) FILTER (WHERE s.name NOT IN ('won','lost')) AS open_leads,
              round((avg(extract(epoch FROM (l.closed_at - l.created_at)) / 86400)
                    FILTER (WHERE s.name = 'won'))::numeric, 1) AS avg_days_to_win
            FROM leads l JOIN pipeline_stages s ON s.id = l.stage_id
            """
        ),
        "follow_up_kpis": row(
            """
            SELECT count(*) FILTER (WHERE status = 'pending' AND due_at < now()) AS overdue_follow_ups,
                   count(*) FILTER (WHERE status = 'pending' AND due_at::date = now()::date) AS follow_ups_today
            FROM follow_ups
            """
        ),
        "meetings_today": "(SELECT count(*) FROM meetings WHERE start_at::date = now()::date AND status = 'scheduled')",
        "avg_rounds": (
            "(SELECT coalesce(round(avg(n), 1), 0) FROM "
            "(SELECT count(*) AS n FROM prototype_revisions GROUP BY lead_id) t)"
        ),
        "funnel": rows(
            "SELECT s.id, s.name, s.position, count(l.id) AS count, coalesce(sum(l.estimated_budget), 0) AS value "
            "FROM pipeline_stages s LEFT JOIN leads l ON l.stage_id = s.id GROUP BY s.id ORDER BY s.position"
        ),
        "by_source": rows(
            f"""
            SELECT coalesce(src.name, 'unknown') AS source, count(*) AS total,
                   count(*) FILTER (WHERE s.name = 'won') AS won
            FROM leads l JOIN pipeline_stages s ON s.id = l.stage_id
            LEFT JOIN lead_sources src ON src.id = l.source_id
            WHERE l.created_at >= {since} GROUP BY 1 ORDER BY total DESC
            """
        ),
        "team": rows(
            f"""
            SELECT u.id, u.full_name, r.name AS role,
              (SELECT count(*) FROM leads l WHERE l.created_by = u.id AND l.created_at >= {since}) AS leads_added,
              (SELECT count(*) FROM leads l JOIN pipeline_stages s ON s.id = l.stage_id
                 WHERE l.assigned_to = u.id AND s.name NOT IN ('won','lost')) AS open_leads,
              (SELECT count(*) FROM leads l JOIN pipeline_stages s ON s.id = l.stage_id
                 WHERE l.assigned_to = u.id AND s.name = 'won' AND l.closed_at >= {since}) AS won,
              (SELECT count(*) FROM activities a WHERE a.user_id = u.id AND a.occurred_at >= {since}) AS activities,
              (SELECT count(*) FROM follow_ups f
                 WHERE f.assigned_to = u.id AND f.status = 'pending' AND f.due_at < now()) AS overdue
            FROM users u JOIN roles r ON r.id = u.role_id WHERE u.is_active ORDER BY won DESC, activities DESC
            """
        ),
        "trend": rows(
            """
            SELECT to_char(w.week, 'DD Mon') AS label,
                   (SELECT count(*) FROM leads l WHERE date_trunc('week', l.created_at) = w.week) AS created,
                   (SELECT count(*) FROM leads l JOIN pipeline_stages s ON s.id = l.stage_id
                     WHERE s.name = 'won' AND date_trunc('week', l.closed_at) = w.week) AS won
            FROM generate_series(date_trunc('week', now()) - interval '11 weeks',
                                 date_trunc('week', now()), interval '1 week') AS w(week)
            ORDER BY w.week
            """
        ),
        "lost_reasons": rows(
            """
            SELECT coalesce(r.name, 'not recorded') AS reason, count(*) AS count FROM leads l
            JOIN pipeline_stages s ON s.id = l.stage_id LEFT JOIN lost_reasons r ON r.id = l.lost_reason_id
            WHERE s.name = 'lost' GROUP BY 1 ORDER BY count DESC
            """
        ),
        "recent_activity": rows(
            """
            SELECT a.id, a.lead_id, t.name AS type, a.summary, a.occurred_at, u.full_name AS user_name, c.name AS company
            FROM activities a JOIN activity_types t ON t.id = a.type_id LEFT JOIN users u ON u.id = a.user_id
            JOIN leads l ON l.id = a.lead_id JOIN companies c ON c.id = l.company_id
            ORDER BY a.occurred_at DESC LIMIT 8
            """
        ),
        "upcoming_follow_ups": rows(
            """
            SELECT f.id, f.lead_id, f.due_at, f.purpose, c.name AS company, u.full_name AS assigned_name,
                   (f.due_at < now()) AS overdue
            FROM follow_ups f JOIN leads l ON l.id = f.lead_id JOIN companies c ON c.id = l.company_id
            LEFT JOIN users u ON u.id = f.assigned_to
            WHERE f.status = 'pending' ORDER BY f.due_at LIMIT 8
            """
        ),
    }
    return "SELECT json_build_object(" + ", ".join(f"'{k}', {v}" for k, v in parts.items()) + ") AS data"


@api("GET", roles=("admin",))
def dashboard(request):
    days = min(max(to_int(request.GET.get("days")) or 30, 1), 730)
    data = fetch_one(build_sql(days))["data"]

    kpis = {**data.pop("lead_kpis"), **data.pop("follow_up_kpis")}
    kpis["meetings_today"] = data.pop("meetings_today")
    kpis["avg_rounds"] = float(data.pop("avg_rounds"))
    closed = kpis["won"] + kpis["lost"]
    kpis["win_rate"] = round(100.0 * kpis["won"] / closed, 1) if closed else 0
    return ok({"days": days, "kpis": kpis, **data})
