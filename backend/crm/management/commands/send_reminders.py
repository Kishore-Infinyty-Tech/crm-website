from django.core.management.base import BaseCommand

from crm.reminders import send_due_reminders


class Command(BaseCommand):
    help = "Email assignees about follow-ups that are due within 30 minutes (or overdue)."

    def handle(self, *args, **options):
        result = send_due_reminders()
        self.stdout.write(f"Reminders: {result}")
