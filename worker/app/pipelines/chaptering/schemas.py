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
