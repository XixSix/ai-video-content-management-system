from pydantic import BaseModel, ConfigDict, Field

from app.schemas.generate_short_clips import (
    GenerateShortClipsChapterContext,
    GenerateShortClipsPreferences,
    GenerateShortClipsTranscriptSegment,
)


class GenerateShortClipsCandidateInput(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    language: str | None = None
    media_duration_seconds: float
    segments: list[GenerateShortClipsTranscriptSegment]
    chapters: list[GenerateShortClipsChapterContext] = Field(default_factory=list)
    preferences: GenerateShortClipsPreferences


class GeneratedShortClipCandidateProposal(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    start_segment_id: str
    end_segment_id: str
    title: str | None = None
    reason: str | None = None
    score: float | None = None
