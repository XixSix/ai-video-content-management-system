from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class ShortClipCandidateResult:
    start_segment_id: UUID
    end_segment_id: UUID
    source_segment_ids: list[UUID]
    start_time: float
    end_time: float
    duration: float
    title: str
    reason: str
    score: float
    text: str
    provider: str = "ai-service"
    model: str | None = None
