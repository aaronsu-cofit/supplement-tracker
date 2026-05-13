-- N:N step 1+2: OA <-> Product many-to-many + per-user OA session
--
-- Step 1 (new tables, additive):
--   oa_products       — junction (oa_id, product_id) with is_default flag
--   user_oa_sessions  — per (user, oa) "current product" pointer for the
--                       hybrid routing model (mode C). resolveCurrentProduct
--                       reads this on every inbound webhook.
--
-- Step 2 (backfill):
--   Every existing LineOA.product_id becomes one OaProduct row with
--   is_default=true. LineOA.product_id stays in place during this phase
--   so all existing code paths continue to work unchanged — it'll be
--   dropped in step 5 once code is fully cut over.

CREATE TABLE "oa_products" (
  "oa_id"      INTEGER     NOT NULL,
  "product_id" VARCHAR(30) NOT NULL,
  "is_default" BOOLEAN     NOT NULL DEFAULT false,
  "sort_order" INTEGER     NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "oa_products_pkey" PRIMARY KEY ("oa_id", "product_id"),
  CONSTRAINT "oa_products_oa_id_fkey"
    FOREIGN KEY ("oa_id") REFERENCES "line_oa"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "oa_products_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Only one default product per OA. Partial unique index.
CREATE UNIQUE INDEX "idx_oa_products_one_default"
  ON "oa_products"("oa_id") WHERE "is_default" = true;

CREATE INDEX "idx_oa_products_product"
  ON "oa_products"("product_id");

-- Per-user current-product pointer, scoped per OA so a user can be in
-- different products across different OAs they follow.
CREATE TABLE "user_oa_sessions" (
  "user_id"            VARCHAR(64) NOT NULL,
  "oa_id"              INTEGER     NOT NULL,
  "current_product_id" VARCHAR(30) NOT NULL,
  "last_active_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_oa_sessions_pkey" PRIMARY KEY ("user_id", "oa_id"),
  CONSTRAINT "user_oa_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_oa_sessions_oa_id_fkey"
    FOREIGN KEY ("oa_id") REFERENCES "line_oa"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_oa_sessions_current_product_id_fkey"
    FOREIGN KEY ("current_product_id") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_user_oa_sessions_oa_product"
  ON "user_oa_sessions"("oa_id", "current_product_id");

-- ─── Backfill from LineOA.product_id ────────────────────────────────
-- Every OA with a product binding becomes (oa, product, is_default=true).
-- ON CONFLICT skip lets the migration be safely re-run.
INSERT INTO "oa_products" ("oa_id", "product_id", "is_default", "sort_order", "created_at")
SELECT "id", "product_id", true, 0, CURRENT_TIMESTAMP
FROM "line_oa"
WHERE "product_id" IS NOT NULL
ON CONFLICT ("oa_id", "product_id") DO NOTHING;
