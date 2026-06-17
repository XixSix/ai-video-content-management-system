-- Backfill a default owned workspace for existing users before making workspace ownership required.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO "workspaces" ("id", "owner_id", "name", "slug", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    "users"."id",
    COALESCE(NULLIF("users"."full_name", ''), NULLIF(split_part("users"."email", '@', 1), ''), 'Workspace'),
    'workspace-' || replace("users"."id"::text, '-', ''),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users"
WHERE NOT EXISTS (
    SELECT 1
    FROM "workspaces"
    WHERE "workspaces"."owner_id" = "users"."id"
);

INSERT INTO "workspace_members" ("id", "workspace_id", "user_id", "role", "created_at")
SELECT
    gen_random_uuid(),
    "workspaces"."id",
    "workspaces"."owner_id",
    'OWNER',
    CURRENT_TIMESTAMP
FROM "workspaces"
WHERE NOT EXISTS (
    SELECT 1
    FROM "workspace_members"
    WHERE "workspace_members"."workspace_id" = "workspaces"."id"
      AND "workspace_members"."user_id" = "workspaces"."owner_id"
);

UPDATE "media"
SET "workspace_id" = (
    SELECT "workspaces"."id"
    FROM "workspaces"
    WHERE "workspaces"."owner_id" = "media"."user_id"
    ORDER BY "workspaces"."created_at" ASC, "workspaces"."id" ASC
    LIMIT 1
)
WHERE "media"."workspace_id" IS NULL;

UPDATE "projects"
SET "workspace_id" = (
    SELECT "workspaces"."id"
    FROM "workspaces"
    WHERE "workspaces"."owner_id" = "projects"."user_id"
    ORDER BY "workspaces"."created_at" ASC, "workspaces"."id" ASC
    LIMIT 1
)
WHERE "projects"."workspace_id" IS NULL;

ALTER TABLE "media" DROP CONSTRAINT "media_workspace_id_fkey";
ALTER TABLE "projects" DROP CONSTRAINT "projects_workspace_id_fkey";

DROP INDEX "projects_user_id_slug_key";

ALTER TABLE "media" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "workspace_id" SET NOT NULL;

CREATE UNIQUE INDEX "projects_workspace_id_slug_key" ON "projects"("workspace_id", "slug");

ALTER TABLE "media"
ADD CONSTRAINT "media_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects"
ADD CONSTRAINT "projects_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
