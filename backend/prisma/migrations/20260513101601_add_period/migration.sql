-- CreateTable
CREATE TABLE "menstrual_cycles" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "cycle_length" INTEGER NOT NULL DEFAULT 28,
    "period_length" INTEGER NOT NULL DEFAULT 5,
    "onboarding_done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menstrual_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_periods" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menstrual_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_daily_logs" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menstrual_daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menstrual_cycles_user_id_key" ON "menstrual_cycles"("user_id");

-- CreateIndex
CREATE INDEX "idx_periods_user" ON "menstrual_periods"("user_id");

-- CreateIndex
CREATE INDEX "idx_periods_startDate" ON "menstrual_periods"("startDate");

-- CreateIndex
CREATE INDEX "idx_daily_logs_user" ON "menstrual_daily_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "menstrual_daily_logs_user_id_date_key" ON "menstrual_daily_logs"("user_id", "date");

-- AddForeignKey
ALTER TABLE "menstrual_cycles" ADD CONSTRAINT "menstrual_cycles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menstrual_periods" ADD CONSTRAINT "menstrual_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menstrual_daily_logs" ADD CONSTRAINT "menstrual_daily_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
