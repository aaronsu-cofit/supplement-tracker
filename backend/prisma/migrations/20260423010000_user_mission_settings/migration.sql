CREATE TABLE "user_mission_settings" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "template_id" VARCHAR(30) NOT NULL,
    "daily_target" INTEGER,
    "reminder_enabled" BOOLEAN,
    "reminder_time" VARCHAR(10),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_mission_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_mission_settings_user_id_template_id_key"
  ON "user_mission_settings" ("user_id", "template_id");
CREATE INDEX "idx_user_mission_setting_user"
  ON "user_mission_settings" ("user_id");
