-- DropTable
DROP TABLE "editor_document_versions";

-- AlterTable
ALTER TABLE "projects"
DROP COLUMN "current_document_version";

-- RenameTable
ALTER TABLE "editor_documents"
RENAME TO "editor_snapshots";

-- RenameColumn
ALTER TABLE "editor_snapshots"
RENAME COLUMN "document_json" TO "snapshot_json";

-- RenameConstraint
ALTER TABLE "editor_snapshots"
RENAME CONSTRAINT "editor_documents_pkey" TO "editor_snapshots_pkey";

ALTER TABLE "editor_snapshots"
RENAME CONSTRAINT "editor_documents_project_id_fkey" TO "editor_snapshots_project_id_fkey";

ALTER TABLE "editor_snapshots"
RENAME CONSTRAINT "editor_documents_saved_by_user_id_fkey" TO "editor_snapshots_saved_by_user_id_fkey";

-- RenameIndex
ALTER INDEX "editor_documents_project_id_key"
RENAME TO "editor_snapshots_project_id_key";

ALTER INDEX "editor_documents_saved_by_user_id_idx"
RENAME TO "editor_snapshots_saved_by_user_id_idx";
