"""Work on a lead: activities (call log), follow-ups, requirements, prototype revisions."""
from ..common import (
    ApiError,
    build_update,
    clean,
    get_lead,
    lead_scope,
    parse_dt,
    require,
    to_int,
    to_num,
)
from ..db import execute, fetch_all, fetch_one, transaction
from ..http import api, ok


# ---------------- activities ----------------
@api("GET", "POST")
def activities(request, lead_id):
    user = request.user_row
    get_lead(user, lead_id)
    if request.method == "GET":
        rows = fetch_all(
            "SELECT a.id, t.name AS type, o.name AS outcome, a.summary, a.occurred_at, "
            "u.full_name AS user_name, ct.name AS contact_name "
            "FROM activities a JOIN activity_types t ON t.id = a.type_id "
            "LEFT JOIN call_outcomes o ON o.id = a.outcome_id "
            "LEFT JOIN users u ON u.id = a.user_id LEFT JOIN contacts ct ON ct.id = a.contact_id "
            "WHERE a.lead_id = %s ORDER BY a.occurred_at DESC, a.id DESC",
            [lead_id],
        )
        return ok({"activities": rows})

    data = request.json
    require(data, "type_id")
    follow = data.get("follow_up") or {}
    with transaction() as conn:
        row = execute(
            "INSERT INTO activities (lead_id, contact_id, user_id, type_id, outcome_id, summary, occurred_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, COALESCE(%s, now())) RETURNING id",
            [
                lead_id,
                to_int(data.get("contact_id")),
                user["id"],
                to_int(data["type_id"], "type"),
                to_int(data.get("outcome_id")),
                clean(data.get("summary")),
                parse_dt(data.get("occurred_at")),
            ],
            conn=conn,
        )
        if clean(follow.get("due_at")):  # schedule the next follow-up from the same dialog
            execute(
                "INSERT INTO follow_ups (lead_id, assigned_to, due_at, purpose) VALUES (%s, %s, %s, %s)",
                [
                    lead_id,
                    to_int(follow.get("assigned_to")) or user["id"],
                    parse_dt(follow["due_at"], "follow-up date"),
                    clean(follow.get("purpose")),
                ],
                conn=conn,
            )
    return ok({"id": row["id"]}, 201)


# ---------------- follow-ups ----------------
@api("GET")
def follow_ups(request):
    user = request.user_row
    scope_sql, params = lead_scope(user)
    where = [scope_sql]
    get = request.GET
    status = get.get("status", "pending")
    if status != "all":
        where.append("f.status = %s")
        params.append(status)
    if get.get("mine", "1") == "1":
        where.append("f.assigned_to = %s")
        params.append(user["id"])
    rows = fetch_all(
        "SELECT f.id, f.lead_id, f.due_at, f.purpose, f.status, f.completed_at, f.assigned_to, "
        "u.full_name AS assigned_name, c.name AS company, ct.name AS contact_name, ct.phone, "
        "(f.status = 'pending' AND f.due_at < now()) AS overdue "
        "FROM follow_ups f JOIN leads l ON l.id = f.lead_id JOIN companies c ON c.id = l.company_id "
        "LEFT JOIN contacts ct ON ct.id = l.primary_contact_id LEFT JOIN users u ON u.id = f.assigned_to "
        f"WHERE {' AND '.join(where)} ORDER BY f.due_at LIMIT 500",
        params,
    )
    return ok({"follow_ups": rows})


@api("GET", "POST")
def lead_follow_ups(request, lead_id):
    user = request.user_row
    get_lead(user, lead_id)
    if request.method == "GET":
        rows = fetch_all(
            "SELECT f.id, f.due_at, f.purpose, f.status, f.completed_at, f.assigned_to, u.full_name AS assigned_name "
            "FROM follow_ups f LEFT JOIN users u ON u.id = f.assigned_to "
            "WHERE f.lead_id = %s ORDER BY f.status = 'pending' DESC, f.due_at",
            [lead_id],
        )
        return ok({"follow_ups": rows})
    data = request.json
    require(data, "due_at")
    row = execute(
        "INSERT INTO follow_ups (lead_id, assigned_to, due_at, purpose) VALUES (%s, %s, %s, %s) RETURNING id",
        [lead_id, to_int(data.get("assigned_to")) or user["id"], parse_dt(data["due_at"], "due date"), clean(data.get("purpose"))],
    )
    return ok({"id": row["id"]}, 201)


@api("PATCH")
def follow_up_item(request, follow_up_id):
    user = request.user_row
    row = fetch_one("SELECT lead_id FROM follow_ups WHERE id = %s", [follow_up_id])
    if not row:
        raise ApiError("Follow-up not found", 404)
    get_lead(user, row["lead_id"])
    data = request.json
    action = data.get("action")
    if action == "complete":
        execute("UPDATE follow_ups SET status='done', completed_at=now() WHERE id=%s", [follow_up_id])
    elif action == "cancel":
        execute("UPDATE follow_ups SET status='cancelled' WHERE id=%s", [follow_up_id])
    elif action == "reschedule":
        require(data, "due_at")
        execute(
            "UPDATE follow_ups SET due_at=%s, status='pending', completed_at=NULL, reminder_sent_at=NULL WHERE id=%s",
            [parse_dt(data["due_at"], "due date"), follow_up_id],
        )
    else:
        raise ApiError("Unknown action")
    return ok()


# ---------------- requirements ----------------
def read_requirements(lead_id):
    req = fetch_one("SELECT * FROM requirements WHERE lead_id = %s", [lead_id])
    if not req:
        return {"requirements": None}
    req["tech_stack_ids"] = [
        r["tech_stack_id"]
        for r in fetch_all("SELECT tech_stack_id FROM requirement_tech_stacks WHERE requirement_id = %s", [req["id"]])
    ]
    req["features"] = fetch_all(
        "SELECT id, title, description, priority FROM requirement_features WHERE requirement_id = %s ORDER BY id",
        [req["id"]],
    )
    return {"requirements": req}


@api("GET", "PUT")
def requirements(request, lead_id):
    get_lead(request.user_row, lead_id)
    if request.method == "GET":
        return ok(read_requirements(lead_id))
    data = request.json
    status = data.get("status") or "pending"
    if status not in ("pending", "received", "confirmed"):
        raise ApiError("Unknown status")
    if clean(data.get("project_type")) not in (None, "web", "mobile", "both", "other"):
        raise ApiError("Unknown project type")
    with transaction() as conn:
        req = execute(
            "INSERT INTO requirements (lead_id, project_type, expected_timeline, budget, notes, status, received_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, CASE WHEN %s <> 'pending' THEN now() END) "
            "ON CONFLICT (lead_id) DO UPDATE SET project_type = EXCLUDED.project_type, "
            "expected_timeline = EXCLUDED.expected_timeline, budget = EXCLUDED.budget, notes = EXCLUDED.notes, "
            "status = EXCLUDED.status, "
            "received_at = COALESCE(requirements.received_at, EXCLUDED.received_at) RETURNING id",
            [
                lead_id,
                clean(data.get("project_type")),
                clean(data.get("expected_timeline")),
                to_num(data.get("budget"), "budget"),
                clean(data.get("notes")),
                status,
                status,
            ],
            conn=conn,
        )
        execute("DELETE FROM requirement_tech_stacks WHERE requirement_id = %s", [req["id"]], conn=conn)
        for tech_id in set(data.get("tech_stack_ids") or []):
            execute(
                "INSERT INTO requirement_tech_stacks (requirement_id, tech_stack_id) VALUES (%s, %s)",
                [req["id"], to_int(tech_id)],
                conn=conn,
            )
        execute("DELETE FROM requirement_features WHERE requirement_id = %s", [req["id"]], conn=conn)
        for feature in data.get("features") or []:
            if not clean(feature.get("title")):
                continue
            priority = feature.get("priority") if feature.get("priority") in ("must", "should", "nice") else "should"
            execute(
                "INSERT INTO requirement_features (requirement_id, title, description, priority) VALUES (%s, %s, %s, %s)",
                [req["id"], feature["title"].strip(), clean(feature.get("description")), priority],
                conn=conn,
            )
    return ok(read_requirements(lead_id))


# ---------------- prototype revisions ----------------
REVISION_SQL = """
    SELECT r.id, r.lead_id, r.round_number, r.description, r.deadline, r.prototype_link, r.presented_at,
           r.type_id, t.name AS type, r.status_id, s.name AS status, r.assigned_to, u.full_name AS assigned_name
    FROM prototype_revisions r
    JOIN revision_types t ON t.id = r.type_id JOIN revision_statuses s ON s.id = r.status_id
    LEFT JOIN users u ON u.id = r.assigned_to
"""


@api("GET", "POST")
def revisions(request, lead_id):
    user = request.user_row
    get_lead(user, lead_id)
    if request.method == "GET":
        rows = fetch_all(f"{REVISION_SQL} WHERE r.lead_id = %s ORDER BY r.round_number DESC", [lead_id])
        for row in rows:
            row["feedback"] = fetch_all(
                "SELECT f.id, f.feedback, f.received_at, u.full_name AS recorded_by FROM revision_feedback f "
                "LEFT JOIN users u ON u.id = f.recorded_by WHERE f.revision_id = %s ORDER BY f.received_at, f.id",
                [row["id"]],
            )
        return ok({"revisions": rows})

    data = request.json
    with transaction() as conn:
        # The unique (lead_id, round_number) constraint stops two people adding the same round.
        last = fetch_one(
            "SELECT coalesce(max(round_number), 0) AS n FROM prototype_revisions WHERE lead_id = %s",
            [lead_id],
            conn=conn,
        )
        round_number = last["n"] + 1
        type_name = "initial" if round_number == 1 else "change request"
        type_id = to_int(data.get("type_id")) or fetch_one(
            "SELECT id FROM revision_types WHERE name = %s", [type_name], conn=conn
        )["id"]
        status_id = to_int(data.get("status_id")) or fetch_one(
            "SELECT id FROM revision_statuses WHERE name = 'planned'", conn=conn
        )["id"]
        row = execute(
            "INSERT INTO prototype_revisions (lead_id, round_number, type_id, status_id, description, "
            "assigned_to, deadline, prototype_link) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            [
                lead_id,
                round_number,
                type_id,
                status_id,
                clean(data.get("description")),
                to_int(data.get("assigned_to")),
                clean(data.get("deadline")),
                clean(data.get("prototype_link")),
            ],
            conn=conn,
        )
    return ok({"id": row["id"], "round_number": round_number}, 201)


@api("PATCH", "DELETE")
def revision_item(request, revision_id):
    user = request.user_row
    row = fetch_one("SELECT lead_id FROM prototype_revisions WHERE id = %s", [revision_id])
    if not row:
        raise ApiError("Round not found", 404)
    get_lead(user, row["lead_id"])
    if request.method == "DELETE":
        if user["role"] == "executive":
            raise ApiError("CRM Executives cannot delete rounds", 403)
        execute("DELETE FROM prototype_revisions WHERE id = %s", [revision_id])
        return ok()
    data = request.json
    sets, params = build_update(
        "prototype_revisions",
        ("type_id", "status_id", "description", "assigned_to", "deadline", "prototype_link"),
        data,
        convert={"type_id": to_int, "status_id": to_int, "assigned_to": to_int},
    )
    if "status_id" in data:
        presented = fetch_one("SELECT id FROM revision_statuses WHERE name = 'presented'")
        if presented and to_int(data["status_id"]) == presented["id"]:
            sets.append("presented_at = COALESCE(presented_at, now())")
    if not sets:
        raise ApiError("Nothing to update")
    execute(f"UPDATE prototype_revisions SET {', '.join(sets)} WHERE id = %s", [*params, revision_id])
    return ok()


@api("POST")
def revision_feedback(request, revision_id):
    user = request.user_row
    row = fetch_one("SELECT lead_id FROM prototype_revisions WHERE id = %s", [revision_id])
    if not row:
        raise ApiError("Round not found", 404)
    get_lead(user, row["lead_id"])
    require(request.json, "feedback")
    created = execute(
        "INSERT INTO revision_feedback (revision_id, feedback, recorded_by) VALUES (%s, %s, %s) RETURNING id",
        [revision_id, request.json["feedback"].strip(), user["id"]],
    )
    return ok({"id": created["id"]}, 201)
