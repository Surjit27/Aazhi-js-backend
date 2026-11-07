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
