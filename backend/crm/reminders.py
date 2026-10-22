"""Emails people about follow-ups that are due soon. Safe to run often: each is sent once."""
import time

from django.conf import settings

from .db import execute, fetch_all
from .emails import send_email


def send_due_reminders(window_minutes: int = 30) -> dict:
    due = fetch_all(
        "SELECT f.id, f.lead_id, f.due_at, f.purpose, c.name AS company, u.email, u.full_name, "
        "ct.name AS contact_name, ct.phone "
        "FROM follow_ups f JOIN leads l ON l.id = f.lead_id JOIN companies c ON c.id = l.company_id "
        "JOIN users u ON u.id = f.assigned_to AND u.is_active "
        "LEFT JOIN contacts ct ON ct.id = l.primary_contact_id "
        "WHERE f.status = 'pending' AND f.reminder_sent_at IS NULL "
        "AND f.due_at <= now() + make_interval(mins => %s) ORDER BY f.due_at",
        [window_minutes],
    )
    sent = failed = 0
    for item in due:
        overdue = item["due_at"].timestamp() < time.time()
        body = (
            f"Hi {item['full_name']},\n\n"
            f"{'OVERDUE: ' if overdue else 'Coming up: '}follow up with {item['company']}"
            f"{' (' + item['contact_name'] + ')' if item['contact_name'] else ''}.\n"
            f"Purpose: {item['purpose'] or 'not specified'}\n"
            f"Due: {item['due_at'].strftime('%d %b %Y, %H:%M UTC')}\n"
            f"{'Phone: ' + item['phone'] + chr(10) if item['phone'] else ''}\n"
            f"Open the lead: {settings.APP_URL}/leads/{item['lead_id']}\n"
        )
        if send_email(item["email"], f"Follow-up: {item['company']}", body, kind="follow_up_reminder", lead_id=item["lead_id"]):
            execute("UPDATE follow_ups SET reminder_sent_at = now() WHERE id = %s", [item["id"]])
            sent += 1
        else:
            failed += 1
    return {"due": len(due), "sent": sent, "failed": failed}
