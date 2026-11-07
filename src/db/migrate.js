import { getPostgresPool } from './postgres.js'

const USERS_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'client')),
  display_name VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
`

const ROLES_SQL = `
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  portal VARCHAR(20) NOT NULL CHECK (portal IN ('admin', 'client')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (key, label, portal)
VALUES
  ('admin', 'Administrator', 'admin'),
  ('client', 'Client', 'client')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(40);
`

const EMAIL_SETTINGS_SQL = `
CREATE TABLE IF NOT EXISTS email_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  api_key_cipher TEXT NOT NULL DEFAULT '',
  from_email VARCHAR(255) NOT NULL DEFAULT '',
  from_name VARCHAR(255) NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO email_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS api_key_cipher TEXT NOT NULL DEFAULT '';
ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS from_email VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS from_name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT FALSE;
`

const AUDIT_EVENTS_SQL = `
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(20) NOT NULL,
  action VARCHAR(80) NOT NULL,
  actor_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  subject_id VARCHAR(120),
  subject_label VARCHAR(255) NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_domain_created ON audit_events (domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events (created_at DESC);
`

const JOB_TRIGGERS_SQL = `
CREATE TABLE IF NOT EXISTS job_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('time', 'event', 'dependency')),
  recurrence VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (recurrence IN ('once', 'hourly', 'daily', 'weekly')),
  start_at TIMESTAMPTZ,
  event_name VARCHAR(120) NOT NULL DEFAULT '',
  depends_on UUID REFERENCES job_triggers (id) ON DELETE SET NULL,
  target VARCHAR(200) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_status VARCHAR(20) NOT NULL DEFAULT 'never' CHECK (last_status IN ('never', 'success', 'failed')),
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`

export async function runMigrations() {
  const pool = getPostgresPool()
  await pool.query(USERS_SQL)
  await pool.query(ROLES_SQL)
  await pool.query(EMAIL_SETTINGS_SQL)
  await pool.query(JOB_TRIGGERS_SQL)
  await pool.query(AUDIT_EVENTS_SQL)
}
