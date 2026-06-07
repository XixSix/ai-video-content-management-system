-- CreateTable
CREATE TABLE "transcript_edit_drafts" (
    "id" UUID NOT NULL,
    "transcript_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "base_transcript_version" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "client_sequence" INTEGER NOT NULL DEFAULT 0,
    "blocks" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "applied_at" TIMESTAMP(3),
    "discarded_at" TIMESTAMP(3),

    CONSTRAINT "transcript_edit_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transcript_edit_drafts_transcript_id_key" ON "transcript_edit_drafts"("transcript_id");

-- CreateIndex
CREATE INDEX "transcript_edit_drafts_user_id_idx" ON "transcript_edit_drafts"("user_id");

-- CreateIndex
CREATE INDEX "transcript_edit_drafts_transcript_id_idx" ON "transcript_edit_drafts"("transcript_id");

-- AddForeignKey
ALTER TABLE "transcript_edit_drafts" ADD CONSTRAINT "transcript_edit_drafts_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_edit_drafts" ADD CONSTRAINT "transcript_edit_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
