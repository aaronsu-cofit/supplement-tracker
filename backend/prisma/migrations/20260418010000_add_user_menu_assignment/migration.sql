CREATE TABLE "user_menu_assignments" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "oa_id" INTEGER NOT NULL,
    "template_id" INTEGER,
    "source" VARCHAR(20) NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_menu_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_menu_assignments_user_id_oa_id_key"
  ON "user_menu_assignments" ("user_id", "oa_id");

CREATE INDEX "idx_user_menu_oa"
  ON "user_menu_assignments" ("oa_id");
