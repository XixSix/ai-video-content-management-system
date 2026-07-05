from dataclasses import dataclass
from typing import Literal
from uuid import UUID


type ChapterGenerationSource = Literal["RULE_BASED", "LLM", "USER_EDITED"]
type ChapterSource = Literal["IMPORTED", "WORDS", "SEGMENTS"]
CHAPTER_SOURCE_RULE_BASED = "RULE_BASED"
CHAPTER_SOURCE_SEGMENTS = "SEGMENTS"
RULE_BASED_CHAPTERING_MODEL = "rule-based-chaptering-v1"


@dataclass(frozen=True)
class ChapteringTranscriptSegment:
    id: UUID
    start_time: float
    end_time: float
    text: str
    clean_text: str | None = None


@dataclass(frozen=True)
class ChapteringTranscript:
    id: UUID
    media_id: UUID
    language: str | None
    version: int
    media_duration: float | None
    segments: list[ChapteringTranscriptSegment]


@dataclass(frozen=True)
class ChapterBoundaryScore:
    score: float
    boundary_score: float
    pause_score: float
    discourse_marker_score: float
    semantic_shift_score: float
    duration_score: float


@dataclass(frozen=True)
class ChapterCandidate:
    chapter_index: int
    start_time: float
    end_time: float
    title: str
    summary: str | None
    text: str
    score: ChapterBoundaryScore


@dataclass(frozen=True)
class ChapteringResult:
    transcript_id: UUID
    transcript_version: int
    source: ChapterGenerationSource
    model: str
    chapters: list[ChapterCandidate]
