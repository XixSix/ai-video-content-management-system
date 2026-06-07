ALTER TABLE "transcripts" ALTER COLUMN "source" DROP DEFAULT;

UPDATE "transcripts"
SET
  "is_edited" = true,
  "source" = 'LOCAL'
WHERE "source" = 'USER_EDITED';

UPDATE "transcripts"
SET "source" = 'LOCAL'
WHERE "source" IN ('FASTER_WHISPER', 'WHISPER');

ALTER TYPE "TranscriptSource" RENAME TO "TranscriptSource_old";

CREATE TYPE "TranscriptSource" AS ENUM (
  'IMPORTED',
  'LOCAL'
);

ALTER TABLE "transcripts"
ALTER COLUMN "source" TYPE "TranscriptSource"
USING "source"::text::"TranscriptSource";

ALTER TABLE "transcripts" ALTER COLUMN "source" SET DEFAULT 'LOCAL';

DROP TYPE "TranscriptSource_old";

ALTER TABLE "transcripts"
DROP COLUMN "content",
DROP COLUMN "transcript_quality_score",
DROP COLUMN "filler_ratio",
DROP COLUMN "unique_word_ratio",
DROP COLUMN "speech_density";
