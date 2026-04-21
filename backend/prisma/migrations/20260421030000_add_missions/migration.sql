CREATE TABLE "mission_templates" (
    "id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mission_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mission_templates_product_id_key_key" ON "mission_templates" ("product_id", "key");
CREATE INDEX "idx_mission_templates_product" ON "mission_templates" ("product_id");

ALTER TABLE "mission_templates" ADD CONSTRAINT "mission_templates_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mission_assignments" (
    "id" VARCHAR(30) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "template_id" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "mission_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_mission_assignments_user_status" ON "mission_assignments" ("user_id", "status");
CREATE INDEX "idx_mission_assignments_template" ON "mission_assignments" ("template_id");

ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "mission_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
