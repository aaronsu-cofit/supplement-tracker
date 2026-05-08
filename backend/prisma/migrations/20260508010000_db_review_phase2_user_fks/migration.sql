-- DB Review Phase 2: user_id FKs across platform tables (PII cascade)
--
-- Until now most platform tables stored user_id as a bare String with
-- no FK to users. This means:
--   • orphan rows can accumulate (no integrity)
--   • PII deletion requires app-level multi-table cleanup that's easy
--     to forget
--
-- This migration adds ON DELETE CASCADE FKs so a single
-- `DELETE FROM users WHERE id = ?` reliably wipes every per-user row.
-- See backend/src/lib/userDeletion.ts for the soft-delete + hard-purge
-- SOP.
--
-- ─── Stub-create users for any orphan user_ids ──────────────────────
-- Without this, `ADD CONSTRAINT` fails the moment any orphan exists
-- (e.g. a scheduled push wrote message_log before the user record was
-- created, or a debug row was inserted directly). Insert with
-- auth_provider='line' since 100% of orphans we've seen are LINE
-- users; ON CONFLICT DO NOTHING keeps it idempotent.
INSERT INTO "users" ("id", "auth_provider")
SELECT DISTINCT "user_id", 'line' FROM (
  SELECT "user_id" FROM "mission_assignments"
  UNION SELECT "user_id" FROM "mission_daily_logs"
  UNION SELECT "user_id" FROM "user_mission_settings"
  UNION SELECT "user_id" FROM "user_attributes"
  UNION SELECT "user_id" FROM "user_streaks"
  UNION SELECT "user_id" FROM "user_badges"
  UNION SELECT "user_id" FROM "user_journey_phases"
  UNION SELECT "user_id" FROM "message_log"
  UNION SELECT "user_id" FROM "message_deliveries"
  UNION SELECT "user_id" FROM "engagement_events"
  UNION SELECT "user_id" FROM "unmatched_intents"
  UNION SELECT "user_id" FROM "user_menu_assignments"
) ids
WHERE "user_id" NOT IN (SELECT "id" FROM "users")
ON CONFLICT ("id") DO NOTHING;

-- ─── Add FKs ────────────────────────────────────────────────────────
ALTER TABLE "mission_assignments"
  ADD CONSTRAINT "mission_assignments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mission_daily_logs"
  ADD CONSTRAINT "mission_daily_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_mission_settings"
  ADD CONSTRAINT "user_mission_settings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_attributes"
  ADD CONSTRAINT "user_attributes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_streaks"
  ADD CONSTRAINT "user_streaks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_badges"
  ADD CONSTRAINT "user_badges_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_journey_phases"
  ADD CONSTRAINT "user_journey_phases_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_log"
  ADD CONSTRAINT "message_log_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_deliveries"
  ADD CONSTRAINT "message_deliveries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "engagement_events"
  ADD CONSTRAINT "engagement_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unmatched_intents"
  ADD CONSTRAINT "unmatched_intents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_menu_assignments"
  ADD CONSTRAINT "user_menu_assignments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
