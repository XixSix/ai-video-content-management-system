-- CreateTable
CREATE TABLE "transcript_words" (
    "id" UUID NOT NULL,
    "transcript_id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "word_index" INTEGER NOT NULL,
    "segment_word_index" INTEGER NOT NULL,
    "start_time" DOUBLE PRECISION NOT NULL,
    "end_time" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "clean_text" TEXT,
    "confidence" DOUBLE PRECISION,
    "speaker_label" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_words_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transcript_words_transcript_id_idx" ON "transcript_words"("transcript_id");

-- CreateIndex
CREATE INDEX "transcript_words_segment_id_idx" ON "transcript_words"("segment_id");

-- CreateIndex
CREATE INDEX "transcript_words_media_id_idx" ON "transcript_words"("media_id");

-- CreateIndex
CREATE INDEX "transcript_words_start_time_end_time_idx" ON "transcript_words"("start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_words_transcript_id_word_index_key" ON "transcript_words"("transcript_id", "word_index");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_words_segment_id_segment_word_index_key" ON "transcript_words"("segment_id", "segment_word_index");

-- AddForeignKey
ALTER TABLE "transcript_words" ADD CONSTRAINT "transcript_words_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_words" ADD CONSTRAINT "transcript_words_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "transcript_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_words" ADD CONSTRAINT "transcript_words_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
