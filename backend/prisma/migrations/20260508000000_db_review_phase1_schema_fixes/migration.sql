-- DB Review Phase 1: schema fixes (low-risk)
-- 1. CoBlocksScenario.oa_id String -> Int + FK + index
-- 2. CoBlocksScenario.is_active index
-- 3. User.deleted_at column for soft delete

-- ─── 1. CoBlocksScenario.oa_id type fix ─────────────────────────────
-- Drop legacy oa_id='default' (and any other non-numeric) rows BEFORE
-- the cast — `'default'::integer` raises. The 'default' sentinel was a
-- pre-multi-OA fallback ("applies to any OA"); after this migration
-- every scenario must belong to a real OA.
DELETE FROM "coblocks_scenarios" WHERE "oa_id" !~ '^[0-9]+$';

ALTER TABLE "coblocks_scenarios"
  ALTER COLUMN "oa_id" TYPE INTEGER USING "oa_id"::integer;

-- Drop scenarios pointing at non-existent OAs (orphans only). If there
-- are orphans you didn't expect, back out and investigate.
DELETE FROM "coblocks_scenarios"
  WHERE "oa_id" NOT IN (SELECT "id" FROM "line_oa");

ALTER TABLE "coblocks_scenarios"
  ADD CONSTRAINT "coblocks_scenarios_oa_id_fkey"
  FOREIGN KEY ("oa_id") REFERENCES "line_oa"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_coblocks_scenarios_oa" ON "coblocks_scenarios"("oa_id");
CREATE INDEX "idx_coblocks_scenarios_active" ON "coblocks_scenarios"("is_active");

-- ─── 2. UserAttribute (key, value) lookup index ────────────────────
-- Powers the "find users where attribute X = Y" pattern (e.g. journey
-- transition triggers, audience targeting). Without it those queries
-- table-scan once attribute count grows.
CREATE INDEX "idx_user_attributes_key_value" ON "user_attributes"("key", "value");

-- ─── 3. User soft delete ────────────────────────────────────────────
-- deleted_at = NULL means active; non-null means soft-deleted. Filter
-- queries with `where: { deleted_at: null }` to exclude. The PII
-- cascade FKs added in Phase 2 are still desired so a hard DELETE
-- (after retention period) reliably wipes all per-user rows.
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);
CREATE INDEX "idx_users_deleted_at" ON "users"("deleted_at");
