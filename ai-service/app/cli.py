from __future__ import annotations

import sys
from argparse import ArgumentParser
from collections.abc import Callable, Sequence
from pathlib import Path

from app.core.config import AI_SERVICE_DIR, get_settings
from app.scripts.generate_chapters.analyze_unit import main as analyze_unit_main
from app.scripts.generate_chapters.buid_unit import main as build_unit_main

GENERATE_CHAPTERS_EVAL_DIR = AI_SERVICE_DIR / "storage" / "generate_chapters_eval"
YTSEG_DIR = GENERATE_CHAPTERS_EVAL_DIR / "ytseg"


def generate_chapters_build_units() -> None:
    """Build generate_chapters units for the local YTSeg evaluation dataset."""
    parser = ArgumentParser(
        description="Build generate_chapters units for the local YTSeg evaluation dataset."
    )
    parser.add_argument(
        "--run-name",
        default=_generate_chapters_run_name(),
        help="Name used in the default output directory.",
    )
    parser.add_argument(
        "--transcripts-dir",
        type=Path,
        default=YTSEG_DIR / "transcripts",
        help="Directory containing split subdirectories with transcript JSON files.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Override the units output directory.",
    )
    args = parser.parse_args()

    transcript_paths = sorted(args.transcripts_dir.glob("*/*.json"))
    if not transcript_paths:
        raise SystemExit(f"No transcript JSON files found under {args.transcripts_dir}")

    _run_script(
        build_unit_main,
        [
            *(str(path) for path in transcript_paths),
            "--output-dir",
            str(args.output_dir or _default_units_dir(args.run_name)),
            "--synthesize-ids",
        ],
    )


def generate_chapters_analyze_units() -> None:
    """Analyze built generate_chapters units for dev and holdout YTSeg splits."""
    parser = ArgumentParser(
        description="Analyze built generate_chapters units for the local YTSeg dataset."
    )
    parser.add_argument(
        "--run-name",
        default=_generate_chapters_run_name(),
        help="Name used to find the default units directory and write analysis output.",
    )
    parser.add_argument(
        "--units-dir",
        type=Path,
        help="Override the units directory to analyze.",
    )
    parser.add_argument(
        "--split",
        choices=["all", "dev", "holdout"],
        default="all",
        help="Dataset split to analyze.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Override output directory. Only valid when --split is dev or holdout.",
    )
    args = parser.parse_args()

    if args.output_dir and args.split == "all":
        raise SystemExit(
            "--output-dir can only be used with --split dev or --split holdout."
        )

    units_dir = args.units_dir or _default_units_dir(args.run_name)
    splits = ("dev", "holdout") if args.split == "all" else (args.split,)
    for split in splits:
        _run_script(
            analyze_unit_main,
            [
                str(units_dir),
                "--expected-dir",
                str(YTSEG_DIR / "expected" / split),
                "--output-dir",
                str(args.output_dir or _default_analysis_dir(args.run_name, split)),
                "--split",
                split,
            ],
        )


def _default_units_dir(run_name: str) -> Path:
    return GENERATE_CHAPTERS_EVAL_DIR / f"units_{run_name}"


def _default_analysis_dir(run_name: str, split: str) -> Path:
    return GENERATE_CHAPTERS_EVAL_DIR / f"analysis_{run_name}_{split}"


def _generate_chapters_run_name() -> str:
    settings = get_settings()
    return "_".join(
        [
            settings.generate_chapters_strategy,
            _compact_number(settings.generate_chapters_target_unit_duration_seconds),
            _compact_number(settings.generate_chapters_max_unit_duration_seconds),
        ]
    )


def _compact_number(value: float) -> str:
    if value.is_integer():
        return str(int(value))

    return str(value).replace(".", "p")


def _run_script(main: Callable[[], None], argv: Sequence[str]) -> None:
    original_argv = sys.argv
    try:
        sys.argv = [original_argv[0], *argv]
        main()
    finally:
        sys.argv = original_argv
