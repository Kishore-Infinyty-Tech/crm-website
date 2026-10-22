# Infinyty CRM

Lead tracking for a service company: import leads, call and follow up, collect requirements, run the prototype loop, negotiate, win. CRM Administrators get a dashboard.

Pages: `/` home, `/login`, then `/dashboard` (CRM Administrators), `/leads`, `/follow-ups`, `/calendar`, `/import`, `/team`, `/settings`, `/profile`. Press **Ctrl+K** anywhere inside the app to search leads or jump to a page. The logo animation plays once when someone clicks **Sign in** on the home page.

| Part | Tech | Folder |
| --- | --- | --- |
| Website | Next.js 16 (React, Tailwind, Recharts) | `frontend/` |
| API | Django, **plain SQL through psycopg (no ORM)** | `backend/` |
| Database | PostgreSQL on Neon (27 tables, see `backend/schema.sql`) | |
| Email | Console in development, Brevo SMTP when configured | |
| Files | Local `backend/media/` until Backblaze B2 is configured | |

## Run it on your computer

You need Python 3.12+ and Node 20+. Open two terminals.

**1. API** (port 8001, because 8000 is blocked on some Windows machines)

```bash
cd backend
pip install -r requirements.txt
python manage.py runserver 8001
```

`backend/.env` must contain your Neon `DATABASE_URL`. The tables already exist. To start again from scratch (deletes every lead and user, then creates the three team accounts):

```bash
python manage.py setup_team
```

**2. Website** (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The website forwards every `/api/...` request to the API, so there is no CORS setup.

### First sign-in

| Name | Email | Role |
| --- | --- | --- |
| Aayush Mahendru | aayush@infinityanalyticsconsulting.com | CRM Administrator |
| Aditi Vad | aditi@infinityanalyticsconsulting.com | CRM Administrator |
| Kishore Reddy R | kishore@infinityanalyticsconsulting.com | CRM Analyst |

The first-time password is `INITIAL_PASSWORD` in `backend/crm/management/commands/setup_team.py` (or set `SETUP_PASSWORD` before running the command). Everyone should change it on their **Profile** page.

## What is built

- **Leads**: list with search and filters, kanban board (drag a card to change stage), add, edit, duplicate check by phone and email, delete (CRM Administrators).
- **Stage changes** write history, set closed dates, require a lost reason, and **hand the lead over** to the role that owns the new stage (new lead = CRM Executive, reaching out and qualified = CRM Administrator, prototype and quotation = CRM Analyst, negotiation = CRM Administrator). The new owner gets an email.
- **Lead page**: contacts, call and message log, follow-ups, requirements (tech stack and features), prototype rounds with client feedback, meetings, files, stage history.
- **Follow-ups**: per person, grouped overdue, today and upcoming. Reminder emails go out about 30 minutes before they are due.
- **Calendar**: month view, one-off and repeating meetings ("every 2 days, 5 times"), attendees, emailed calendar invites (.ics).
- **Import**: Excel or CSV with flexible column names, skips duplicates, reports problems per row.
- **Dashboard** (CRM Administrators only): KPIs, pipeline by stage, leads vs wins over 12 weeks, sources, lost reasons, team table, next follow-ups, recent activity.
- **Team** (CRM Administrators): people, roles and passwords, with a table of what each role can do.
- **Settings** (CRM Administrators): every dropdown list, with how often each value is used.
- **Add leads**: a full manual form, Excel/CSV upload, and paste straight from Google Sheets.

## Connecting the rest later

### Brevo email
Set these in `backend/.env` (and in Render's environment). Without them, emails print in the API terminal.

```
BREVO_SMTP_USER=your-brevo-login
BREVO_SMTP_KEY=your-brevo-smtp-key
DEFAULT_FROM_EMAIL=CRM <you@your-verified-sender>
APP_URL=https://your-website-url
```

Verify the sender address (or domain) in Brevo first, or mail will land in spam.

### Backblaze B2 files
Create a private bucket and an application key, then set:

```
B2_ENDPOINT=https://s3.<region>.backblazeb2.com
B2_KEY_ID=...
B2_APP_KEY=...
B2_BUCKET=...
```

The Files tab switches to B2 automatically; downloads use a 5-minute signed link. Files already saved locally are not moved.

### Password reset
People can change their password on **Profile**, or use **Forgot password?** on the login page to get a one-time link by email (valid for one hour). Until Brevo is connected, the email text prints in the API terminal.

### Reminder emails on a schedule
Set `CRON_SECRET` to a long random string, then have a free scheduler (cron-job.org or a GitHub Action) call this every 10 minutes:

```
GET https://your-api-url/api/cron/reminders?token=<CRON_SECRET>
```

Or run `python manage.py send_reminders` from any scheduler.

### Deploying (Render + Neon)
- **API** (Render web service, root `backend`): build `pip install -r requirements.txt`, start `gunicorn config.wsgi`. Set `DEBUG=0`, `SECRET_KEY` (long random), `ALLOWED_HOSTS` (your Render host), `DATABASE_URL`, and the email, B2 and cron variables above. Use Neon's pooled connection string.
- **Website** (any Node host, root `frontend`): build `npm run build`, start `npm start`. Set `BACKEND_URL` to the API's public URL.
- Render's free web service sleeps when idle and takes about a minute to wake up; the first request after a quiet period is slow.

## Run it on any Windows computer

1. Copy or download this folder.
2. Double-click **start.bat**. It checks for Python and Node.js (and installs them with winget if missing), installs every package, asks for the Neon `DATABASE_URL` once if `backend/.env` is missing, starts the API and the website, and opens http://localhost:3000.
3. Double-click **stop.bat** to stop everything.

## Access rules

| | CRM Administrator | CRM Analyst | CRM Executive |
| --- | --- | --- | --- |
| Leads visible | All | Prototype stage onward, plus ones assigned to them | Ones they added or own |
| Dashboard | Yes | No | No |
| Team and dropdown lists | Edit | No | No |
| Delete a lead | Yes | No | No |

## Project map

```
backend/
  schema.sql              the 27 tables, indexes, seed lists
  config/                 settings and URL routes
  crm/db.py               psycopg connection pool and helpers
  crm/auth.py             signed-cookie login
  crm/views/              accounts, leads, work (calls, follow-ups, requirements, rounds),
                          meetings, dashboard, files
  crm/emails.py           email sending and calendar files
  crm/reminders.py        due follow-up emails
  crm/storage.py          local folder or Backblaze B2
frontend/
  app/                    pages: dashboard, leads, lead detail, follow-ups, calendar, import, team
  components/             shared UI, lead dialogs, lead tabs, meeting dialog
  lib/                    API client, types, formatting, auth and lookups context
```

See the CRM Database Guide (PDF) for what every table and column means.
