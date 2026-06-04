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
class ChapterCandidate:
    """Store a possible chapter boundary derived from a unit start."""

    time: float
    unit_index: int
    unit_id: str
    previous_unit_ids: list[str]
    next_unit_ids: list[str]
    cheap_score: float = 0.0
    candidate_score: float = 0.0
    semantic_shift_score: float = 0.0
    discourse_marker_score: float = 0.0
    pause_score: float = 0.0
    lexical_shift_score: float = 0.0
    valley_depth_score: float = 0.0
    boundary_quality_score: float = 0.0
    duration_sanity_score: float = 0.0


@dataclass(frozen=True)
class ChapterGapScore:
    """Store Phase 3 topic-cohesion scores for one gap between timeline units."""

    time: float
    unit_index: int
    unit_id: str
    previous_unit_ids: list[str]
    next_unit_ids: list[str]
    left_text: str
    right_text: str
    left_unit_ids: list[str]
    right_unit_ids: list[str]
    lexical_cohesion_score: float = 0.0
    lexical_shift_score: float = 0.0
    semantic_shift_score: float = 0.0
    valley_depth_score: float = 0.0
    discourse_marker_score: float = 0.0
    pause_score: float = 0.0
    boundary_quality_score: float = 0.0
    duration_sanity_score: float = 0.0
    combined_score: float = 0.0


@dataclass(frozen=True)
class ChapterContextWindow:
    """Store left and right text context around a candidate boundary."""

    candidate_time: float
    left_text: str
    right_text: str
    left_unit_ids: list[str]
    right_unit_ids: list[str]


@dataclass(frozen=True)
class CandidateScoringConfig:
    """Store cheap candidate scoring tuning values."""

    context_seconds: float
    long_pause_seconds: float
    max_pause_score_seconds: float
    min_context_text_chars: int
    discourse_marker_weight: float
    pause_weight: float
    lexical_shift_weight: float
    boundary_quality_weight: float
    duration_sanity_weight: float


@dataclass(frozen=True)
class CandidateRetentionConfig:
    """Store candidate retention tuning values for embedding cost control."""

    min_limit: int
    max_limit: int
    multiplier: int
    top_score_fraction: float


@dataclass(frozen=True)
class ValleyDetectionConfig:
    """Store TextTiling-style valley detection tuning values."""

    smoothing_radius: int
    peak_window: int
    min_valley_depth: float


@dataclass(frozen=True)
class ChapteringPipelineConfig:
    """Store deterministic chaptering workflow tuning values."""

    strategy: str
    model_name: str
    target_unit_duration_seconds: float
    max_unit_duration_seconds: float
    target_unit_words: int
    max_unit_words: int
    max_unit_chars: int
    pause_boundary_seconds: float
    punctuation_poor_threshold: float
    context_window_seconds: float
    scoring: CandidateScoringConfig
    valley: ValleyDetectionConfig
    retention: CandidateRetentionConfig
