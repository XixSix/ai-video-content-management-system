from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, cast

from app.core.config import get_settings
from app.runtime.container import _build_generate_chapters_pipeline_config
from app.schemas.generate_chapters import (
    GenerateChaptersTranscriptSegment,
    GenerateChaptersTranscriptWord,
)
from app.workflows.generate_chapters.pipeline import (
    GENERATE_CHAPTERS_STRATEGY_SEGMENT,
    GENERATE_CHAPTERS_STRATEGY_WORD,
)
from app.workflows.generate_chapters.schemas import (
    ChapterUnit,
    GenerateChaptersPipelineConfig,
)
from app.workflows.generate_chapters.segment_units import build_segment_chapter_units
from app.workflows.generate_chapters.word_units import (
    build_word_chapter_units,
    collect_timeline_words,
    has_sufficient_word_alignment_coverage,
)

WORD_RE = re.compile(r"[^\W_]+", re.UNICODE)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build generate_chapters timeline units from transcript JSON."
    )
    parser.add_argument("transcript_json", type=Path, nargs="+")
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Write one JSON file per transcript instead of printing to stdout.",
    )
    parser.add_argument(
        "--synthesize-ids",
        action="store_true",
        help="Create missing segment/word ids at the script boundary.",
    )
    args = parser.parse_args()

    config = _build_generate_chapters_pipeline_config(get_settings())

    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=True)

    outputs = [
        _build_unit_output(path, config=config, synthesize_ids=args.synthesize_ids)
        for path in args.transcript_json
    ]

    if args.output_dir:
        for path, output in zip(args.transcript_json, outputs, strict=True):
            output_path = args.output_dir / f"{path.stem}_units.json"
            output_path.write_text(
                json.dumps(output, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            print(f"wrote {output_path}")
        return

    payload: dict[str, Any] | list[dict[str, Any]]
    payload = outputs[0] if len(outputs) == 1 else outputs
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def _build_unit_output(
    transcript_json: Path,
    *,
    config: GenerateChaptersPipelineConfig,
    synthesize_ids: bool,
) -> dict[str, Any]:
    """Load transcript JSON, build units with env config, and return JSON output.

    The script mirrors the pre-shared-flow strategy decision: segment strategy
    always builds segment units; word strategy builds word units only when usable
    word coverage is sufficient, otherwise it falls back to segment units.

    Notes:
        This script only calls the unit builders. It does not run repair, gap
        scoring, valley detection, candidate retention, or LLM review.
    """
    payload = json.loads(transcript_json.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit("Transcript JSON must contain an object payload.")

    segments = _load_segments(payload, synthesize_ids=synthesize_ids)
    units, resolved_strategy, fallback_reason = _build_units(segments, config=config)

    return {
        "sourcePath": str(transcript_json),
        "videoId": _video_id(payload, fallback=transcript_json.stem),
        "split": _text_value(payload, "split") or None,
        "language": _text_value(payload, "language") or None,
        "mediaDurationSeconds": _media_duration(payload, segments),
        "requestedStrategy": config.strategy,
        "resolvedStrategy": resolved_strategy,
        "fallbackReason": fallback_reason,
        "config": _unit_config_output(config),
        "input": _input_summary(segments, config=config),
        "units": [_unit_output(unit) for unit in units],
    }


def _build_units(
    segments: list[GenerateChaptersTranscriptSegment],
    *,
    config: GenerateChaptersPipelineConfig,
) -> tuple[list[ChapterUnit], str, str | None]:
    """Build units using the configured strategy and word fallback rule."""
    if config.strategy == GENERATE_CHAPTERS_STRATEGY_WORD:
        timeline_words = collect_timeline_words(segments)
        if has_sufficient_word_alignment_coverage(segments, timeline_words):
            return (
                build_word_chapter_units(
                    timeline_words,
                    max_unit_duration=config.max_unit_duration_seconds,
                    pause_boundary_seconds=config.pause_boundary_seconds,
                    target_unit_duration=config.target_unit_duration_seconds,
                    target_unit_words=config.target_unit_words,
                    max_unit_words=config.max_unit_words,
                    max_unit_chars=config.max_unit_chars,
                ),
                GENERATE_CHAPTERS_STRATEGY_WORD,
                None,
            )

        return (
            _build_segment_units(segments, config=config),
            GENERATE_CHAPTERS_STRATEGY_SEGMENT,
            "insufficient_word_alignment_coverage",
        )

    return (
        _build_segment_units(segments, config=config),
        GENERATE_CHAPTERS_STRATEGY_SEGMENT,
        None,
    )


def _build_segment_units(
    segments: list[GenerateChaptersTranscriptSegment],
    *,
    config: GenerateChaptersPipelineConfig,
) -> list[ChapterUnit]:
    """Build units from segment timestamps."""
    return build_segment_chapter_units(
        segments,
        max_unit_duration=config.max_unit_duration_seconds,
        pause_boundary_seconds=config.pause_boundary_seconds,
        target_unit_duration=config.target_unit_duration_seconds,
        target_unit_words=config.target_unit_words,
        max_unit_words=config.max_unit_words,
        max_unit_chars=config.max_unit_chars,
        punctuation_poor_threshold=config.punctuation_poor_threshold,
    )


def _unit_config_output(config: GenerateChaptersPipelineConfig) -> dict[str, Any]:
    return {
        "targetUnitDurationSeconds": config.target_unit_duration_seconds,
        "maxUnitDurationSeconds": config.max_unit_duration_seconds,
        "targetUnitWords": config.target_unit_words,
        "maxUnitWords": config.max_unit_words,
        "maxUnitChars": config.max_unit_chars,
        "pauseBoundarySeconds": config.pause_boundary_seconds,
        "punctuationPoorThreshold": config.punctuation_poor_threshold,
        "contextWindowSeconds": config.context_window_seconds,
        "candidateScoreContextSeconds": config.scoring.context_seconds,
        "candidateMinContextTextChars": config.scoring.min_context_text_chars,
    }


def _input_summary(
    segments: list[GenerateChaptersTranscriptSegment],
    *,
    config: GenerateChaptersPipelineConfig,
) -> dict[str, Any]:
    raw_word_count = sum(len(segment.words) for segment in segments)
    usable_word_count = len(collect_timeline_words(segments))
    text_word_count = sum(len(WORD_RE.findall(segment.text)) for segment in segments)
    segment_durations = [
        segment.end_seconds - segment.start_seconds for segment in segments
    ]

    return {
        "segments": len(segments),
        "rawWords": raw_word_count,
        "usableWords": usable_word_count,
        "unusableWords": raw_word_count - usable_word_count,
        "wordCoverage": round(usable_word_count / text_word_count, 4)
        if text_word_count
        else 0.0,
        "sourceSegmentDurationAvg": round(_avg(segment_durations), 3),
        "sourceSegmentDurationP95": round(_percentile(segment_durations, 95), 3),
        "sourceSegmentDurationMax": round(max(segment_durations), 3)
        if segment_durations
        else 0.0,
        "overlongSourceSegmentCount": sum(
            1
            for duration in segment_durations
            if duration > config.max_unit_duration_seconds
        ),
    }


def _unit_output(unit: ChapterUnit) -> dict[str, Any]:
    return {
        "unitId": unit.unit_id,
        "startTime": unit.start_time,
        "endTime": unit.end_time,
        "durationSeconds": round(unit.end_time - unit.start_time, 3),
        "text": unit.text,
        "cleanText": unit.clean_text,
        "segmentIds": unit.segment_ids,
    }


def _load_segments(
    payload: dict[str, Any],
    *,
    synthesize_ids: bool,
) -> list[GenerateChaptersTranscriptSegment]:
    """Map common transcript JSON shapes into generate_chapters segment DTOs."""
    raw_segments = payload.get("segments")
    if raw_segments is None:
        transcript = payload.get("transcript")
        raw_segments = (
            transcript.get("segments") if isinstance(transcript, dict) else None
        )

    if not isinstance(raw_segments, list):
        raise SystemExit("Transcript JSON must contain a segments list.")

    return [
        _load_segment(
            cast(dict[str, Any], raw_segment),
            index,
            synthesize_ids=synthesize_ids,
        )
        for index, raw_segment in enumerate(raw_segments, start=1)
        if isinstance(raw_segment, dict)
    ]


def _load_segment(
    raw_segment: dict[str, Any],
    index: int,
    *,
    synthesize_ids: bool,
) -> GenerateChaptersTranscriptSegment:
    segment_id = _text_value(raw_segment, "segment_id", "segmentId", "id")
    if not segment_id and synthesize_ids:
        segment_id = f"seg-{index}"

    words = [
        _load_word(
            cast(dict[str, Any], raw_word),
            segment_id,
            word_index,
            synthesize_ids=synthesize_ids,
        )
        for word_index, raw_word in enumerate(raw_segment.get("words") or [], start=1)
        if isinstance(raw_word, dict)
    ]
    return GenerateChaptersTranscriptSegment(
        segment_id=segment_id,
        start_seconds=_float_value(
            raw_segment, "start_seconds", "startSeconds", "start"
        ),
        end_seconds=_float_value(raw_segment, "end_seconds", "endSeconds", "end"),
        text=_text_value(raw_segment, "text"),
        clean_text=_nullable_text_value(raw_segment, "clean_text", "cleanText"),
        speaker_label=_nullable_text_value(
            raw_segment, "speaker_label", "speakerLabel"
        ),
        confidence=_nullable_float_value(raw_segment, "confidence"),
        words=words,
    )


def _load_word(
    raw_word: dict[str, Any],
    segment_id: str,
    index: int,
    *,
    synthesize_ids: bool,
) -> GenerateChaptersTranscriptWord:
    word_id = _text_value(raw_word, "word_id", "wordId", "id")
    word_segment_id = _text_value(raw_word, "segment_id", "segmentId") or segment_id

    if synthesize_ids:
        word_segment_id = word_segment_id or segment_id
        word_id = word_id or f"{word_segment_id}_word_{index}"

    return GenerateChaptersTranscriptWord(
        word_id=word_id,
        segment_id=word_segment_id,
        start_seconds=_float_value(raw_word, "start_seconds", "startSeconds", "start"),
        end_seconds=_float_value(raw_word, "end_seconds", "endSeconds", "end"),
        text=_text_value(raw_word, "text", "word"),
        confidence=_nullable_float_value(raw_word, "confidence"),
    )


def _video_id(payload: dict[str, Any], *, fallback: str) -> str:
    return _text_value(payload, "video_id", "videoId") or fallback


def _media_duration(
    payload: dict[str, Any],
    segments: list[GenerateChaptersTranscriptSegment],
) -> float:
    duration = _float_value(
        payload,
        "duration",
        "duration_seconds",
        "durationSeconds",
        "media_duration_seconds",
        "mediaDurationSeconds",
    )
    if duration > 0:
        return duration

    return max((segment.end_seconds for segment in segments), default=0.0)


def _text_value(payload: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = payload.get(key)
        if value is not None:
            return str(value).strip()
    return ""


def _nullable_text_value(payload: dict[str, Any], *keys: str) -> str | None:
    text = _text_value(payload, *keys)
    return text or None


def _float_value(payload: dict[str, Any], *keys: str) -> float:
    for key in keys:
        value = payload.get(key)
        if value is not None:
            return float(value)
    return 0.0


def _nullable_float_value(payload: dict[str, Any], *keys: str) -> float | None:
    for key in keys:
        value = payload.get(key)
        if value is not None:
            return float(value)
    return None


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0

    sorted_values = sorted(values)
    position = (len(sorted_values) - 1) * percentile / 100
    lower = int(position)
    upper = min(lower + 1, len(sorted_values) - 1)
    if lower == upper:
        return sorted_values[lower]

    ratio = position - lower
    return sorted_values[lower] * (1 - ratio) + sorted_values[upper] * ratio


def _avg(values: list[float]) -> float:
    if not values:
        return 0.0

    return sum(values) / len(values)


if __name__ == "__main__":
    main()
