-- CRM database schema (PostgreSQL / Neon)
-- Run once in the Neon SQL Editor. Safe to re-run: every statement is idempotent.

BEGIN;

-- ---------------------------------------------------------------
-- Shared trigger: keeps updated_at current on every UPDATE
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- 1. LOOKUP TABLES
-- ===============================================================
CREATE TABLE IF NOT EXISTS roles (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_sources (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    position    INT  NOT NULL UNIQUE,
    owner_role  BIGINT REFERENCES roles(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lost_reasons (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_types (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_outcomes (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revision_types (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revision_statuses (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tech_stacks (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================================================
-- 2. PEOPLE
-- ===============================================================
CREATE TABLE IF NOT EXISTS users (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,                      -- hashed, never plain text
    full_name   TEXT NOT NULL,
    phone       TEXT,
    role_id     BIGINT NOT NULL REFERENCES roles(id),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    website     TEXT,
    industry    TEXT,
    location    TEXT,
    created_by  BIGINT REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id  BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    job_title   TEXT,
    email       TEXT,
    phone       TEXT,
    alt_phone   TEXT,
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================================================
-- 3. LEADS
-- ===============================================================
CREATE TABLE IF NOT EXISTS import_batches (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    file_name      TEXT NOT NULL,
    uploaded_by    BIGINT REFERENCES users(id),
    total_rows     INT NOT NULL DEFAULT 0,
    imported_rows  INT NOT NULL DEFAULT 0,
    skipped_rows   INT NOT NULL DEFAULT 0,
    error_details  TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id        BIGINT NOT NULL REFERENCES companies(id),
    primary_contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    source_id         BIGINT REFERENCES lead_sources(id),
    stage_id          BIGINT NOT NULL REFERENCES pipeline_stages(id),
    project_summary   TEXT,
    estimated_budget  NUMERIC(12,2),
    priority          TEXT CONSTRAINT leads_priority_check CHECK (priority IN ('high','medium','low')),
    created_by        BIGINT REFERENCES users(id),
    assigned_to       BIGINT REFERENCES users(id),
    import_batch_id   BIGINT REFERENCES import_batches(id) ON DELETE SET NULL,
    lost_reason_id    BIGINT REFERENCES lost_reasons(id),
    deal_value        NUMERIC(12,2),
    stage_changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_stage_history (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lead_id     BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    from_stage  BIGINT REFERENCES pipeline_stages(id),
    to_stage    BIGINT NOT NULL REFERENCES pipeline_stages(id),
    changed_by  BIGINT REFERENCES users(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================================================
-- 4. WORK ON A LEAD
-- ===============================================================
CREATE TABLE IF NOT EXISTS activities (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lead_id      BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    contact_id   BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    user_id      BIGINT REFERENCES users(id),
    type_id      BIGINT NOT NULL REFERENCES activity_types(id),
    outcome_id   BIGINT REFERENCES call_outcomes(id),
    summary      TEXT,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS follow_ups (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lead_id           BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    assigned_to       BIGINT REFERENCES users(id),
    due_at            TIMESTAMPTZ NOT NULL,
    purpose           TEXT,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','done','cancelled')),
    completed_at      TIMESTAMPTZ,
    reminder_sent_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================================================
-- 5. REQUIREMENTS
-- ===============================================================
CREATE TABLE IF NOT EXISTS requirements (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lead_id            BIGINT NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
    project_type       TEXT CHECK (project_type IN ('web','mobile','both','other')),
    expected_timeline  TEXT,
    budget             NUMERIC(12,2),
    notes              TEXT,
    status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','received','confirmed')),
    received_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requirement_tech_stacks (
    requirement_id  BIGINT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    tech_stack_id   BIGINT NOT NULL REFERENCES tech_stacks(id),
    PRIMARY KEY (requirement_id, tech_stack_id)
);

CREATE TABLE IF NOT EXISTS requirement_features (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    requirement_id  BIGINT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    priority        TEXT NOT NULL DEFAULT 'should'
                    CHECK (priority IN ('must','should','nice')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================================================
-- 6. PROTOTYPE LOOP
-- ===============================================================
CREATE TABLE IF NOT EXISTS prototype_revisions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lead_id         BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    round_number    INT NOT NULL,
    type_id         BIGINT NOT NULL REFERENCES revision_types(id),
    status_id       BIGINT NOT NULL REFERENCES revision_statuses(id),
    description     TEXT,
    assigned_to     BIGINT REFERENCES users(id),
    deadline        DATE,
    prototype_link  TEXT,
    presented_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lead_id, round_number)
);

CREATE TABLE IF NOT EXISTS revision_feedback (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    revision_id  BIGINT NOT NULL REFERENCES prototype_revisions(id) ON DELETE CASCADE,
    feedback     TEXT NOT NULL,
    recorded_by  BIGINT REFERENCES users(id),
    received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================================================
-- 7. MEETINGS
-- ===============================================================
CREATE TABLE IF NOT EXISTS meeting_series (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title              TEXT NOT NULL,
    repeat_every_days  INT NOT NULL CHECK (repeat_every_days > 0),
    repeat_count       INT NOT NULL CHECK (repeat_count > 0),
    created_by         BIGINT REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetings (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    series_id     BIGINT REFERENCES meeting_series(id) ON DELETE CASCADE,
    lead_id       BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    title         TEXT NOT NULL,
    description   TEXT,
    start_at      TIMESTAMPTZ NOT NULL,
    end_at        TIMESTAMPTZ NOT NULL,
    meeting_link  TEXT,
    organizer_id  BIGINT REFERENCES users(id),
    status        TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','done','cancelled')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_at > start_at)
);

CREATE TABLE IF NOT EXISTS meeting_attendees (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    meeting_id      BIGINT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    email           TEXT NOT NULL,
    name            TEXT,
    invite_sent_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (meeting_id, email)
);

-- ===============================================================
-- 8. SUPPORT
-- ===============================================================
CREATE TABLE IF NOT EXISTS attachments (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lead_id      BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    revision_id  BIGINT REFERENCES prototype_revisions(id) ON DELETE SET NULL,
    uploaded_by  BIGINT REFERENCES users(id),
    file_name    TEXT NOT NULL,
    storage_key  TEXT NOT NULL,              -- path of the file in Backblaze
    size_bytes   BIGINT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_log (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    to_email    TEXT NOT NULL,
    type        TEXT NOT NULL,               -- follow_up_reminder, meeting_invite, handover
    subject     TEXT,
    status      TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','sent','failed')),
    error       TEXT,
    sent_at     TIMESTAMPTZ,
    lead_id     BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    meeting_id  BIGINT REFERENCES meetings(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================================================
-- INDEXES (foreign keys and the columns we filter on most)
-- ===============================================================
CREATE INDEX IF NOT EXISTS idx_users_role            ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company      ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email        ON contacts(lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_phone        ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_leads_company         ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage           ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned        ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_by      ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_created_at      ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_stage_history_lead    ON lead_stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead       ON activities(lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_due         ON follow_ups(due_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_followups_assigned    ON follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_followups_lead        ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_features_requirement  ON requirement_features(requirement_id);
CREATE INDEX IF NOT EXISTS idx_revisions_lead        ON prototype_revisions(lead_id);
CREATE INDEX IF NOT EXISTS idx_feedback_revision     ON revision_feedback(revision_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start        ON meetings(start_at);
CREATE INDEX IF NOT EXISTS idx_meetings_lead         ON meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_attendees_meeting     ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_attachments_lead      ON attachments(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status      ON email_log(status);

-- ===============================================================
-- updated_at TRIGGERS (every table except the pure link table)
-- ===============================================================
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'roles','lead_sources','pipeline_stages','lost_reasons','activity_types',
        'call_outcomes','revision_types','revision_statuses','tech_stacks',
        'users','companies','contacts','import_batches','leads','lead_stage_history',
        'activities','follow_ups','requirements','requirement_features',
        'prototype_revisions','revision_feedback','meeting_series','meetings',
        'meeting_attendees','attachments','email_log'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', t, t);
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END LOOP;
END $$;

-- ===============================================================
-- SEED DATA FOR LOOKUP TABLES
-- ===============================================================
INSERT INTO roles (name) VALUES ('admin'), ('technical_analyst'), ('business_development_executive')
ON CONFLICT (name) DO NOTHING;

INSERT INTO lead_sources (name) VALUES ('call'), ('whatsapp'), ('excel'), ('manual'), ('other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO pipeline_stages (name, position, owner_role) VALUES
    ('new lead',     1, (SELECT id FROM roles WHERE name = 'business_development_executive')),
    ('reaching out', 2, (SELECT id FROM roles WHERE name = 'admin')),
    ('qualified',    3, (SELECT id FROM roles WHERE name = 'admin')),
    ('prototype',    4, (SELECT id FROM roles WHERE name = 'technical_analyst')),
    ('quotation',    5, (SELECT id FROM roles WHERE name = 'technical_analyst')),
    ('negotiation',  6, (SELECT id FROM roles WHERE name = 'admin')),
    ('won',          7, (SELECT id FROM roles WHERE name = 'admin')),
    ('lost',         8, (SELECT id FROM roles WHERE name = 'admin'))
ON CONFLICT (name) DO NOTHING;

INSERT INTO lost_reasons (name) VALUES
    ('budget too high'), ('no response'), ('chose competitor'), ('requirements changed'), ('other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO activity_types (name) VALUES ('call'), ('whatsapp'), ('email'), ('note')
ON CONFLICT (name) DO NOTHING;

INSERT INTO call_outcomes (name) VALUES
    ('answered'), ('no answer'), ('busy'), ('interested'), ('not interested'), ('callback requested')
ON CONFLICT (name) DO NOTHING;

INSERT INTO revision_types (name) VALUES
    ('initial'), ('change request'), ('new feature'), ('bug fix')
ON CONFLICT (name) DO NOTHING;

INSERT INTO revision_statuses (name) VALUES
    ('planned'), ('in progress'), ('presented'), ('approved'), ('changes requested')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tech_stacks (name) VALUES
    ('React'), ('Next.js'), ('Django'), ('Node.js'), ('Flutter'), ('React Native'),
    ('PostgreSQL'), ('MySQL'), ('MongoDB')
ON CONFLICT (name) DO NOTHING;

COMMIT;
