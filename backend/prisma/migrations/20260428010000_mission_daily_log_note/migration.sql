-- Free-form note for each daily log row. Captures qualitative context
-- (mood, blocker, thought) alongside the binary/quantitative tracking.
ALTER TABLE "mission_daily_logs"
  ADD COLUMN "note" VARCHAR(500);
