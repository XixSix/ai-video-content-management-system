from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class TranscribePipelineConfig:
    vad_sample_rate: int
    vad_min_total_speech_ms: float
    vad_min_speech_ratio: float
    offline_asr_pad_seconds: float
    offline_asr_merge_gap_seconds: float
    offline_asr_max_window_seconds: float
    offline_asr_min_window_seconds: float
