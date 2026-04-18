CREATE TABLE "enrollments" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "scenario_id" VARCHAR(30) NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "enrollments_user_id_scenario_id_key" ON "enrollments" ("user_id", "scenario_id");
CREATE INDEX "idx_enrollment_user" ON "enrollments" ("user_id");
CREATE INDEX "idx_enrollment_scenario_status" ON "enrollments" ("scenario_id", "status");

ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "coblocks_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: enroll all existing LINE users in all currently-active scenarios.
-- Uses the user's created_at as enrolled_at to preserve Day N semantics that
-- were implicit before this migration. Skips conflicts (no-op on re-run).
INSERT INTO "enrollments" (user_id, scenario_id, enrolled_at, status, created_at, updated_at)
SELECT u.id, s.id, u.created_at, 'active', NOW(), NOW()
FROM "users" u
CROSS JOIN "coblocks_scenarios" s
WHERE u.auth_provider = 'line' AND s.is_active = true
ON CONFLICT (user_id, scenario_id) DO NOTHING;
