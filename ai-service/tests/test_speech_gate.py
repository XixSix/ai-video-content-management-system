from app.provider_contracts.vad import SpeechRegion
from app.workflows.transcribe.speech_gate import speech_regions_pass_gate


def test_speech_regions_gate_rejects_empty_regions() -> None:
    assert (
        speech_regions_pass_gate(
            regions=[],
            audio_sample_count=16_000,
            sample_rate=16_000,
            min_total_speech_ms=0,
            min_speech_ratio=0,
        )
        is False
    )


def test_speech_regions_gate_requires_min_total_speech() -> None:
    regions = [SpeechRegion(start_sample=0, end_sample=1_000)]

    assert (
        speech_regions_pass_gate(
            regions=regions,
            audio_sample_count=16_000,
            sample_rate=16_000,
            min_total_speech_ms=100,
            min_speech_ratio=0,
        )
        is False
    )


def test_speech_regions_gate_requires_min_ratio() -> None:
    regions = [SpeechRegion(start_sample=0, end_sample=2_000)]

    assert (
        speech_regions_pass_gate(
            regions=regions,
            audio_sample_count=16_000,
            sample_rate=16_000,
            min_total_speech_ms=0,
            min_speech_ratio=0.2,
        )
        is False
    )


def test_speech_regions_gate_passes_when_thresholds_are_met() -> None:
    regions = [
        SpeechRegion(start_sample=0, end_sample=2_000),
        SpeechRegion(start_sample=4_000, end_sample=6_000),
    ]

    assert (
        speech_regions_pass_gate(
            regions=regions,
            audio_sample_count=16_000,
            sample_rate=16_000,
            min_total_speech_ms=200,
            min_speech_ratio=0.2,
        )
        is True
    )


def test_speech_regions_gate_ignores_negative_thresholds() -> None:
    regions = [SpeechRegion(start_sample=0, end_sample=1)]

    assert (
        speech_regions_pass_gate(
            regions=regions,
            audio_sample_count=16_000,
            sample_rate=16_000,
            min_total_speech_ms=-1,
            min_speech_ratio=-1,
        )
        is True
    )
