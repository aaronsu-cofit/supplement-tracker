CREATE TABLE "user_menu_assignments" (
  "id"          SERIAL PRIMARY KEY,
  "user_id"     VARCHAR(64) NOT NULL,
  "oa_id"       INTEGER NOT NULL,
  "template_id" INTEGER,
  "source"      VARCHAR(20) NOT NULL,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "user_menu_assignments_user_id_oa_id_key"
  ON "user_menu_assignments" ("user_id", "oa_id");

CREATE INDEX "idx_user_menu_oa"
  ON "user_menu_assignments" ("oa_id");
