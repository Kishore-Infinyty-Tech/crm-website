"""Start the CRM from scratch: wipe all lead data and create the real team accounts."""
import os

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from crm.db import execute, fetch_one, transaction

# First-time password for everyone below. Each person should change it on their Profile page.
INITIAL_PASSWORD = "Infinyty@2026"

TEAM = [
    ("aayush@infinityanalyticsconsulting.com", "Aayush Mahendru", "admin"),
    ("aditi@infinityanalyticsconsulting.com", "Aditi Vad", "admin"),
    ("kishore@infinityanalyticsconsulting.com", "Kishore Reddy R", "technical_analyst"),
]


class Command(BaseCommand):
    help = "Delete every lead, client record and user, then create the CRM Administrators and the Technical Analyst."

    def add_arguments(self, parser):
        parser.add_argument("--keep-data", action="store_true", help="Only add missing team members; delete nothing")

    def handle(self, *args, **options):
        password = os.environ.get("SETUP_PASSWORD", INITIAL_PASSWORD)
        with transaction() as conn:
            if not options["keep_data"]:
                execute(
                    "TRUNCATE email_log, attachments, meeting_attendees, meetings, meeting_series, revision_feedback, "
                    "prototype_revisions, requirement_features, requirement_tech_stacks, requirements, follow_ups, "
                    "activities, lead_stage_history, leads, import_batches, contacts, companies, users RESTART IDENTITY CASCADE",
                    conn=conn,
                )
            roles = {r["name"]: r["id"] for r in conn.execute("SELECT id, name FROM roles").fetchall()}
            hashed = make_password(password)
            for email, name, role in TEAM:
                if fetch_one("SELECT 1 FROM users WHERE lower(email) = lower(%s)", [email], conn=conn):
                    continue
                execute(
                    "INSERT INTO users (email, password, full_name, role_id) VALUES (%s, %s, %s, %s)",
                    [email, hashed, name, roles[role]],
                    conn=conn,
                )
        self.stdout.write(self.style.SUCCESS(f"Ready: {len(TEAM)} team members, no leads."))
        for email, name, role in TEAM:
            self.stdout.write(f"  {name} <{email}>")
