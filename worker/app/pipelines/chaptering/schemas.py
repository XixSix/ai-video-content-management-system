from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class ChapterUnit:
    """Store a sentence-like transcript unit for chapter analysis."""

    unit_id: str
    start_time: float
    end_time: float
    text: str
    clean_text: str
    segment_ids: list[UUID]


@dataclass(frozen=True)
class ChapterBoundaryCandidate:
    """Store a possible chapter boundary derived from a chapter unit start."""

    time: float
    unit_index: int
    unit_id: str
    previous_unit_ids: list[str]
    next_unit_ids: list[str]
