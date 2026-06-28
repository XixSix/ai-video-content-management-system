from pydantic import BaseModel, ConfigDict, Field

from app.schemas.short_clip import (
    ShortClipChapterContext,
    ShortClipPreferences,
    ShortClipTranscriptSegment,
)


class ShortClipCandidateInput(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    language: str | None = None
    media_duration_seconds: float
    segments: list[ShortClipTranscriptSegment]
    chapters: list[ShortClipChapterContext] = Field(default_factory=list)
    preferences: ShortClipPreferences


class ClipCandidateProposal(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    start_segment_id: str
    end_segment_id: str
    title: str | None = None
    reason: str | None = None
    score: float | None = None
