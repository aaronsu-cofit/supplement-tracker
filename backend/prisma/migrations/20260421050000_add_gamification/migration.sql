CREATE TABLE "user_streaks" (
    "id" SERIAL NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "streak_key" VARCHAR(100) NOT NULL,
    "count_current" INTEGER NOT NULL DEFAULT 0,
    "count_best" INTEGER NOT NULL DEFAULT 0,
    "last_occurred_on" DATE,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_streaks_product_id_user_id_streak_key_key" ON "user_streaks" ("product_id", "user_id", "streak_key");
CREATE INDEX "idx_user_streaks_product_key" ON "user_streaks" ("product_id", "streak_key");
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "badge_templates" (
    "id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "criteria" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "badge_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "badge_templates_product_id_key_key" ON "badge_templates" ("product_id", "key");
CREATE INDEX "idx_badge_templates_product" ON "badge_templates" ("product_id");
ALTER TABLE "badge_templates" ADD CONSTRAINT "badge_templates_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_badges" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "template_id" VARCHAR(30) NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_badges_user_id_template_id_key" ON "user_badges" ("user_id", "template_id");
CREATE INDEX "idx_user_badges_user" ON "user_badges" ("user_id");
CREATE INDEX "idx_user_badges_template" ON "user_badges" ("template_id");
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "badge_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
