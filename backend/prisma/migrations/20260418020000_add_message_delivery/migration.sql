CREATE TABLE "message_deliveries" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "scenario_id" VARCHAR(30) NOT NULL,
    "node_id" VARCHAR(100) NOT NULL,
    "delivered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "message_deliveries_user_id_scenario_id_node_id_key" ON "message_deliveries" ("user_id", "scenario_id", "node_id");
CREATE INDEX "idx_message_delivery_user" ON "message_deliveries" ("user_id");
