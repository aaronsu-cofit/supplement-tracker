CREATE TABLE "products" (
    "id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "line_oa" ADD COLUMN "product_id" VARCHAR(30);
CREATE INDEX "idx_line_oa_product" ON "line_oa" ("product_id");
ALTER TABLE "line_oa" ADD CONSTRAINT "line_oa_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "user_attributes" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_attributes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_attributes_user_id_key_key" ON "user_attributes" ("user_id", "key");
CREATE INDEX "idx_user_attributes_user" ON "user_attributes" ("user_id");
