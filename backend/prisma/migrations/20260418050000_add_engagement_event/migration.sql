CREATE TABLE "engagement_events" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "event_type" VARCHAR(30) NOT NULL,
    "payload" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_engagement_user_time" ON "engagement_events" ("user_id", "occurred_at");
CREATE INDEX "idx_engagement_type_time" ON "engagement_events" ("event_type", "occurred_at");
