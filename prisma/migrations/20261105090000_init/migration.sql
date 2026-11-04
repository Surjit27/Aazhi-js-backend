-- Baseline for the tables the API already creates on startup.
-- Existing databases mark this migration applied instead of running it again.

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "role" VARCHAR(40) NOT NULL,
  "display_name" VARCHAR(255) NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "idx_users_role" ON "users"("role");

CREATE TABLE "roles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(40) NOT NULL,
  "label" VARCHAR(80) NOT NULL,
  "portal" VARCHAR(20) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

INSERT INTO "roles" ("key", "label", "portal")
VALUES
  ('admin', 'Administrator', 'admin'),
  ('client', 'Client', 'client')
ON CONFLICT ("key") DO NOTHING;

CREATE TABLE "email_settings" (
  "id" BOOLEAN NOT NULL DEFAULT true,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "api_key_cipher" TEXT NOT NULL DEFAULT '',
  "from_email" VARCHAR(255) NOT NULL DEFAULT '',
  "from_name" VARCHAR(255) NOT NULL DEFAULT '',
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "email_settings" ("id") VALUES (true) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "job_triggers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "trigger_type" VARCHAR(20) NOT NULL,
  "recurrence" VARCHAR(20) NOT NULL DEFAULT 'daily',
  "start_at" TIMESTAMPTZ(6),
  "event_name" VARCHAR(120) NOT NULL DEFAULT '',
  "depends_on" UUID,
  "target" VARCHAR(200) NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_status" VARCHAR(20) NOT NULL DEFAULT 'never',
  "last_run_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_triggers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "job_triggers" ADD CONSTRAINT "job_triggers_depends_on_fkey" FOREIGN KEY ("depends_on") REFERENCES "job_triggers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
