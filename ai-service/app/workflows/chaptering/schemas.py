from dataclasses import dataclass


@dataclass(frozen=True)
class ChapterUnit:
    """Store a stable transcript unit for chapter analysis."""

    unit_id: str
    start_time: float
    end_time: float
    text: str
    clean_text: str
    segment_ids: list[str]


@dataclass(frozen=True)
class ChapterBoundaryCandidate:
    """Store a possible chapter boundary derived from a unit start."""

    time: float
    unit_index: int
    unit_id: str
    previous_unit_ids: list[str]
    next_unit_ids: list[str]
    cheap_score: float = 0.0
    discourse_marker_score: float = 0.0
    pause_score: float = 0.0
    lexical_shift_score: float = 0.0
    boundary_quality_score: float = 0.0
    duration_sanity_score: float = 0.0


@dataclass(frozen=True)
class ChapterBoundaryContextWindow:
    """Store left and right text context around a candidate boundary."""

    candidate_time: float
    left_text: str
    right_text: str
    left_unit_ids: list[str]
    right_unit_ids: list[str]


@dataclass(frozen=True)
class CandidateScoringConfig:
    """Store cheap candidate scoring tuning values."""

    context_seconds: float = 90.0
    long_pause_seconds: float = 1.20
    max_pause_score_seconds: float = 5.0
    min_context_text_chars: int = 120
    discourse_marker_weight: float = 0.30
    pause_weight: float = 0.25
    lexical_shift_weight: float = 0.20
    boundary_quality_weight: float = 0.15
    duration_sanity_weight: float = 0.10


@dataclass(frozen=True)
class CandidateRetentionConfig:
    """Store candidate retention tuning values for embedding cost control."""

    min_limit: int = 12
    max_limit: int = 40
    multiplier: int = 4
    top_score_fraction: float = 0.60
