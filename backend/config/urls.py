from django.urls import path

from crm.views import accounts, dashboard, files, leads, meetings, work

urlpatterns = [
    # auth + accounts
    path("api/auth/login", accounts.login),
    path("api/auth/logout", accounts.logout),
    path("api/auth/me", accounts.me),
    path("api/auth/change-password", accounts.change_password),
    path("api/auth/profile", accounts.update_profile),
    path("api/auth/forgot-password", accounts.forgot_password),
    path("api/auth/send-my-reset", accounts.request_my_reset),
    path("api/auth/reset-password", accounts.reset_password),
    path("api/users", accounts.users),
    path("api/users/<int:user_id>", accounts.user_detail),
    path("api/lookups", accounts.lookups),
    path("api/settings/lists", accounts.settings_lists),
    path("api/lookups/<str:table>", accounts.lookup_add),
    path("api/lookups/<str:table>/<int:item_id>", accounts.lookup_item),
    # leads
    path("api/leads", leads.leads),
    path("api/leads/import", leads.import_leads),
    path("api/leads/import/template", leads.import_template),
    path("api/leads/<int:lead_id>", leads.lead_detail),
    path("api/leads/<int:lead_id>/stage", leads.lead_stage),
    path("api/leads/<int:lead_id>/contacts", leads.lead_contacts),
    path("api/leads/<int:lead_id>/contacts/<int:contact_id>", leads.contact_item),
    # work on a lead
    path("api/leads/<int:lead_id>/activities", work.activities),
    path("api/leads/<int:lead_id>/follow-ups", work.lead_follow_ups),
    path("api/leads/<int:lead_id>/requirements", work.requirements),
    path("api/leads/<int:lead_id>/revisions", work.revisions),
    path("api/leads/<int:lead_id>/attachments", files.attachments),
    path("api/follow-ups", work.follow_ups),
    path("api/follow-ups/<int:follow_up_id>", work.follow_up_item),
    path("api/revisions/<int:revision_id>", work.revision_item),
    path("api/revisions/<int:revision_id>/feedback", work.revision_feedback),
    path("api/attachments/<int:attachment_id>", files.attachment_item),
    # calendar, dashboard, cron
    path("api/meetings", meetings.meetings),
    path("api/meetings/<int:meeting_id>", meetings.meeting_item),
    path("api/dashboard", dashboard.dashboard),
    path("api/cron/reminders", files.cron_reminders),
]
