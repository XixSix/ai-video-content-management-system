-- Simplify long-to-short persistence for the LLM-only MVP flow.
-- ClipCandidate owns the AI suggestion/timeline; ShortClip only tracks a rendered result.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "clip_candidates"
  ADD COLUMN "user_id" UUID,
  ADD COLUMN "title" VARCHAR(255),
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "score" DOUBLE PRECISION;

UPDATE "clip_candidates" cc
SET
  "user_id" = m."user_id",
  "reason" = cc."llm_reason",
  "score" = COALESCE(cc."llm_score", cc."final_score")
FROM "media" m
WHERE m."id" = cc."media_id";

ALTER TABLE "short_clips" ADD COLUMN "_candidate_backfill_id" UUID;

UPDATE "short_clips"
SET "_candidate_backfill_id" = gen_random_uuid()
WHERE "candidate_id" IS NULL
  AND "transcript_id" IS NOT NULL
  AND "transcript_version" IS NOT NULL;

INSERT INTO "clip_candidates" (
  "id",
  "media_id",
  "user_id",
  "transcript_id",
  "chapter_id",
  "job_id",
  "project_id",
  "start_time",
  "end_time",
  "duration",
  "transcript_version",
  "text",
  "title",
  "reason",
  "score",
  "status",
  "created_at"
)
SELECT
  sc."_candidate_backfill_id",
  sc."media_id",
  sc."user_id",
  sc."transcript_id",
  sc."chapter_id",
  NULL,
  sc."project_id",
  sc."start_time",
  sc."end_time",
  sc."duration",
  sc."transcript_version",
  NULL,
  sc."title",
  sc."reason",
  sc."score",
  'SELECTED'::"ClipCandidateStatus",
  sc."created_at"
FROM "short_clips" sc
WHERE sc."_candidate_backfill_id" IS NOT NULL;

UPDATE "short_clips"
SET "candidate_id" = "_candidate_backfill_id"
WHERE "_candidate_backfill_id" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "clip_candidates" WHERE "user_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make clip_candidates.user_id required: some candidates could not be backfilled from media';
  END IF;

  IF EXISTS (SELECT 1 FROM "short_clips" WHERE "candidate_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make short_clips.candidate_id required: some short clips have no candidate and lack transcript data for backfill';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "short_clips"
    GROUP BY "candidate_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one short clip per candidate: duplicate short_clips.candidate_id values exist';
  END IF;
END $$;

ALTER TABLE "clip_candidates" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "short_clips" DROP CONSTRAINT "short_clips_transcript_id_fkey";
ALTER TABLE "short_clips" DROP CONSTRAINT "short_clips_chapter_id_fkey";
ALTER TABLE "short_clips" DROP CONSTRAINT "short_clips_candidate_id_fkey";

DROP INDEX "clip_candidates_final_score_idx";
DROP INDEX "short_clips_transcript_id_idx";
DROP INDEX "short_clips_chapter_id_idx";
DROP INDEX "short_clips_candidate_id_idx";

ALTER TABLE "clip_candidates"
  DROP COLUMN "clean_text",
  DROP COLUMN "hook_score",
  DROP COLUMN "question_score",
  DROP COLUMN "keyword_score",
  DROP COLUMN "duration_score",
  DROP COLUMN "speech_density_score",
  DROP COLUMN "saliency_score",
  DROP COLUMN "completeness_score",
  DROP COLUMN "emotion_score",
  DROP COLUMN "final_score",
  DROP COLUMN "llm_score",
  DROP COLUMN "llm_reason",
  DROP COLUMN "dedup_group_id";

ALTER TABLE "short_clips"
  ALTER COLUMN "candidate_id" SET NOT NULL,
  DROP COLUMN "_candidate_backfill_id",
  DROP COLUMN "transcript_id",
  DROP COLUMN "chapter_id",
  DROP COLUMN "title",
  DROP COLUMN "start_time",
  DROP COLUMN "end_time",
  DROP COLUMN "duration",
  DROP COLUMN "transcript_version",
  DROP COLUMN "score",
  DROP COLUMN "reason";

CREATE INDEX "clip_candidates_user_id_idx" ON "clip_candidates"("user_id");
CREATE INDEX "clip_candidates_score_idx" ON "clip_candidates"("score");
CREATE UNIQUE INDEX "short_clips_candidate_id_key" ON "short_clips"("candidate_id");

ALTER TABLE "clip_candidates"
  ADD CONSTRAINT "clip_candidates_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "short_clips"
  ADD CONSTRAINT "short_clips_candidate_id_fkey"
  FOREIGN KEY ("candidate_id") REFERENCES "clip_candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
