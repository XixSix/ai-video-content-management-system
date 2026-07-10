from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any, cast

WORD_RE = re.compile(r"[^\W_]+", re.UNICODE)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Analyze generate_chapters unit JSON output from buid_unit."
    )
    parser.add_argument("unit_json", type=Path, nargs="+")
    parser.add_argument(
        "--expected-dir",
        type=Path,
        help="Directory containing YTSeg expected chapter JSON files.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("storage/build_unit_analysis"),
        help="Directory for per-video CSV, aggregate JSON, and outlier JSON.",
    )
    parser.add_argument(
        "--split",
        choices=["all", "dev", "holdout"],
        default="all",
        help="Analyze only one dataset split when unit JSON contains split metadata.",
    )
    parser.add_argument("--low-word-coverage", type=float, default=0.8)
    parser.add_argument("--micro-unit-rate", type=float, default=0.05)
    parser.add_argument("--short-unit-rate", type=float, default=0.10)
    parser.add_argument("--low-gap-recall-30", type=float, default=0.95)
    args = parser.parse_args()

    unit_paths = _expand_unit_paths(args.unit_json)
    if not unit_paths:
        raise SystemExit("No unit JSON files found.")

    rows = [
        row
        for unit_path in unit_paths
        if (
            row := _analyze_unit_file(
                unit_path,
                expected_dir=args.expected_dir,
                split=args.split,
                low_word_coverage=args.low_word_coverage,
                micro_unit_rate=args.micro_unit_rate,
                short_unit_rate=args.short_unit_rate,
                low_gap_recall_30=args.low_gap_recall_30,
            )
        )
    ]
    if not rows:
        raise SystemExit(f"No unit JSON files matched split={args.split}.")
    aggregate = _aggregate_rows(rows)
    outliers = _outliers(rows)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    _write_csv(args.output_dir / "per_video_units.csv", rows)
    _write_json(args.output_dir / "aggregate_units.json", aggregate)
    _write_json(args.output_dir / "outliers.json", outliers)

    print(f"wrote {args.output_dir / 'per_video_units.csv'}")
    print(f"wrote {args.output_dir / 'aggregate_units.json'}")
    print(f"wrote {args.output_dir / 'outliers.json'}")


def _analyze_unit_file(
    unit_path: Path,
    *,
    expected_dir: Path | None,
    split: str,
    low_word_coverage: float,
    micro_unit_rate: float,
    short_unit_rate: float,
    low_gap_recall_30: float,
) -> dict[str, Any]:
    """Analyze one built-unit JSON file into a CSV-friendly metric row."""
    payload = json.loads(unit_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit(f"{unit_path} must contain an object payload.")

    units = [
        cast(dict[str, Any], unit)
        for unit in payload.get("units") or []
        if isinstance(unit, dict)
    ]
    video_id = str(payload.get("videoId") or unit_path.stem.removesuffix("_units"))
    payload_split = str(payload.get("split") or "")
    if split != "all" and payload_split != split:
        return {}

    media_duration = _float_value(payload.get("mediaDurationSeconds"))
    config = _dict_value(payload.get("config"))
    input_summary = _dict_value(payload.get("input"))
    max_unit_duration = _float_value(config.get("maxUnitDurationSeconds"))
    context_seconds = _float_value(config.get("candidateScoreContextSeconds"))
    min_context_chars = _int_value(config.get("candidateMinContextTextChars"))

    durations = [_unit_duration(unit) for unit in units]
    unit_word_counts = [_word_count(str(unit.get("text") or "")) for unit in units]
    gap_times = [_float_value(unit.get("startTime")) for unit in units[1:]]
    context_rows = _context_rows(
        units,
        context_seconds=context_seconds,
        min_context_chars=min_context_chars,
    )
    expected_starts = _expected_starts(video_id, expected_dir)
    gap_distances = _nearest_gap_distances(expected_starts, gap_times)

    short_3_count = sum(1 for duration in durations if duration < 3)
    short_6_count = sum(1 for duration in durations if duration < 6)
    unit_count = len(units)
    short_3_rate = _rate(short_3_count, unit_count)
    short_6_rate = _rate(short_6_count, unit_count)
    over_max_count = (
        sum(1 for duration in durations if duration > max_unit_duration)
        if max_unit_duration > 0
        else 0
    )
    gap_recall_15 = _gap_recall(gap_distances, tolerance_seconds=15)
    gap_recall_30 = _gap_recall(gap_distances, tolerance_seconds=30)
    insufficient_context_count = sum(1 for row in context_rows if row["insufficient"])
    insufficient_context_rate = _rate(insufficient_context_count, len(context_rows))

    flags = _quality_flags(
        word_coverage=_float_value(input_summary.get("wordCoverage")),
        low_word_coverage=low_word_coverage,
        short_unit_rate_3s=short_3_rate,
        micro_unit_rate=micro_unit_rate,
        short_unit_rate_6s=short_6_rate,
        short_unit_rate=short_unit_rate,
        over_max_unit_count=over_max_count,
        overlong_source_segment_count=_int_value(
            input_summary.get("overlongSourceSegmentCount")
        ),
        insufficient_context_rate=insufficient_context_rate,
        gap_recall_30=gap_recall_30,
        low_gap_recall_30=low_gap_recall_30,
        expected_boundary_count=len(expected_starts),
    )

    return {
        "video_id": video_id,
        "split": payload_split,
        "source_path": str(unit_path),
        "requested_strategy": payload.get("requestedStrategy"),
        "resolved_strategy": payload.get("resolvedStrategy"),
        "fallback_reason": payload.get("fallbackReason") or "",
        "media_duration_seconds": _round(media_duration),
        "segment_count": _int_value(input_summary.get("segments")),
        "raw_words": _int_value(input_summary.get("rawWords")),
        "usable_words": _int_value(input_summary.get("usableWords")),
        "unusable_words": _int_value(input_summary.get("unusableWords")),
        "word_coverage": _round(_float_value(input_summary.get("wordCoverage")), 4),
        "source_segment_duration_avg": _round(
            _float_value(input_summary.get("sourceSegmentDurationAvg"))
        ),
        "source_segment_duration_p95": _round(
            _float_value(input_summary.get("sourceSegmentDurationP95"))
        ),
        "source_segment_duration_max": _round(
            _float_value(input_summary.get("sourceSegmentDurationMax"))
        ),
        "overlong_source_segment_count": _int_value(
            input_summary.get("overlongSourceSegmentCount")
        ),
        "unit_count": unit_count,
        "units_per_minute": _round(unit_count / (media_duration / 60))
        if media_duration > 0
        else 0,
        "unit_duration_min": _round(min(durations)) if durations else 0,
        "unit_duration_avg": _round(_avg(durations)),
        "unit_duration_p50": _round(_percentile(durations, 50)),
        "unit_duration_p90": _round(_percentile(durations, 90)),
        "unit_duration_p95": _round(_percentile(durations, 95)),
        "unit_duration_max": _round(max(durations)) if durations else 0,
        "short_unit_count_3s": short_3_count,
        "short_unit_rate_3s": _round(short_3_rate, 4),
        "short_unit_count_6s": short_6_count,
        "short_unit_rate_6s": _round(short_6_rate, 4),
        "over_max_unit_count": over_max_count,
        "unit_words_avg": _round(_avg(unit_word_counts)),
        "unit_words_p50": _round(_percentile(unit_word_counts, 50)),
        "unit_words_p95": _round(_percentile(unit_word_counts, 95)),
        "unit_words_max": max(unit_word_counts) if unit_word_counts else 0,
        "gap_count": len(gap_times),
        "left_context_chars_avg": _round(
            _avg([row["left_chars"] for row in context_rows])
        ),
        "right_context_chars_avg": _round(
            _avg([row["right_chars"] for row in context_rows])
        ),
        "insufficient_context_count": insufficient_context_count,
        "insufficient_context_rate": _round(insufficient_context_rate, 4),
        "expected_boundary_count": len(expected_starts),
        "gap_recall_15": _optional_round(gap_recall_15, 4),
        "gap_recall_30": _optional_round(gap_recall_30, 4),
        "gap_distance_avg": _optional_round(_avg(gap_distances), 3)
        if gap_distances
        else "",
        "gap_distance_p50": _optional_round(_percentile(gap_distances, 50), 3)
        if gap_distances
        else "",
        "gap_distance_p95": _optional_round(_percentile(gap_distances, 95), 3)
        if gap_distances
        else "",
        "gap_distance_max": _optional_round(max(gap_distances), 3)
        if gap_distances
        else "",
        "quality_flags": "|".join(flags),
    }


def _expand_unit_paths(paths: list[Path]) -> list[Path]:
    unit_paths: list[Path] = []
    for path in paths:
        if path.is_dir():
            unit_paths.extend(sorted(path.glob("*_units.json")))
            continue
        unit_paths.append(path)

    return sorted({path for path in unit_paths if path.exists()})


def _expected_starts(video_id: str, expected_dir: Path | None) -> list[float]:
    if expected_dir is None:
        return []

    expected_path = expected_dir / f"{video_id}.json"
    if not expected_path.exists():
        return []

    payload = json.loads(expected_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        return []

    chapters = payload.get("chapters") or []
    return [
        start
        for start in (
            _float_value(cast(dict[str, Any], chapter).get("startTime"))
            for chapter in chapters
            if isinstance(chapter, dict)
        )
        if start > 0.5
    ]


def _nearest_gap_distances(
    expected_starts: list[float],
    gap_times: list[float],
) -> list[float]:
    if not expected_starts or not gap_times:
        return []

    return [
        min(abs(gap_time - expected_start) for gap_time in gap_times)
        for expected_start in expected_starts
    ]


def _gap_recall(
    gap_distances: list[float],
    *,
    tolerance_seconds: float,
) -> float | None:
    if not gap_distances:
        return None

    hits = sum(1 for distance in gap_distances if distance <= tolerance_seconds)
    return hits / len(gap_distances)


def _quality_flags(
    *,
    word_coverage: float,
    low_word_coverage: float,
    short_unit_rate_3s: float,
    micro_unit_rate: float,
    short_unit_rate_6s: float,
    short_unit_rate: float,
    over_max_unit_count: int,
    overlong_source_segment_count: int,
    insufficient_context_rate: float,
    gap_recall_30: float | None,
    low_gap_recall_30: float,
    expected_boundary_count: int,
) -> list[str]:
    flags: list[str] = []
    if word_coverage < low_word_coverage:
        flags.append("LOW_WORD_COVERAGE")
    if short_unit_rate_3s > micro_unit_rate:
        flags.append("MANY_MICRO_UNITS")
    if short_unit_rate_6s > short_unit_rate:
        flags.append("MANY_SHORT_UNITS")
    if over_max_unit_count > 0:
        flags.append("OVERLONG_UNITS")
    if overlong_source_segment_count > 0:
        flags.append("OVERLONG_SOURCE_SEGMENTS")
    if insufficient_context_rate > 0:
        flags.append("INSUFFICIENT_CONTEXT")
    if (
        expected_boundary_count > 0
        and gap_recall_30 is not None
        and gap_recall_30 < low_gap_recall_30
    ):
        flags.append("LOW_ANCHOR_COVERAGE")

    return flags


def _aggregate_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    numeric_keys = [
        "word_coverage",
        "source_segment_duration_p95",
        "overlong_source_segment_count",
        "unit_count",
        "units_per_minute",
        "unit_duration_avg",
        "unit_duration_p95",
        "short_unit_rate_3s",
        "short_unit_rate_6s",
        "left_context_chars_avg",
        "right_context_chars_avg",
        "insufficient_context_rate",
        "gap_recall_15",
        "gap_recall_30",
        "gap_distance_p95",
    ]
    strategy_counts: dict[str, int] = {}
    split_counts: dict[str, int] = {}
    for row in rows:
        strategy = str(row.get("resolved_strategy") or "")
        strategy_counts[strategy] = strategy_counts.get(strategy, 0) + 1
        row_split = str(row.get("split") or "")
        split_counts[row_split] = split_counts.get(row_split, 0) + 1

    return {
        "video_count": len(rows),
        "split_counts": split_counts,
        "strategy_counts": strategy_counts,
        "fallback_count": sum(1 for row in rows if row.get("fallback_reason")),
        "averages": {
            key: _optional_round(_avg(_numeric_values(rows, key)), 4)
            for key in numeric_keys
        },
        "flag_counts": _flag_counts(rows),
    }


def _outliers(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "worst_by_short_unit_rate_3s": _top_rows(
            rows, "short_unit_rate_3s", reverse=True
        ),
        "worst_by_short_unit_rate_6s": _top_rows(
            rows, "short_unit_rate_6s", reverse=True
        ),
        "worst_by_unit_duration_p95": _top_rows(
            rows, "unit_duration_p95", reverse=True
        ),
        "worst_by_source_segment_duration_p95": _top_rows(
            rows, "source_segment_duration_p95", reverse=True
        ),
        "worst_by_insufficient_context_rate": _top_rows(
            rows, "insufficient_context_rate", reverse=True
        ),
        "worst_by_gap_recall_30": _top_rows(rows, "gap_recall_30", reverse=False),
        "flagged_videos": [
            _small_outlier_row(row) for row in rows if row.get("quality_flags")
        ],
    }


def _top_rows(
    rows: list[dict[str, Any]],
    key: str,
    *,
    reverse: bool,
    limit: int = 10,
) -> list[dict[str, Any]]:
    candidates = [row for row in rows if row.get(key) != ""]
    return [
        _small_outlier_row(row)
        for row in sorted(
            candidates,
            key=lambda row: _float_value(row.get(key)),
            reverse=reverse,
        )[:limit]
    ]


def _small_outlier_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "video_id": row["video_id"],
        "split": row["split"],
        "resolved_strategy": row["resolved_strategy"],
        "unit_count": row["unit_count"],
        "source_segment_duration_p95": row["source_segment_duration_p95"],
        "overlong_source_segment_count": row["overlong_source_segment_count"],
        "unit_duration_p95": row["unit_duration_p95"],
        "short_unit_rate_3s": row["short_unit_rate_3s"],
        "short_unit_rate_6s": row["short_unit_rate_6s"],
        "insufficient_context_rate": row["insufficient_context_rate"],
        "gap_recall_30": row["gap_recall_30"],
        "gap_distance_p95": row["gap_distance_p95"],
        "quality_flags": row["quality_flags"],
    }


def _flag_counts(rows: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        flags = str(row.get("quality_flags") or "")
        for flag in [flag for flag in flags.split("|") if flag]:
            counts[flag] = counts.get(flag, 0) + 1
    return counts


def _numeric_values(rows: list[dict[str, Any]], key: str) -> list[float]:
    values: list[float] = []
    for row in rows:
        value = row.get(key)
        if value == "" or value is None:
            continue
        values.append(_float_value(value))
    return values


def _unit_duration(unit: dict[str, Any]) -> float:
    duration = _float_value(unit.get("durationSeconds"))
    if duration > 0:
        return duration

    return _float_value(unit.get("endTime")) - _float_value(unit.get("startTime"))


def _context_rows(
    units: list[dict[str, Any]],
    *,
    context_seconds: float,
    min_context_chars: int,
) -> list[dict[str, Any]]:
    """Return left/right context text sizes for every unit-start gap."""
    if context_seconds <= 0:
        return []

    rows: list[dict[str, Any]] = []
    for index, unit in enumerate(units[1:], start=1):
        candidate_time = _float_value(unit.get("startTime"))
        left_units = [
            left_unit
            for left_unit in units[:index]
            if _float_value(left_unit.get("endTime")) > candidate_time - context_seconds
        ]
        right_units = [
            right_unit
            for right_unit in units[index:]
            if _float_value(right_unit.get("startTime"))
            < candidate_time + context_seconds
        ]
        left_chars = len(_join_unit_text(left_units))
        right_chars = len(_join_unit_text(right_units))
        rows.append(
            {
                "left_chars": left_chars,
                "right_chars": right_chars,
                "insufficient": (
                    left_chars < min_context_chars or right_chars < min_context_chars
                ),
            }
        )

    return rows


def _join_unit_text(units: list[dict[str, Any]]) -> str:
    return " ".join(
        str(unit.get("cleanText") or unit.get("text") or "") for unit in units
    )


def _word_count(text: str) -> int:
    return len(WORD_RE.findall(text))


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return

    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _percentile(values: list[float] | list[int], percentile: float) -> float:
    if not values:
        return 0.0

    sorted_values = sorted(float(value) for value in values)
    position = (len(sorted_values) - 1) * percentile / 100
    lower = int(position)
    upper = min(lower + 1, len(sorted_values) - 1)
    if lower == upper:
        return sorted_values[lower]

    ratio = position - lower
    return sorted_values[lower] * (1 - ratio) + sorted_values[upper] * ratio


def _avg(values: list[float] | list[int]) -> float:
    if not values:
        return 0.0

    return sum(float(value) for value in values) / len(values)


def _rate(count: int, total: int) -> float:
    if total <= 0:
        return 0.0

    return count / total


def _round(value: float, digits: int = 3) -> float:
    return round(value, digits)


def _optional_round(value: float | None, digits: int = 3) -> float | str:
    if value is None:
        return ""

    return round(value, digits)


def _float_value(value: object) -> float:
    if value == "" or value is None:
        return 0.0

    return float(value)  # type: ignore


def _int_value(value: object) -> int:
    if value == "" or value is None:
        return 0

    return int(value)  # type: ignore


def _dict_value(value: object) -> dict[str, Any]:
    if isinstance(value, dict):
        return cast(dict[str, Any], value)

    return {}


if __name__ == "__main__":
    main()
