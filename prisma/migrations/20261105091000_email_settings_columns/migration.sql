-- Columns left on email_settings from the first SMTP setup. Kept so Prisma does not drop them.
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "host" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "port" INTEGER NOT NULL DEFAULT 587;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "secure" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "username" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "password_cipher" TEXT NOT NULL DEFAULT '';
