CREATE TABLE "coblocks_scenarios" (
    "id" TEXT NOT NULL,
    "oa_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flow_nodes" JSONB NOT NULL DEFAULT '[]',
    "flow_edges" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "coblocks_scenarios_pkey" PRIMARY KEY ("id")
);
