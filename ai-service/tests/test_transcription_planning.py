import pytest

from app.provider_contracts.diarization import DiarizedTurn
from app.provider_contracts.vad import SpeechRegion
from app.workflows.transcription.planning import (
    OfflineAsrWindow,
    plan_chunk_ranges,
    plan_diarized_asr_ranges,
    plan_vad_asr_ranges,
    plan_vad_asr_windows,
)


def test_plan_vad_asr_ranges_pads_and_merges_close_regions() -> None:
    ranges = plan_vad_asr_ranges(
        [
            SpeechRegion(start_sample=1_000, end_sample=2_000),
            SpeechRegion(start_sample=2_300, end_sample=3_000),
        ],
        total_samples=10_000,
        sample_rate=1_000,
        pad_seconds=0.1,
        merge_gap_seconds=0.5,
        max_window_seconds=10,
        min_window_seconds=0,
    )

    assert ranges == [(900, 3_100)]


def test_plan_vad_asr_ranges_clamps_to_audio_bounds() -> None:
    ranges = plan_vad_asr_ranges(
        [SpeechRegion(start_sample=50, end_sample=950)],
        total_samples=1_000,
        sample_rate=1_000,
        pad_seconds=0.2,
        merge_gap_seconds=0,
        max_window_seconds=10,
        min_window_seconds=0,
    )

    assert ranges == [(0, 1_000)]


def test_plan_vad_asr_ranges_splits_oversized_window() -> None:
    ranges = plan_vad_asr_ranges(
        [SpeechRegion(start_sample=0, end_sample=5_000)],
        total_samples=5_000,
        sample_rate=1_000,
        pad_seconds=0,
        merge_gap_seconds=0,
        max_window_seconds=2,
        min_window_seconds=0,
    )

    assert ranges == [(0, 2_000), (2_000, 4_000), (4_000, 5_000)]


def test_plan_vad_asr_ranges_merges_short_windows_into_neighbor() -> None:
    ranges = plan_vad_asr_ranges(
        [
            SpeechRegion(start_sample=0, end_sample=200),
            SpeechRegion(start_sample=500, end_sample=2_000),
        ],
        total_samples=3_000,
        sample_rate=1_000,
        pad_seconds=0,
        merge_gap_seconds=0,
        max_window_seconds=3,
        min_window_seconds=1,
    )

    assert ranges == [(0, 2_000)]


def test_plan_vad_asr_windows_returns_window_objects() -> None:
    windows = plan_vad_asr_windows(
        [SpeechRegion(start_sample=0, end_sample=1_000)],
        total_samples=2_000,
        sample_rate=1_000,
        pad_seconds=0,
        merge_gap_seconds=0,
        max_window_seconds=3,
        min_window_seconds=0,
    )

    assert windows == [
        OfflineAsrWindow(
            start_sample=0,
            end_sample=1_000,
        )
    ]


def test_plan_diarized_asr_ranges_clamps_to_audio_bounds() -> None:
    ranges = plan_diarized_asr_ranges(
        [DiarizedTurn(start_sample=-100, end_sample=1_500)],
        total_samples=1_000,
        sample_rate=1_000,
        merge_gap_seconds=0,
        max_window_seconds=10,
        min_window_seconds=0,
    )

    assert ranges == [(0, 1_000)]


def test_plan_diarized_asr_ranges_merges_close_turns() -> None:
    ranges = plan_diarized_asr_ranges(
        [
            DiarizedTurn(start_sample=1_000, end_sample=2_000),
            DiarizedTurn(start_sample=2_300, end_sample=3_000),
        ],
        total_samples=10_000,
        sample_rate=1_000,
        merge_gap_seconds=0.5,
        max_window_seconds=10,
        min_window_seconds=0,
    )

    assert ranges == [(1_000, 3_000)]


def test_plan_diarized_asr_ranges_splits_oversized_window() -> None:
    ranges = plan_diarized_asr_ranges(
        [DiarizedTurn(start_sample=0, end_sample=5_000)],
        total_samples=5_000,
        sample_rate=1_000,
        merge_gap_seconds=0,
        max_window_seconds=2,
        min_window_seconds=0,
    )

    assert ranges == [(0, 2_000), (2_000, 4_000), (4_000, 5_000)]


def test_plan_diarized_asr_ranges_merges_short_turns_into_neighbor() -> None:
    ranges = plan_diarized_asr_ranges(
        [
            DiarizedTurn(start_sample=0, end_sample=200),
            DiarizedTurn(start_sample=500, end_sample=2_000),
        ],
        total_samples=3_000,
        sample_rate=1_000,
        merge_gap_seconds=0,
        max_window_seconds=3,
        min_window_seconds=1,
    )

    assert ranges == [(0, 2_000)]


def test_plan_diarized_asr_ranges_returns_empty_for_empty_turns() -> None:
    assert (
        plan_diarized_asr_ranges(
            [],
            total_samples=3_000,
            sample_rate=1_000,
            merge_gap_seconds=0,
            max_window_seconds=3,
            min_window_seconds=1,
        )
        == []
    )


def test_plan_chunk_ranges_rejects_invalid_bounds() -> None:
    with pytest.raises(ValueError, match="min_chunk_seconds"):
        plan_chunk_ranges(
            total_samples=16_000,
            sample_rate=16_000,
            preferred_chunk_seconds=2,
            min_chunk_seconds=3,
            max_chunk_seconds=2,
        )
