-- AlterTable
ALTER TABLE "video_chapters" ADD COLUMN     "boundary_quality_score" DOUBLE PRECISION,
ADD COLUMN     "lexical_shift_score" DOUBLE PRECISION,
ADD COLUMN     "llm_confidence_score" DOUBLE PRECISION,
ADD COLUMN     "valley_depth_score" DOUBLE PRECISION;
