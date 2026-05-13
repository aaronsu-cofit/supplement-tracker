-- Rename Period table columns to snake_case
ALTER TABLE "menstrual_periods" RENAME COLUMN "startDate" TO "start_date";
ALTER TABLE "menstrual_periods" RENAME COLUMN "endDate" TO "end_date";

-- Rename index
DROP INDEX "idx_periods_startDate";
CREATE INDEX "idx_periods_start_date" ON "menstrual_periods"("start_date");
