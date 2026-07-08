from dataclasses import dataclass
from typing import Literal
from uuid import UUID


type ChapterSource = Literal["IMPORTED", "WORDS", "SEGMENTS"]
CHAPTER_SOURCE_SEGMENTS = "SEGMENTS"
RULE_BASED_GENERATE_CHAPTERS_MODEL = "rule-based-generate-chapters-v1"


@dataclass(frozen=True)
class GenerateChaptersTranscriptSegment:
    id: UUID
    start_time: float
    end_time: float
    text: str
    clean_text: str | None = None


@dataclass(frozen=True)
class GenerateChaptersTranscript:
    id: UUID
    media_id: UUID
    language: str | None
    version: int
    media_duration: float | None
    segments: list[GenerateChaptersTranscriptSegment]


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
class GeneratedChaptersResult:
    transcript_id: UUID
    transcript_version: int
    source: ChapterSource
    model: str
    chapters: list[ChapterCandidate]
