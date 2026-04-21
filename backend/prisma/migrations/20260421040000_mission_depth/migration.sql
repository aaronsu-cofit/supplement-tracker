-- Add progress, auto-complete rule, and completion-action columns to mission_templates
ALTER TABLE "mission_templates"
  ADD COLUMN "progress_target" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "auto_complete_on_attribute" JSONB,
  ADD COLUMN "on_complete_actions" JSONB NOT NULL DEFAULT '[]';

-- Add progress tracking columns to mission_assignments
ALTER TABLE "mission_assignments"
  ADD COLUMN "progress_current" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "progress_target" INTEGER NOT NULL DEFAULT 1;
