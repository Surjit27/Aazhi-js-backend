ALTER TABLE "job_triggers" DROP CONSTRAINT IF EXISTS "job_triggers_depends_on_fkey";

ALTER TABLE "job_triggers" ADD CONSTRAINT "job_triggers_depends_on_fkey" FOREIGN KEY ("depends_on") REFERENCES "job_triggers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
