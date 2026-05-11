-- CreateTable admins
CREATE TABLE "admins" (
    "id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" VARCHAR(200) NOT NULL,
    "display_name" VARCHAR(200),
    "picture_url" TEXT,
    "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'email',
    "role" VARCHAR(20) NOT NULL DEFAULT 'admin',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Taipei',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "idx_admins_deleted_at" ON "admins"("deleted_at");
