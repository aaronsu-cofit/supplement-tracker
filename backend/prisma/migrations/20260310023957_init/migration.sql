-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(200),
    "password_hash" VARCHAR(200),
    "display_name" VARCHAR(200),
    "picture_url" TEXT,
    "auth_provider" VARCHAR(20) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplements" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "dosage" VARCHAR(100),
    "frequency" VARCHAR(50) NOT NULL DEFAULT 'daily',
    "time_of_day" VARCHAR(20) NOT NULL DEFAULT 'morning',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "supplement_id" INTEGER NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wounds" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200),
    "location" VARCHAR(200),
    "date_of_injury" DATE,
    "display_name" VARCHAR(200),
    "picture_url" TEXT,
    "wound_type" VARCHAR(50),
    "body_location" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wound_logs" (
    "id" SERIAL NOT NULL,
    "wound_id" INTEGER NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "image_data" TEXT,
    "nrs_pain_score" INTEGER NOT NULL DEFAULT 0,
    "symptoms" TEXT,
    "ai_assessment_summary" TEXT,
    "ai_status_label" VARCHAR(100),
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wound_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foot_assessments" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "pain_locations" TEXT,
    "nrs_pain_score" INTEGER NOT NULL DEFAULT 0,
    "steps_count" INTEGER NOT NULL DEFAULT 0,
    "standing_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foot_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foot_images" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "image_data" TEXT,
    "ai_severity" VARCHAR(50),
    "ai_summary" TEXT,
    "ai_details" JSONB,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foot_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intimacy_assessments" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "gender" VARCHAR(20),
    "primary_concern" VARCHAR(200),
    "assessment_data" JSONB,
    "ai_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intimacy_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" VARCHAR(50) NOT NULL,
    "name_zh" VARCHAR(100),
    "name_en" VARCHAR(100),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "external_url" TEXT,
    "icon_type" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_supplements_user" ON "supplements"("user_id");

-- CreateIndex
CREATE INDEX "idx_checkins_user_date" ON "check_ins"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_wounds_user" ON "wounds"("user_id");

-- CreateIndex
CREATE INDEX "idx_wound_logs_user_date" ON "wound_logs"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_foot_assessments_user_date" ON "foot_assessments"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_foot_images_user" ON "foot_images"("user_id");

-- CreateIndex
CREATE INDEX "idx_intimacy_assessments_user" ON "intimacy_assessments"("user_id");

-- AddForeignKey
ALTER TABLE "supplements" ADD CONSTRAINT "supplements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_supplement_id_fkey" FOREIGN KEY ("supplement_id") REFERENCES "supplements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wounds" ADD CONSTRAINT "wounds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wound_logs" ADD CONSTRAINT "wound_logs_wound_id_fkey" FOREIGN KEY ("wound_id") REFERENCES "wounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wound_logs" ADD CONSTRAINT "wound_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foot_assessments" ADD CONSTRAINT "foot_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foot_images" ADD CONSTRAINT "foot_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intimacy_assessments" ADD CONSTRAINT "intimacy_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
