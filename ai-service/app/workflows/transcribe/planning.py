from __future__ import annotations

from dataclasses import dataclass

from app.provider_contracts.diarization import DiarizedTurn
from app.provider_contracts.vad import SpeechRegion

OFFLINE_ASR_PAD_SECONDS = 0.25
OFFLINE_ASR_MERGE_GAP_SECONDS = 0.6
OFFLINE_ASR_MAX_WINDOW_SECONDS = 30.0
OFFLINE_ASR_MIN_WINDOW_SECONDS = 1.2


@dataclass(frozen=True, slots=True)
class OfflineAsrWindow:
    start_sample: int
    end_sample: int

    @property
    def duration_samples(self) -> int:
        return max(0, self.end_sample - self.start_sample)


def plan_chunk_ranges(
    *,
    total_samples: int,
    sample_rate: int,
    preferred_chunk_seconds: float,
    min_chunk_seconds: float,
    max_chunk_seconds: float,
) -> list[tuple[int, int]]:
    """Plan fixed chunk boundaries that honor the configured duration limits."""
    if total_samples <= 0:
        raise ValueError("total_samples must be greater than 0")
    if sample_rate <= 0:
        raise ValueError("sample_rate must be greater than 0")
    if min_chunk_seconds <= 0 or max_chunk_seconds <= 0:
        raise ValueError("chunk duration bounds must be greater than 0")
    if min_chunk_seconds > max_chunk_seconds:
        raise ValueError(
            "min_chunk_seconds must be less than or equal to max_chunk_seconds"
        )
    if not min_chunk_seconds <= preferred_chunk_seconds <= max_chunk_seconds:
        raise ValueError(
            "preferred_chunk_seconds must be within the configured min/max range"
        )

    min_samples = max(1, int(round(min_chunk_seconds * sample_rate)))
    max_samples = max(1, int(round(max_chunk_seconds * sample_rate)))
    preferred_samples = max(1, int(round(preferred_chunk_seconds * sample_rate)))

    if total_samples < min_samples:
        raise ValueError(
            f"audio duration must be at least {min_chunk_seconds:.1f}s; "
            f"got {total_samples / sample_rate:.2f}s"
        )

    ranges: list[tuple[int, int]] = []
    start = 0
    while start < total_samples:
        remaining = total_samples - start
        if remaining <= max_samples:
            if remaining < min_samples:
                raise ValueError(
                    "unable to plan valid chunks for the audio duration "
                    "with the current settings"
                )
            ranges.append((start, total_samples))
            break

        end = min(total_samples, start + preferred_samples)
        tail = total_samples - end
        if 0 < tail < min_samples:
            adjusted_end = total_samples - min_samples
            adjusted_size = adjusted_end - start
            if min_samples <= adjusted_size <= max_samples:
                end = adjusted_end
            else:
                merged_end = min(total_samples, start + max_samples)
                merged_tail = total_samples - merged_end
                if merged_tail == 0 or merged_tail >= min_samples:
                    end = merged_end
                else:
                    raise ValueError(
                        "unable to plan valid chunks for the audio duration "
                        "with the current settings"
                    )

        chunk_size = end - start
        if not min_samples <= chunk_size <= max_samples:
            raise ValueError(
                "unable to plan valid chunks for the audio duration "
                "with the current settings"
            )
        ranges.append((start, end))
        start = end

    return ranges


def plan_vad_asr_ranges(
    regions: list[SpeechRegion],
    *,
    total_samples: int,
    sample_rate: int,
    pad_seconds: float = OFFLINE_ASR_PAD_SECONDS,
    merge_gap_seconds: float = OFFLINE_ASR_MERGE_GAP_SECONDS,
    max_window_seconds: float = OFFLINE_ASR_MAX_WINDOW_SECONDS,
    min_window_seconds: float = OFFLINE_ASR_MIN_WINDOW_SECONDS,
) -> list[tuple[int, int]]:
    """Turn VAD speech regions into merged ASR sample ranges."""
    windows = _speech_regions_to_windows(
        regions,
        total_samples=total_samples,
        sample_rate=sample_rate,
        pad_seconds=pad_seconds,
    )
    merged = _merge_offline_windows(
        windows,
        sample_rate=sample_rate,
        merge_gap_seconds=merge_gap_seconds,
        max_window_seconds=max_window_seconds,
        min_window_seconds=min_window_seconds,
    )
    return [(window.start_sample, window.end_sample) for window in merged]


def plan_vad_asr_windows(
    regions: list[SpeechRegion],
    *,
    total_samples: int,
    sample_rate: int,
    pad_seconds: float = OFFLINE_ASR_PAD_SECONDS,
    merge_gap_seconds: float = OFFLINE_ASR_MERGE_GAP_SECONDS,
    max_window_seconds: float = OFFLINE_ASR_MAX_WINDOW_SECONDS,
    min_window_seconds: float = OFFLINE_ASR_MIN_WINDOW_SECONDS,
) -> list[OfflineAsrWindow]:
    """Build ASR windows from VAD speech regions."""
    return [
        OfflineAsrWindow(
            start_sample=start,
            end_sample=end,
        )
        for start, end in plan_vad_asr_ranges(
            regions,
            total_samples=total_samples,
            sample_rate=sample_rate,
            pad_seconds=pad_seconds,
            merge_gap_seconds=merge_gap_seconds,
            max_window_seconds=max_window_seconds,
            min_window_seconds=min_window_seconds,
        )
    ]


def plan_diarized_asr_ranges(
    turns: list[DiarizedTurn],
    *,
    total_samples: int,
    sample_rate: int,
    merge_gap_seconds: float = OFFLINE_ASR_MERGE_GAP_SECONDS,
    max_window_seconds: float = OFFLINE_ASR_MAX_WINDOW_SECONDS,
    min_window_seconds: float = OFFLINE_ASR_MIN_WINDOW_SECONDS,
) -> list[tuple[int, int]]:
    """Turn diarized speaker turns into merged ASR sample ranges."""
    windows = _diarized_turns_to_windows(
        turns,
        total_samples=total_samples,
    )
    merged = _merge_offline_windows(
        windows,
        sample_rate=sample_rate,
        merge_gap_seconds=merge_gap_seconds,
        max_window_seconds=max_window_seconds,
        min_window_seconds=min_window_seconds,
    )
    return [(window.start_sample, window.end_sample) for window in merged]


def plan_diarized_asr_windows(
    turns: list[DiarizedTurn],
    *,
    total_samples: int,
    sample_rate: int,
    merge_gap_seconds: float = OFFLINE_ASR_MERGE_GAP_SECONDS,
    max_window_seconds: float = OFFLINE_ASR_MAX_WINDOW_SECONDS,
    min_window_seconds: float = OFFLINE_ASR_MIN_WINDOW_SECONDS,
) -> list[OfflineAsrWindow]:
    """Build ASR windows from diarized speaker turns."""
    return [
        OfflineAsrWindow(start_sample=start, end_sample=end)
        for start, end in plan_diarized_asr_ranges(
            turns,
            total_samples=total_samples,
            sample_rate=sample_rate,
            merge_gap_seconds=merge_gap_seconds,
            max_window_seconds=max_window_seconds,
            min_window_seconds=min_window_seconds,
        )
    ]


def _diarized_turns_to_windows(
    turns: list[DiarizedTurn],
    *,
    total_samples: int,
) -> list[OfflineAsrWindow]:
    return [
        OfflineAsrWindow(
            start_sample=max(0, int(turn.start_sample)),
            end_sample=min(total_samples, int(turn.end_sample)),
        )
        for turn in turns
        if turn.end_sample > turn.start_sample
    ]


def _speech_regions_to_windows(
    regions: list[SpeechRegion],
    *,
    total_samples: int,
    sample_rate: int,
    pad_seconds: float,
) -> list[OfflineAsrWindow]:
    pad_samples = int(max(0.0, pad_seconds) * sample_rate)
    return [
        OfflineAsrWindow(
            start_sample=max(0, int(region.start_sample) - pad_samples),
            end_sample=min(total_samples, int(region.end_sample) + pad_samples),
        )
        for region in regions
        if region.end_sample > region.start_sample
    ]


def _merge_offline_windows(
    windows: list[OfflineAsrWindow],
    *,
    sample_rate: int,
    merge_gap_seconds: float,
    max_window_seconds: float,
    min_window_seconds: float,
) -> list[OfflineAsrWindow]:
    """Merge close ASR windows, then split any oversized merged windows."""
    if not windows:
        return []

    merge_gap_samples = int(max(0.0, merge_gap_seconds) * sample_rate)
    max_window_samples = max(1, int(max_window_seconds * sample_rate))
    merged: list[OfflineAsrWindow] = []
    for window in sorted(
        windows, key=lambda item: (item.start_sample, item.end_sample)
    ):
        if not merged:
            merged.append(window)
            continue

        previous = merged[-1]
        merged_end = max(previous.end_sample, window.end_sample)
        can_merge = (
            window.start_sample <= previous.end_sample + merge_gap_samples
            and merged_end - previous.start_sample <= max_window_samples
        )
        if can_merge:
            merged[-1] = OfflineAsrWindow(
                start_sample=previous.start_sample,
                end_sample=merged_end,
            )
        else:
            merged.append(window)

    planned = _merge_short_offline_windows(
        merged,
        sample_rate=sample_rate,
        min_window_seconds=min_window_seconds,
        max_window_seconds=max_window_seconds,
    )

    split: list[OfflineAsrWindow] = []
    for window in planned:
        cursor = window.start_sample
        while cursor < window.end_sample:
            end = min(window.end_sample, cursor + max_window_samples)
            split.append(
                OfflineAsrWindow(
                    start_sample=cursor,
                    end_sample=end,
                )
            )
            cursor = end
    return split


def _merge_short_offline_windows(
    windows: list[OfflineAsrWindow],
    *,
    sample_rate: int,
    min_window_seconds: float,
    max_window_seconds: float,
) -> list[OfflineAsrWindow]:
    """Merge too-short ASR windows into a suitable neighbor."""
    if not windows or min_window_seconds <= 0.0:
        return windows

    min_window_samples = int(min_window_seconds * sample_rate)
    max_window_samples = int(max_window_seconds * sample_rate)
    planned = list(
        sorted(windows, key=lambda item: (item.start_sample, item.end_sample))
    )
    index = 0
    while index < len(planned):
        window = planned[index]
        if window.duration_samples >= min_window_samples:
            index += 1
            continue

        candidate_index = _find_short_window_merge_candidate(
            planned,
            index=index,
            max_window_samples=max_window_samples,
        )
        if candidate_index is None:
            index += 1
            continue

        target = planned[candidate_index]
        merged = OfflineAsrWindow(
            start_sample=min(window.start_sample, target.start_sample),
            end_sample=max(window.end_sample, target.end_sample),
        )
        for remove_index in sorted((index, candidate_index), reverse=True):
            del planned[remove_index]
        planned.append(merged)
        planned.sort(key=lambda item: (item.start_sample, item.end_sample))
        index = 0

    return planned


def _find_short_window_merge_candidate(
    windows: list[OfflineAsrWindow],
    *,
    index: int,
    max_window_samples: int,
) -> int | None:
    window = windows[index]
    candidates: list[tuple[int, int]] = []
    for candidate_index, candidate in enumerate(windows):
        if candidate_index == index:
            continue
        merged_duration = max(window.end_sample, candidate.end_sample) - min(
            window.start_sample,
            candidate.start_sample,
        )
        if merged_duration > max_window_samples:
            continue
        distance = min(
            abs(candidate.start_sample - window.end_sample),
            abs(window.start_sample - candidate.end_sample),
        )
        candidates.append((distance, candidate_index))

    if not candidates:
        return None
    return min(candidates, key=lambda item: (item[0], item[1]))[1]
