from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


type ChapterSource = Literal["RULE_BASED", "LLM"]


class GenerateChaptersOptions(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    min_chapter_duration_seconds: float
    target_chapter_duration_seconds: float
    max_chapter_duration_seconds: float
    max_chapters: int
    use_embeddings: bool
    use_llm: bool


class GenerateChaptersTranscriptWord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    word_id: str
    segment_id: str | None = None
    start_seconds: float
    end_seconds: float
    text: str
    confidence: float | None = None


class GenerateChaptersTranscriptSegment(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    segment_id: str
    start_seconds: float
    end_seconds: float
    text: str
    clean_text: str | None = None
    speaker_label: str | None = None
    confidence: float | None = None
    words: list[GenerateChaptersTranscriptWord] = Field(default_factory=list)


class GenerateChaptersRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    request_id: str
    language: str | None = None
    media_duration_seconds: float | None = None
    segments: list[GenerateChaptersTranscriptSegment]
    options: GenerateChaptersOptions


class ChapterBoundaryScores(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    score: float | None = None
    boundary_score: float | None = None
    semantic_shift_score: float | None = None
    semantic_cohesion_score: float | None = None
    lexical_shift_score: float | None = None
    valley_depth_score: float | None = None
    discourse_marker_score: float | None = None
    pause_score: float | None = None
    duration_score: float | None = None
    boundary_quality_score: float | None = None
    llm_confidence_score: float | None = None


class GeneratedChapter(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    index: int
    start_seconds: float
    end_seconds: float
    title: str
    summary: str | None = None
    score: float | None = None
    scores: ChapterBoundaryScores = Field(default_factory=ChapterBoundaryScores)


class GenerateChaptersResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    request_id: str
    language: str | None = None
    model: str
    source: ChapterSource
    chapters: list[GeneratedChapter]
