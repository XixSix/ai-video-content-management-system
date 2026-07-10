from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


type GenerateShortClipsSource = Literal["NOOP", "LLM"]
type ClipLength = Literal["AUTO", "15_30", "30_60", "60_90"]
type AspectRatio = Literal["9:16", "1:1", "16:9"]
type GenerateShortClipsLanguage = Literal["AUTO", "ENGLISH", "VIETNAMESE"]
type GenerateShortClipsGenre = Literal[
    "AUTO", "PODCAST", "INTERVIEW", "TUTORIAL", "WEBINAR"
]
type GenerateShortClipsModelMode = Literal["AUTO", "BALANCED", "VIRAL_HOOKS"]


class GenerateShortClipsPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    clip_count: int = Field(ge=1, le=10)
    clip_length: ClipLength
    min_duration_seconds: float = Field(ge=5, le=180)
    max_duration_seconds: float = Field(ge=5, le=180)
    aspect_ratio: AspectRatio
    language: GenerateShortClipsLanguage
    genre: GenerateShortClipsGenre
    clip_model: GenerateShortClipsModelMode
    auto_hook: bool
    prompt: str = Field(max_length=1000)
    caption_preset_id: str = Field(min_length=1, max_length=100)
    burn_subtitle: bool


class GenerateShortClipsTranscriptSegment(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    segment_id: str
    start_seconds: float
    end_seconds: float
    text: str


class GenerateShortClipsChapterContext(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    chapter_id: str
    start_seconds: float
    end_seconds: float
    title: str
    summary: str | None = None


class GenerateShortClipsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    request_id: str
    transcript_id: str | None = None
    transcript_version: int | None = None
    language: str | None = None
    media_duration_seconds: float
    segments: list[GenerateShortClipsTranscriptSegment]
    chapters: list[GenerateShortClipsChapterContext] = Field(default_factory=list)
    preferences: GenerateShortClipsPreferences


class GeneratedShortClipCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    start_segment_id: str
    end_segment_id: str
    source_segment_ids: list[str]
    start_seconds: float
    end_seconds: float
    duration_seconds: float
    title: str
    reason: str
    score: float
    text: str


class GenerateShortClipsResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    request_id: str
    language: str | None = None
    model: str
    source: GenerateShortClipsSource
    candidates: list[GeneratedShortClipCandidate]
