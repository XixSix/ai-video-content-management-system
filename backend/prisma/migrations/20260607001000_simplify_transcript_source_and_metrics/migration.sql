ALTER TABLE "transcripts" ALTER COLUMN "source" DROP DEFAULT;

UPDATE "transcripts"
SET
  "is_edited" = true
WHERE "source" = 'USER_EDITED';

ALTER TYPE "TranscriptSource" RENAME TO "TranscriptSource_old";

CREATE TYPE "TranscriptSource" AS ENUM (
  'IMPORTED',
  'LOCAL'
);

ALTER TABLE "transcripts"
ALTER COLUMN "source" TYPE "TranscriptSource"
USING (
  CASE
    WHEN "source"::text = 'IMPORTED' THEN 'IMPORTED'
    ELSE 'LOCAL'
  END
)::"TranscriptSource";

ALTER TABLE "transcripts" ALTER COLUMN "source" SET DEFAULT 'LOCAL';

DROP TYPE "TranscriptSource_old";

ALTER TABLE "transcripts"
DROP COLUMN "content",
DROP COLUMN "transcript_quality_score",
DROP COLUMN "filler_ratio",
DROP COLUMN "unique_word_ratio",
DROP COLUMN "speech_density";
