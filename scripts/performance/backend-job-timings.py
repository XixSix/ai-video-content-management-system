#!/usr/bin/env python3
"""Export backend processing job timing metrics for report writing."""

from __future__ import annotations

import csv
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError as exc:  # pragma: no cover - depends on caller environment.
    raise SystemExit(
        "Missing psycopg. Run from worker with: "
        "cd worker && uv run python ../scripts/performance/backend-job-timings.py"
    ) from exc


REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = Path(os.environ.get("PERF_OUTPUT_DIR", REPO_ROOT / "performance-results/backend"))
CSV_FILE = OUTPUT_DIR / "job-timings.csv"
MARKDOWN_FILE = OUTPUT_DIR / "job-timings.md"


@dataclass(frozen=True)
class JobTimingRow:
    job_type: str
    total_count: int
    completed_count: int
    failed_count: int
    running_count: int
    pending_count: int
    canceled_count: int
    queue_wait_avg_seconds: float | None
    processing_avg_seconds: float | None
    total_avg_seconds: float | None
    attempt_avg: float | None
    attempt_max: int | None


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    database_url = _sanitize_database_url(_resolve_database_url())
    rows = _fetch_job_timing_rows(database_url)

    _write_csv(rows)
    _write_markdown(rows)

    print(f"Wrote {CSV_FILE}")
    print(f"Wrote {MARKDOWN_FILE}")


def _resolve_database_url() -> str:
    env_url = os.environ.get("DATABASE_URL")
    if env_url:
        return env_url

    for env_path in (REPO_ROOT / "worker/.env", REPO_ROOT / "backend/.env"):
        value = _read_env_value(env_path, "DATABASE_URL")
        if value:
            return value

    raise SystemExit(
        "DATABASE_URL was not found. Set DATABASE_URL or run after filling worker/.env/backend/.env."
    )


def _read_env_value(path: Path, key: str) -> str | None:
    if not path.exists():
        return None

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line.removeprefix("export ").strip()
        if "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() != key:
            continue
        return value.strip().strip("'\"")
    return None


def _sanitize_database_url(database_url: str) -> str:
    """Remove Prisma-only query params before opening a psycopg connection."""
    parsed = urlsplit(database_url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        return database_url

    query = [(key, value) for key, value in parse_qsl(parsed.query) if key != "schema"]
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment))


def _fetch_job_timing_rows(database_url: str) -> list[JobTimingRow]:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                WITH job_durations AS (
                  SELECT
                    job_type::text AS job_type,
                    status::text AS status,
                    attempt_count,
                    CASE
                      WHEN started_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM started_at - created_at)
                    END AS queue_wait_seconds,
                    CASE
                      WHEN started_at IS NOT NULL AND completed_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM completed_at - started_at)
                    END AS processing_seconds,
                    CASE
                      WHEN completed_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM completed_at - created_at)
                    END AS total_seconds
                  FROM processing_jobs
                )
                SELECT
                  job_type,
                  COUNT(*) AS total_count,
                  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_count,
                  COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_count,
                  COUNT(*) FILTER (
                    WHERE status NOT IN ('PENDING', 'QUEUED', 'COMPLETED', 'FAILED', 'CANCELED')
                  ) AS running_count,
                  COUNT(*) FILTER (WHERE status IN ('PENDING', 'QUEUED')) AS pending_count,
                  COUNT(*) FILTER (WHERE status = 'CANCELED') AS canceled_count,
                  AVG(queue_wait_seconds) AS queue_wait_avg_seconds,
                  AVG(processing_seconds) AS processing_avg_seconds,
                  AVG(total_seconds) AS total_avg_seconds,
                  AVG(attempt_count) AS attempt_avg,
                  MAX(attempt_count) AS attempt_max
                FROM job_durations
                GROUP BY job_type
                ORDER BY job_type
                """
            )
            return [_row_from_record(record) for record in cursor.fetchall()]


def _row_from_record(record: dict[str, Any]) -> JobTimingRow:
    return JobTimingRow(
        job_type=str(record["job_type"]),
        total_count=int(record["total_count"]),
        completed_count=int(record["completed_count"]),
        failed_count=int(record["failed_count"]),
        running_count=int(record["running_count"]),
        pending_count=int(record["pending_count"]),
        canceled_count=int(record["canceled_count"]),
        queue_wait_avg_seconds=_float_or_none(record["queue_wait_avg_seconds"]),
        processing_avg_seconds=_float_or_none(record["processing_avg_seconds"]),
        total_avg_seconds=_float_or_none(record["total_avg_seconds"]),
        attempt_avg=_float_or_none(record["attempt_avg"]),
        attempt_max=int(record["attempt_max"]) if record["attempt_max"] is not None else None,
    )


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _write_csv(rows: list[JobTimingRow]) -> None:
    fieldnames = [
        "job_type",
        "total_count",
        "completed_count",
        "failed_count",
        "running_count",
        "pending_count",
        "canceled_count",
        "queue_wait_avg_seconds",
        "processing_avg_seconds",
        "total_avg_seconds",
        "attempt_avg",
        "attempt_max",
    ]
    with CSV_FILE.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "job_type": row.job_type,
                    "total_count": row.total_count,
                    "completed_count": row.completed_count,
                    "failed_count": row.failed_count,
                    "running_count": row.running_count,
                    "pending_count": row.pending_count,
                    "canceled_count": row.canceled_count,
                    "queue_wait_avg_seconds": _format_number(row.queue_wait_avg_seconds),
                    "processing_avg_seconds": _format_number(row.processing_avg_seconds),
                    "total_avg_seconds": _format_number(row.total_avg_seconds),
                    "attempt_avg": _format_number(row.attempt_avg),
                    "attempt_max": row.attempt_max if row.attempt_max is not None else "",
                }
            )


def _write_markdown(rows: list[JobTimingRow]) -> None:
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    lines = [
        "# Backend Processing Job Timing",
        "",
        f"Generated at: `{generated_at}`",
        "",
        "| Job type | Total | Completed | Failed | Running | Pending | Canceled | Avg queue wait (s) | Avg processing (s) | Avg total (s) | Avg attempts | Max attempts |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]

    if rows:
        for row in rows:
            lines.append(
                "| "
                + " | ".join(
                    [
                        row.job_type,
                        str(row.total_count),
                        str(row.completed_count),
                        str(row.failed_count),
                        str(row.running_count),
                        str(row.pending_count),
                        str(row.canceled_count),
                        _format_number(row.queue_wait_avg_seconds),
                        _format_number(row.processing_avg_seconds),
                        _format_number(row.total_avg_seconds),
                        _format_number(row.attempt_avg),
                        str(row.attempt_max) if row.attempt_max is not None else "-",
                    ]
                )
                + " |"
            )
    else:
        lines.append("| No processing jobs found | 0 | 0 | 0 | 0 | 0 | 0 | - | - | - | - | - |")

    MARKDOWN_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _format_number(value: float | None) -> str:
    if value is None:
        return "-"
    return f"{value:.3f}"


if __name__ == "__main__":
    main()
