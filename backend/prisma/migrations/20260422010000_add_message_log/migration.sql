CREATE TABLE "message_log" (
    "id" SERIAL NOT NULL,
    "oa_id" INTEGER NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "content_text" TEXT,
    "content_json" JSONB,
    "source" VARCHAR(30),
    "source_ref" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_message_log_oa_time" ON "message_log" ("oa_id", "created_at");
CREATE INDEX "idx_message_log_user_time" ON "message_log" ("user_id", "created_at");
CREATE INDEX "idx_message_log_oa_user_time" ON "message_log" ("oa_id", "user_id", "created_at");
