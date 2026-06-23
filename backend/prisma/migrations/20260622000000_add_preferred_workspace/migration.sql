ALTER TABLE "users"
ADD COLUMN "preferred_workspace_id" UUID;

UPDATE "users"
SET "preferred_workspace_id" = (
    SELECT "workspace_members"."workspace_id"
    FROM "workspace_members"
    WHERE "workspace_members"."user_id" = "users"."id"
    ORDER BY "workspace_members"."created_at" ASC, "workspace_members"."id" ASC
    LIMIT 1
);

CREATE INDEX "users_preferred_workspace_id_idx"
ON "users"("preferred_workspace_id");

ALTER TABLE "users"
ADD CONSTRAINT "users_preferred_workspace_id_fkey"
FOREIGN KEY ("preferred_workspace_id")
REFERENCES "workspaces"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
