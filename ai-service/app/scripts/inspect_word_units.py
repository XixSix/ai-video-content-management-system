from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.schemas.chaptering import ChapteringTranscriptSegment, ChapteringTranscriptWord
from app.workflows.chaptering.schemas import ChapterUnit, UnitRepairConfig
from app.workflows.chaptering.unit_repair import repair_micro_units
from app.workflows.chaptering.word_units import (
    build_word_chapter_units,
    collect_timeline_words,
)

WORD_RE = re.compile(r"[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?")  # Debug ASCII words.
TERMINAL_PUNCTUATION = (".", "!", "?")


@dataclass(frozen=True)
class UnitInspectRow:
    unit: ChapterUnit
    duration: float
    word_count: int
    char_count: int
    pause_before: float | None
    pause_after: float | None
    flags: list[str]


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect word timeline units.")
    parser.add_argument("transcript_json", type=Path, nargs="+")
    parser.add_argument("--target-duration", type=float, default=12.0)
    parser.add_argument("--max-duration", type=float, default=20.0)
    parser.add_argument("--target-words", type=int, default=40)
    parser.add_argument("--max-words", type=int, default=80)
    parser.add_argument("--max-chars", type=int, default=1200)
    parser.add_argument("--pause", type=float, default=1.0)
    parser.add_argument("--short-duration", type=float, default=3.0)
    parser.add_argument("--short-words", type=int, default=6)
    parser.add_argument("--long-gap", type=float, default=5.0)
    parser.add_argument("--issue-context", type=int, default=2)
    parser.add_argument("--max-issue-contexts", type=int, default=12)
    parser.add_argument(
        "--repair",
        action="store_true",
        help="Inspect units after the shared post-build micro-unit repair pass.",
    )
    parser.add_argument("--repair-short-duration", type=float, default=4.0)
    parser.add_argument("--repair-min-words", type=int, default=8)
    parser.add_argument("--repair-fragment-max-words", type=int, default=2)
    parser.add_argument("--repair-sparse-duration", type=float, default=6.0)
    parser.add_argument("--repair-continuation-gap", type=float, default=0.05)
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
    timeline_words = collect_timeline_words(segments)
    units = build_word_chapter_units(
        timeline_words,
        max_unit_duration=args.max_duration,
        pause_boundary_seconds=args.pause,
        target_unit_duration=args.target_duration,
        target_unit_words=args.target_words,
        max_unit_words=args.max_words,
        max_unit_chars=args.max_chars,
    )
    if args.repair:
        units = repair_micro_units(
            units,
            pause_boundary_seconds=args.pause,
            config=UnitRepairConfig(
                short_duration_seconds=args.repair_short_duration,
                min_words=args.repair_min_words,
                fragment_max_words=args.repair_fragment_max_words,
                sparse_duration_seconds=args.repair_sparse_duration,
                continuation_gap_seconds=args.repair_continuation_gap,
            ),
        )

    rows = _inspect_units(
        units,
        short_duration=args.short_duration,
        short_words=args.short_words,
        long_gap=args.long_gap,
    )

    input_word_count = sum(len(segment.words) for segment in segments)
    lines = [
        "# Word Unit Inspect",
        "",
        f"- source: `{transcript_json}`",
        f"- video_id: `{payload.get('video_id', '')}`",
        f"- language: `{payload.get('language', '')}`",
        f"- media_duration: `{payload.get('duration', '')}`",
        "- strategy: `word`",
        "",
        "## Config",
        "",
        f"- target_duration: `{args.target_duration}`",
        f"- max_duration: `{args.max_duration}`",
        f"- target_words: `{args.target_words}`",
        f"- max_words: `{args.max_words}`",
        f"- max_chars: `{args.max_chars}`",
        f"- pause: `{args.pause}`",
        f"- short_duration: `{args.short_duration}`",
        f"- short_words: `{args.short_words}`",
        f"- long_gap: `{args.long_gap}`",
        f"- synthesize_ids: `{args.synthesize_ids}`",
        f"- repair: `{args.repair}`",
        f"- repair_short_duration: `{args.repair_short_duration}`",
        f"- repair_min_words: `{args.repair_min_words}`",
        f"- repair_fragment_max_words: `{args.repair_fragment_max_words}`",
        f"- repair_sparse_duration: `{args.repair_sparse_duration}`",
        "",
        "## Summary",
        "",
        f"- segments: `{len(segments)}`",
        f"- words: `{input_word_count}`",
        f"- usable_word_timestamps: `{bool(timeline_words)}`",
        f"- units: `{len(units)}`",
        *_summary_lines(rows),
        *_bucket_lines(rows),
        *_flag_summary_lines(rows),
        *_issue_context_lines(
            rows,
            context=args.issue_context,
            max_contexts=args.max_issue_contexts,
        ),
        "## All Units",
        "",
        _unit_table(rows),
        "",
    ]

    return "\n".join(lines)


def _inspect_units(
    units: list[ChapterUnit],
    *,
    short_duration: float,
    short_words: int,
    long_gap: float,
) -> list[UnitInspectRow]:
    rows: list[UnitInspectRow] = []
    for index, unit in enumerate(units):
        duration = unit.end_time - unit.start_time
        word_count = len(WORD_RE.findall(unit.text))  # Debug word-like count.
        pause_before = (
            unit.start_time - units[index - 1].end_time if index > 0 else None
        )
        pause_after = (
            units[index + 1].start_time - unit.end_time
            if index < len(units) - 1
            else None
        )
        flags = _unit_flags(
            unit,
            duration=duration,
            word_count=word_count,
            pause_before=pause_before,
            pause_after=pause_after,
            short_duration=short_duration,
            short_words=short_words,
            long_gap=long_gap,
        )
        rows.append(
            UnitInspectRow(
                unit=unit,
                duration=duration,
                word_count=word_count,
                char_count=len(unit.text),
                pause_before=pause_before,
                pause_after=pause_after,
                flags=flags,
            )
        )

    return rows


def _unit_flags(
    unit: ChapterUnit,
    *,
    duration: float,
    word_count: int,
    pause_before: float | None,
    pause_after: float | None,
    short_duration: float,
    short_words: int,
    long_gap: float,
) -> list[str]:
    flags: list[str] = []
    if duration < short_duration:
        flags.append("short_duration")

    if word_count < short_words:
        flags.append("short_words")

    if pause_before is not None and pause_before >= long_gap:
        flags.append("long_gap_before")

    if pause_after is not None and pause_after >= long_gap:
        flags.append("long_gap_after")

    if unit.text and not unit.text.rstrip().endswith(TERMINAL_PUNCTUATION):
        flags.append("no_terminal_punctuation")

    return flags


def _summary_lines(rows: list[UnitInspectRow]) -> list[str]:
    if not rows:
        return [
            "- unit_duration_min: `0.00`",
            "- unit_duration_avg: `0.00`",
            "- unit_duration_max: `0.00`",
            "- unit_words_min: `0`",
            "- unit_words_avg: `0.00`",
            "- unit_words_max: `0`",
            "",
        ]

    durations = [row.duration for row in rows]
    word_counts = [row.word_count for row in rows]
    return [
        f"- unit_duration_min: `{min(durations):.2f}`",
        f"- unit_duration_avg: `{sum(durations) / len(durations):.2f}`",
        f"- unit_duration_max: `{max(durations):.2f}`",
        f"- unit_words_min: `{min(word_counts)}`",
        f"- unit_words_avg: `{sum(word_counts) / len(word_counts):.2f}`",
        f"- unit_words_max: `{max(word_counts)}`",
        "",
    ]


def _bucket_lines(rows: list[UnitInspectRow]) -> list[str]:
    buckets = [
        ("<1s", lambda row: row.duration < 1),
        ("1-3s", lambda row: 1 <= row.duration < 3),
        ("3-6s", lambda row: 3 <= row.duration < 6),
        ("6-12s", lambda row: 6 <= row.duration < 12),
        ("12-20s", lambda row: 12 <= row.duration <= 20),
        (">20s", lambda row: row.duration > 20),
    ]
    lines = ["## Duration Buckets", ""]
    for label, predicate in buckets:
        lines.append(f"- {label}: `{sum(1 for row in rows if predicate(row))}`")

    return [*lines, ""]


def _flag_summary_lines(rows: list[UnitInspectRow]) -> list[str]:
    flag_names = sorted({flag for row in rows for flag in row.flags})
    lines = ["## Flag Summary", ""]
    if not flag_names:
        return [*lines, "- none", ""]

    for flag_name in flag_names:
        lines.append(
            f"- {flag_name}: `{sum(1 for row in rows if flag_name in row.flags)}`"
        )

    return [*lines, ""]


def _issue_context_lines(
    rows: list[UnitInspectRow],
    *,
    context: int,
    max_contexts: int,
) -> list[str]:
    raw_issue_indexes = [
        index
        for index, row in enumerate(rows)
        if row.flags and _is_high_value_issue(row.flags)
    ]
    issue_indexes = _dedupe_nearby_indexes(raw_issue_indexes, context=context)[
        :max_contexts
    ]
    lines = ["## Issue Contexts", ""]
    if not issue_indexes:
        return [*lines, "- none", ""]

    for issue_index in issue_indexes:
        issue = rows[issue_index]
        lines.append(
            f"### {issue.unit.unit_id} "
            f"{issue.unit.start_time:.2f}-{issue.unit.end_time:.2f}s "
            f"flags=`{','.join(issue.flags)}`"
        )
        lines.append("")
        start = max(0, issue_index - context)
        end = min(len(rows), issue_index + context + 1)
        lines.append(_unit_table(rows[start:end]))
        lines.append("")

    return lines


def _dedupe_nearby_indexes(indexes: list[int], *, context: int) -> list[int]:
    selected: list[int] = []
    last_context_end = -1
    for index in indexes:
        if index <= last_context_end:
            continue

        selected.append(index)
        last_context_end = index + context

    return selected


def _is_high_value_issue(flags: list[str]) -> bool:
    return any(
        flag in flags
        for flag in (
            "short_duration",
            "short_words",
            "long_gap_before",
            "long_gap_after",
        )
    )


def _unit_table(rows: list[UnitInspectRow]) -> str:
    if not rows:
        return "_none_"

    table = [
        "| unit | time | dur | words | chars | pause_before | pause_after | flags | text |",
        "|---|---:|---:|---:|---:|---:|---:|---|---|",
    ]
    for row in rows:
        table.append(
            f"| {row.unit.unit_id} | {row.unit.start_time:.2f}-{row.unit.end_time:.2f} | "
            f"{row.duration:.2f} | {row.word_count} | {row.char_count} | "
            f"{_optional_seconds(row.pause_before)} | "
            f"{_optional_seconds(row.pause_after)} | "
            f"{','.join(row.flags) or '-'} | {_compact_text(row.unit.text, limit=180)} |"
        )

    return "\n".join(table)


def _optional_seconds(value: float | None) -> str:
    if value is None:
        return "-"

    return f"{value:.2f}"


def _compact_text(text: str, *, limit: int) -> str:
    compacted = " ".join(text.split()).replace("|", "/")
    if len(compacted) <= limit:
        return compacted

    return f"{compacted[: limit - 3]}..."


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
