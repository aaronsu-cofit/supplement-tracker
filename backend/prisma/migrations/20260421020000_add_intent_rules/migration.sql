CREATE TABLE "intent_rules" (
    "id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "match_type" VARCHAR(20) NOT NULL DEFAULT 'keyword',
    "patterns" JSONB NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "action_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "intent_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_intent_rules_product_pri" ON "intent_rules" ("product_id", "is_active", "priority");

ALTER TABLE "intent_rules" ADD CONSTRAINT "intent_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
