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

export async function runMigrations() {
  const pool = getPostgresPool()
  await pool.query(USERS_SQL)
  await pool.query(ROLES_SQL)
  await pool.query(EMAIL_SETTINGS_SQL)
}
