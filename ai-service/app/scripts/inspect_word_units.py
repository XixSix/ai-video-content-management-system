from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from app.schemas.chaptering import ChapteringTranscriptSegment, ChapteringTranscriptWord
from app.workflows.chaptering.word_units import (
    build_word_chapter_units,
    has_usable_word_timestamps,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect word timeline units.")
    parser.add_argument("transcript_json", type=Path, nargs="+")
    parser.add_argument("--target-duration", type=float, default=12.0)
    parser.add_argument("--max-duration", type=float, default=20.0)
    parser.add_argument("--target-words", type=int, default=40)
    parser.add_argument("--max-words", type=int, default=80)
    parser.add_argument("--max-chars", type=int, default=1200)
    parser.add_argument("--pause", type=float, default=1.0)
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Write one inspect result file per transcript instead of printing.",
    )
    parser.add_argument(
        "--synthesize-ids",
        action="store_true",
        help="Create missing segment/word ids at the debug script boundary.",
    )
    args = parser.parse_args()

    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=True)

    for transcript_json in args.transcript_json:
        output = _inspect_transcript(transcript_json, args)
        if args.output_dir:
            output_path = args.output_dir / f"{transcript_json.stem}_word_units.txt"
            output_path.write_text(output, encoding="utf-8")
            print(f"wrote {output_path}")
        else:
            print(output, end="")


def _inspect_transcript(transcript_json: Path, args: argparse.Namespace) -> str:
    payload = json.loads(transcript_json.read_text(encoding="utf-8"))
    segments = _load_segments(payload, synthesize_ids=args.synthesize_ids)
    units = build_word_chapter_units(
        segments,
        max_unit_duration=args.max_duration,
        pause_boundary_seconds=args.pause,
        target_unit_duration=args.target_duration,
        target_unit_words=args.target_words,
        max_unit_words=args.max_words,
        max_unit_chars=args.max_chars,
    )

    input_word_count = sum(len(segment.words) for segment in segments)
    lines = [
        f"source: {transcript_json}",
        f"video_id: {payload.get('video_id', '')}",
        f"language: {payload.get('language', '')}",
        f"media_duration: {payload.get('duration', '')}",
        "strategy: word",
        "config:",
        f"  target_duration: {args.target_duration}",
        f"  max_duration: {args.max_duration}",
        f"  target_words: {args.target_words}",
        f"  max_words: {args.max_words}",
        f"  max_chars: {args.max_chars}",
        f"  pause: {args.pause}",
        f"  synthesize_ids: {args.synthesize_ids}",
        "summary:",
        f"  segments: {len(segments)}",
        f"  words: {input_word_count}",
        f"  usable_word_timestamps: {has_usable_word_timestamps(segments)}",
        f"  units: {len(units)}",
        *_duration_summary_lines(units),
        "",
    ]

    for unit in units:
        duration = unit.end_time - unit.start_time
        lines.append(
            f"{unit.unit_id} "
            f"{unit.start_time:.2f}-{unit.end_time:.2f}s "
            f"({duration:.2f}s, segments={','.join(unit.segment_ids)})"
        )
        lines.append(f"  {unit.text}")
        lines.append("")

    return "\n".join(lines)


def _duration_summary_lines(units: list) -> list[str]:
    if not units:
        return [
            "  unit_duration_min: 0.00",
            "  unit_duration_avg: 0.00",
            "  unit_duration_max: 0.00",
        ]

    durations = [unit.end_time - unit.start_time for unit in units]
    return [
        f"  unit_duration_min: {min(durations):.2f}",
        f"  unit_duration_avg: {sum(durations) / len(durations):.2f}",
        f"  unit_duration_max: {max(durations):.2f}",
    ]


def _load_segments(
    payload: dict[str, Any],
    *,
    synthesize_ids: bool,
) -> list[ChapteringTranscriptSegment]:
    """Map common transcript JSON shapes into chaptering segment DTOs."""
    raw_segments = payload.get("segments")
    if raw_segments is None:
        raw_segments = payload.get("transcript", {}).get("segments")

    if not isinstance(raw_segments, list):
        raise SystemExit("Transcript JSON must contain a segments list.")

    return [
        _load_segment(raw_segment, index, synthesize_ids=synthesize_ids)
        for index, raw_segment in enumerate(raw_segments, start=1)
    ]


def _load_segment(
    raw_segment: dict[str, Any],
    index: int,
    *,
    synthesize_ids: bool,
) -> ChapteringTranscriptSegment:
    segment_id = _text_value(raw_segment, "segment_id", "id")
    if not segment_id and synthesize_ids:
        segment_id = f"seg-{index}"

    words = [
        _load_word(raw_word, segment_id, word_index, synthesize_ids=synthesize_ids)
        for word_index, raw_word in enumerate(raw_segment.get("words") or [], start=1)
    ]
    return ChapteringTranscriptSegment(
        segment_id=segment_id,
        start_seconds=_float_value(raw_segment, "start_seconds", "start"),
        end_seconds=_float_value(raw_segment, "end_seconds", "end"),
        text=_text_value(raw_segment, "text"),
        words=words,
    )


def _load_word(
    raw_word: dict[str, Any],
    segment_id: str,
    index: int,
    *,
    synthesize_ids: bool,
) -> ChapteringTranscriptWord:
    word_id = _text_value(raw_word, "word_id", "id")
    word_segment_id = _text_value(raw_word, "segment_id") or segment_id

    if synthesize_ids:
        word_id = word_id or f"{word_segment_id}_word_{index}"
        word_segment_id = word_segment_id or segment_id

    return ChapteringTranscriptWord(
        word_id=word_id,
        segment_id=word_segment_id,
        start_seconds=_float_value(raw_word, "start_seconds", "start"),
        end_seconds=_float_value(raw_word, "end_seconds", "end"),
        text=_text_value(raw_word, "text", "word"),
    )


def _text_value(payload: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = payload.get(key)
        if value is not None:
            return str(value).strip()
    return ""


def _float_value(payload: dict[str, Any], *keys: str) -> float:
    for key in keys:
        value = payload.get(key)
        if value is not None:
            return float(value)
    return 0.0


if __name__ == "__main__":
    main()
