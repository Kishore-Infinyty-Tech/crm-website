"""Calendar: one-off and repeating meetings, attendees, emailed calendar invites."""
import datetime
import threading

from ..common import ApiError, build_update, clean, lead_scope, parse_dt, require, to_int
from ..db import execute, fetch_all, fetch_one, transaction
from ..emails import build_ics, send_email
from ..http import api, ok

MAX_OCCURRENCES = 60


def visible_sql(user):
    if user["role"] == "admin":
        return "TRUE", []
    scope_sql, scope_params = lead_scope(user, "ll")
    return (
        "(m.organizer_id = %s OR EXISTS (SELECT 1 FROM meeting_attendees a WHERE a.meeting_id = m.id AND a.user_id = %s) "
        f"OR (m.lead_id IS NOT NULL AND m.lead_id IN (SELECT ll.id FROM leads ll WHERE {scope_sql})))",
        [user["id"], user["id"], *scope_params],
    )


def get_meeting(user, meeting_id):
    visible, params = visible_sql(user)
    meeting = fetch_one(
        f"SELECT m.* FROM meetings m WHERE m.id = %s AND {visible}", [meeting_id, *params]
    )
    if not meeting:
        raise ApiError("Meeting not found", 404)
    return meeting


def send_invites(meetings, organizer, attendees):
    """Runs in a background thread: one email per attendee with a calendar file attached."""
    emails = [a["email"] for a in attendees]
    ics = build_ics(meetings, organizer["email"], emails)
    first = meetings[0]
    when = first["start_at"].astimezone(datetime.timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    extra = f" (repeats {len(meetings)} times)" if len(meetings) > 1 else ""
    for attendee in attendees:
        sent = send_email(
            attendee["email"],
            f"Meeting invite: {first['title']}",
            f"{organizer['full_name']} invited you to '{first['title']}' on {when}{extra}.\n\n"
            f"{first.get('description') or ''}\n\n"
            + (f"Join: {first['meeting_link']}\n" if first.get("meeting_link") else "")
            + "The attached calendar file adds it to Google Calendar or Outlook.",
            kind="meeting_invite",
            meeting_id=first["id"],
            attachments=[("invite.ics", ics, "text/calendar; method=REQUEST")],
        )
        if sent:
            execute(
                "UPDATE meeting_attendees SET invite_sent_at = now() WHERE meeting_id = ANY(%s) AND lower(email) = lower(%s)",
                [[m["id"] for m in meetings], attendee["email"]],
            )


MEETING_SELECT = """
    SELECT m.id, m.series_id, m.lead_id, m.title, m.description, m.start_at, m.end_at, m.meeting_link,
           m.status, m.organizer_id, o.full_name AS organizer_name, c.name AS company,
           (SELECT coalesce(json_agg(json_build_object('email', a.email, 'name', a.name,
                    'invited', a.invite_sent_at IS NOT NULL) ORDER BY a.id), '[]'::json)
              FROM meeting_attendees a WHERE a.meeting_id = m.id) AS attendees
    FROM meetings m
    LEFT JOIN users o ON o.id = m.organizer_id
    LEFT JOIN leads l ON l.id = m.lead_id LEFT JOIN companies c ON c.id = l.company_id
"""


@api("GET", "POST")
def meetings(request):
    user = request.user_row
    if request.method == "GET":
        visible, params = visible_sql(user)
        where = [visible]
        if request.GET.get("from"):
            where.append("m.start_at >= %s")
            params.append(parse_dt(request.GET["from"], "from"))
        if request.GET.get("to"):
            where.append("m.start_at < %s")
            params.append(parse_dt(request.GET["to"], "to"))
        if request.GET.get("lead_id"):
            where.append("m.lead_id = %s")
            params.append(to_int(request.GET["lead_id"]))
        rows = fetch_all(f"{MEETING_SELECT} WHERE {' AND '.join(where)} ORDER BY m.start_at LIMIT 1000", params)
        return ok({"meetings": rows})

    data = request.json
    require(data, "title", "start_at", "end_at")
    start, end = parse_dt(data["start_at"], "start"), parse_dt(data["end_at"], "end")
    if end <= start:
        raise ApiError("The meeting must end after it starts")
    every = to_int(data.get("repeat_every_days"), "repeat gap") or 0
    count = to_int(data.get("repeat_count"), "repeat count") or 1
    if count > MAX_OCCURRENCES:
        raise ApiError(f"A series can have at most {MAX_OCCURRENCES} meetings")
    if count > 1 and every < 1:
        raise ApiError("Say how many days apart the meetings repeat")
    lead_id = to_int(data.get("lead_id"))
    attendees, seen = [], set()
    for person in data.get("attendees") or []:
        email = (clean(person.get("email")) or "").lower()
        if email and email not in seen:
            seen.add(email)
            attendees.append({"email": email, "name": clean(person.get("name")), "user_id": to_int(person.get("user_id"))})

    created = []
    with transaction() as conn:
        series_id = None
        if count > 1:
            series_id = execute(
                "INSERT INTO meeting_series (title, repeat_every_days, repeat_count, created_by) "
                "VALUES (%s, %s, %s, %s) RETURNING id",
                [data["title"].strip(), every, count, user["id"]],
                conn=conn,
            )["id"]
        for i in range(count):
            offset = datetime.timedelta(days=every * i)
            row = execute(
                "INSERT INTO meetings (series_id, lead_id, title, description, start_at, end_at, meeting_link, organizer_id) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                [
                    series_id, lead_id, data["title"].strip(), clean(data.get("description")),
                    start + offset, end + offset, clean(data.get("meeting_link")), user["id"],
                ],
                conn=conn,
            )
            created.append({
                "id": row["id"], "title": data["title"].strip(), "description": clean(data.get("description")),
                "start_at": start + offset, "end_at": end + offset, "meeting_link": clean(data.get("meeting_link")),
            })
            for person in attendees:
                execute(
                    "INSERT INTO meeting_attendees (meeting_id, user_id, email, name) VALUES (%s, %s, %s, %s)",
                    [row["id"], person["user_id"], person["email"], person["name"]],
                    conn=conn,
                )
    if attendees and data.get("send_invites", True):
        threading.Thread(target=send_invites, args=(created, user, attendees), daemon=True).start()
    return ok({"ids": [m["id"] for m in created], "series_id": series_id}, 201)


@api("GET", "PATCH", "DELETE")
def meeting_item(request, meeting_id):
    user = request.user_row
    meeting = get_meeting(user, meeting_id)
    if request.method == "GET":
        return ok(fetch_one(f"{MEETING_SELECT} WHERE m.id = %s", [meeting_id]))
    if user["role"] != "admin" and meeting["organizer_id"] != user["id"]:
        raise ApiError("Only the organizer or a CRM Administrator can change this meeting", 403)

    if request.method == "DELETE":
        if request.GET.get("series") == "1" and meeting["series_id"]:
            execute("DELETE FROM meeting_series WHERE id = %s", [meeting["series_id"]])
        else:
            execute("DELETE FROM meetings WHERE id = %s", [meeting_id])
        return ok()

    data = request.json
    if data.get("status") and data["status"] not in ("scheduled", "done", "cancelled"):
        raise ApiError("Unknown status")
    sets, params = build_update(
        "meetings",
        ("title", "description", "meeting_link", "status", "start_at", "end_at"),
        data,
        convert={"start_at": parse_dt, "end_at": parse_dt},
    )
    if not sets:
        raise ApiError("Nothing to update")
    try:
        execute(f"UPDATE meetings SET {', '.join(sets)} WHERE id = %s", [*params, meeting_id])
    except Exception:  # noqa: BLE001 - CHECK (end_at > start_at)
        raise ApiError("The meeting must end after it starts")
    return ok()
