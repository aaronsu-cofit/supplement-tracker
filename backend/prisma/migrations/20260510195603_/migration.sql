-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ReliefType" AS ENUM ('BREATHING', 'BODY_SCAN', 'SLEEP_QUOTES');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "unmatched_intents" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shoe_images" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "image_data" TEXT,
    "ai_risk_level" VARCHAR(50),
    "ai_wear_pattern" VARCHAR(100),
    "ai_summary" TEXT,
    "ai_details" JSONB,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shoe_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "line_oa_rich_menu_template" (
    "id" SERIAL NOT NULL,
    "oa_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "zones" JSONB NOT NULL,
    "line_rich_menu_id" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "line_oa_rich_menu_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "diary_entries" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "date" DATE NOT NULL,
    "mood" INTEGER NOT NULL,
    "sleep" INTEGER NOT NULL,
    "diary" TEXT,
    "ai_feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "relief_sessions" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "type" "ReliefType" NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relief_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "assessment_results" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "result_type" VARCHAR(1) NOT NULL,
    "scores" JSONB NOT NULL,
    "ai_analysis" JSONB NOT NULL,
    "face_insight" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_shoe_images_user" ON "shoe_images"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rich_menu_templates_oa" ON "line_oa_rich_menu_template"("oa_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "diary_entries_user_id_date_key" ON "diary_entries"("user_id", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_relief_sessions_user" ON "relief_sessions"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_assessment_results_user" ON "assessment_results"("user_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "shoe_images" ADD CONSTRAINT "shoe_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "line_oa_rich_menu_template" ADD CONSTRAINT "line_oa_rich_menu_template_oa_id_fkey" FOREIGN KEY ("oa_id") REFERENCES "line_oa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "relief_sessions" ADD CONSTRAINT "relief_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
