-- Extend mission_templates with habit-tracker fields
ALTER TABLE "mission_templates"
  ADD COLUMN "mission_type" VARCHAR(30) NOT NULL DEFAULT 'one_shot',
  ADD COLUMN "frequency" VARCHAR(20) NOT NULL DEFAULT 'once',
  ADD COLUMN "daily_target" INTEGER,
  ADD COLUMN "unit" VARCHAR(30),
  ADD COLUMN "step_value" INTEGER,
  ADD COLUMN "subtasks" JSONB,
  ADD COLUMN "category" VARCHAR(50),
  ADD COLUMN "action_url" TEXT,
  ADD COLUMN "reminder" JSONB;

-- Per-day completion log for habit-style missions
CREATE TABLE "mission_daily_logs" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "template_id" VARCHAR(30) NOT NULL,
    "date" DATE NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "value" INTEGER NOT NULL DEFAULT 0,
    "subtask_state" JSONB,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mission_daily_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mission_daily_logs_user_id_template_id_date_key"
  ON "mission_daily_logs" ("user_id", "template_id", "date");
CREATE INDEX "idx_mission_daily_log_user_date"
  ON "mission_daily_logs" ("user_id", "date");
CREATE INDEX "idx_mission_daily_log_template_date"
  ON "mission_daily_logs" ("template_id", "date");

ALTER TABLE "mission_daily_logs"
  ADD CONSTRAINT "mission_daily_logs_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "mission_templates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
