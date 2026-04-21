CREATE TABLE "journey_templates" (
    "id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "phases" JSONB NOT NULL,
    "transitions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "journey_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "journey_templates_product_id_key_key" ON "journey_templates" ("product_id", "key");
CREATE INDEX "idx_journey_templates_product" ON "journey_templates" ("product_id");
ALTER TABLE "journey_templates" ADD CONSTRAINT "journey_templates_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_journey_phases" (
    "id" SERIAL NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "journey_key" VARCHAR(100) NOT NULL,
    "phase_key" VARCHAR(100) NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_journey_phases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_journey_phases_product_id_user_id_journey_key_key" ON "user_journey_phases" ("product_id", "user_id", "journey_key");
CREATE INDEX "idx_user_journey_phase" ON "user_journey_phases" ("product_id", "journey_key", "phase_key");
