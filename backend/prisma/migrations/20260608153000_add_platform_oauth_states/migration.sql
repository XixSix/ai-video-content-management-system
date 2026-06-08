-- CreateTable
CREATE TABLE "platform_oauth_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "state_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_oauth_states_state_hash_key" ON "platform_oauth_states"("state_hash");

-- CreateIndex
CREATE INDEX "platform_oauth_states_user_id_idx" ON "platform_oauth_states"("user_id");

-- CreateIndex
CREATE INDEX "platform_oauth_states_platform_idx" ON "platform_oauth_states"("platform");

-- CreateIndex
CREATE INDEX "platform_oauth_states_expires_at_idx" ON "platform_oauth_states"("expires_at");

-- AddForeignKey
ALTER TABLE "platform_oauth_states" ADD CONSTRAINT "platform_oauth_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
