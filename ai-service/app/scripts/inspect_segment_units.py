from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from app.schemas.chaptering import ChapteringTranscriptSegment
from app.workflows.chaptering.segment_units import build_segment_chapter_units


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect segment timeline units.")
    parser.add_argument("transcript_json", type=Path)
    parser.add_argument("--target-duration", type=float, default=30.0)
    parser.add_argument("--max-duration", type=float, default=60.0)
    parser.add_argument("--target-words", type=int, default=80)
    parser.add_argument("--max-words", type=int, default=160)
    parser.add_argument("--max-chars", type=int, default=1200)
    parser.add_argument("--pause", type=float, default=2.0)
    parser.add_argument("--punctuation-poor-threshold", type=float, default=0.15)
    parser.add_argument(
        "--synthesize-ids",
        action="store_true",
        help="Create missing segment ids at the debug script boundary.",
    )
    args = parser.parse_args()

    payload = json.loads(args.transcript_json.read_text(encoding="utf-8"))
    segments = _load_segments(payload, synthesize_ids=args.synthesize_ids)
    units = build_segment_chapter_units(
        segments,
        max_unit_duration=args.max_duration,
        pause_boundary_seconds=args.pause,
        target_unit_duration=args.target_duration,
        target_unit_words=args.target_words,
        max_unit_words=args.max_words,
        max_unit_chars=args.max_chars,
        punctuation_poor_threshold=args.punctuation_poor_threshold,
    )

    print(f"segments: {len(segments)}")
    print(f"units: {len(units)}")
    print()

    for unit in units:
        duration = unit.end_time - unit.start_time
        print(
            f"{unit.unit_id} "
            f"{unit.start_time:.2f}-{unit.end_time:.2f}s "
            f"({duration:.2f}s, segments={','.join(unit.segment_ids)})"
        )
        print(f"  {unit.text}")
        print()


def _load_segments(
    payload: dict[str, Any],
    *,
    synthesize_ids: bool,
) -> list[ChapteringTranscriptSegment]:
    """Map common transcript JSON shapes into chaptering segment DTOs."""
    raw_segments = payload.get("segments") or payload.get("transcript", {}).get(
        "segments"
    )
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

    return ChapteringTranscriptSegment(
        segment_id=segment_id,
        start_seconds=_float_value(raw_segment, "start_seconds", "start"),
        end_seconds=_float_value(raw_segment, "end_seconds", "end"),
        text=_text_value(raw_segment, "text"),
        clean_text=_nullable_text_value(raw_segment, "clean_text"),
    )


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


if __name__ == "__main__":
    main()
