-- Add workspace ownership to existing platform accounts.
ALTER TABLE "platform_accounts"
ADD COLUMN "workspace_id" UUID;

UPDATE "platform_accounts" AS "account"
SET "workspace_id" = COALESCE(
    (
        SELECT "membership"."workspace_id"
        FROM "users" AS "user_record"
        JOIN "workspace_members" AS "membership"
          ON "membership"."workspace_id" = "user_record"."preferred_workspace_id"
         AND "membership"."user_id" = "account"."user_id"
        WHERE "user_record"."id" = "account"."user_id"
        LIMIT 1
    ),
    (
        SELECT "membership"."workspace_id"
        FROM "workspace_members" AS "membership"
        WHERE "membership"."user_id" = "account"."user_id"
          AND "membership"."role" = 'OWNER'
        ORDER BY "membership"."created_at" ASC, "membership"."id" ASC
        LIMIT 1
    )
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "platform_accounts"
        WHERE "workspace_id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot backfill workspace_id for every platform account';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "platform_accounts"
        GROUP BY "workspace_id", "platform"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Multiple platform accounts for the same workspace and platform require manual resolution';
    END IF;
END
$$;

DROP INDEX "platform_accounts_user_id_platform_key";

ALTER TABLE "platform_accounts"
ALTER COLUMN "workspace_id" SET NOT NULL;

CREATE UNIQUE INDEX "platform_accounts_workspace_id_platform_key"
ON "platform_accounts"("workspace_id", "platform");

CREATE INDEX "platform_accounts_workspace_id_idx"
ON "platform_accounts"("workspace_id");

ALTER TABLE "platform_accounts"
ADD CONSTRAINT "platform_accounts_workspace_id_fkey"
FOREIGN KEY ("workspace_id")
REFERENCES "workspaces"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Pending OAuth callbacks are intentionally invalidated by this migration.
DELETE FROM "platform_oauth_states";

ALTER TABLE "platform_oauth_states"
ADD COLUMN "workspace_id" UUID NOT NULL;

CREATE INDEX "platform_oauth_states_workspace_id_idx"
ON "platform_oauth_states"("workspace_id");

ALTER TABLE "platform_oauth_states"
ADD CONSTRAINT "platform_oauth_states_workspace_id_fkey"
FOREIGN KEY ("workspace_id")
REFERENCES "workspaces"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
