-- Adds explicit "skipped" flag to per-day habit logs. A skipped day
-- is neither completed nor counted as a miss — the streak math treats
-- it as neutral (doesn't break the streak, doesn't increment it).
ALTER TABLE "mission_daily_logs"
  ADD COLUMN "skipped" BOOLEAN NOT NULL DEFAULT false;
