"""Sending email (console in dev, Brevo SMTP in production) and logging it to email_log."""
import datetime
import logging
import threading
import uuid

from django.conf import settings
from django.core.mail import EmailMessage

from .db import execute

log = logging.getLogger("crm")


def send_email(to, subject, body, *, kind, lead_id=None, meeting_id=None, attachments=None):
    """Send one email and record the result. Returns True when sent."""
    row = execute(
        "INSERT INTO email_log (to_email, type, subject, status, lead_id, meeting_id) "
        "VALUES (%s, %s, %s, 'queued', %s, %s) RETURNING id",
        [to, kind, subject, lead_id, meeting_id],
    )
    log_id = row["id"]
    try:
        message = EmailMessage(subject, body, settings.DEFAULT_FROM_EMAIL, [to])
        for attachment in attachments or []:
            message.attach(*attachment)
        message.send()
        execute("UPDATE email_log SET status='sent', sent_at=now() WHERE id=%s", [log_id])
        return True
    except Exception as exc:  # noqa: BLE001
        log.exception("Email to %s failed", to)
        execute(
            "UPDATE email_log SET status='failed', error=%s WHERE id=%s",
            [str(exc)[:500], log_id],
        )
        return False


def send_async(*args, **kwargs):
    """Fire-and-forget so a slow mail server never slows down an API request."""
    threading.Thread(target=send_email, args=args, kwargs=kwargs, daemon=True).start()


def _ics_time(value: datetime.datetime) -> str:
    return value.astimezone(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _ics_escape(text: str) -> str:
    return (text or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def build_ics(meetings, organizer_email, attendee_emails, uid_base=None):
    """One calendar file holding every occurrence. Opens in Google Calendar and Outlook."""
    uid_base = uid_base or uuid.uuid4().hex
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//CRM//Meetings//EN",
        "METHOD:REQUEST",
    ]
    stamp = _ics_time(datetime.datetime.now(datetime.timezone.utc))
    for index, meeting in enumerate(meetings):
        lines += [
            "BEGIN:VEVENT",
            f"UID:{uid_base}-{index}@crm",
            f"DTSTAMP:{stamp}",
            f"DTSTART:{_ics_time(meeting['start_at'])}",
            f"DTEND:{_ics_time(meeting['end_at'])}",
            f"SUMMARY:{_ics_escape(meeting['title'])}",
            f"DESCRIPTION:{_ics_escape(meeting.get('description') or '')}",
            f"LOCATION:{_ics_escape(meeting.get('meeting_link') or '')}",
            f"ORGANIZER:mailto:{organizer_email}",
        ]
        lines += [f"ATTENDEE;RSVP=TRUE:mailto:{email}" for email in attendee_emails]
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"
