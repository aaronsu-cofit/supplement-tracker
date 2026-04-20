ALTER TABLE "line_oa" ADD COLUMN "channel_secret" VARCHAR(200);
ALTER TABLE "line_oa" ADD COLUMN "line_destination_id" VARCHAR(64);
CREATE INDEX "idx_line_oa_destination" ON "line_oa" ("line_destination_id");
