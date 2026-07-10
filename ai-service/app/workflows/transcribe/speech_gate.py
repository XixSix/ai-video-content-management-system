from app.provider_contracts.vad import SpeechRegion


def speech_regions_pass_gate(
    *,
    regions: list[SpeechRegion],
    audio_sample_count: int,
    sample_rate: int,
    min_total_speech_ms: float,
    min_speech_ratio: float,
) -> bool:
    """Return whether speech regions contain enough speech to continue."""
    if not regions:
        return False

    total_speech_samples = sum(region.duration_samples for region in regions)
    min_total_samples = int(sample_rate * max(0.0, min_total_speech_ms) / 1000)
    if min_total_samples > 0 and total_speech_samples < min_total_samples:
        return False

    min_ratio = max(0.0, min_speech_ratio)
    if min_ratio > 0 and audio_sample_count > 0:
        return total_speech_samples / audio_sample_count >= min_ratio

    return True
