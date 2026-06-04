from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Literal

from app.providers.chaptering.noop_embedding import NoopTextEmbeddingProvider
from app.schemas.chaptering import (
    ChapterGenerationRequest,
    ChapteringOptions,
    ChapteringTranscriptSegment,
    ChapteringTranscriptWord,
)
from app.workflows.chaptering.candidate_ranking import rank_boundary_candidates
from app.workflows.chaptering.candidates import retain_candidates_for_embedding
from app.workflows.chaptering.common import build_chapters
from app.workflows.chaptering.scores.gap_scoring import (
    attach_semantic_shift_scores,
    gap_scores_to_candidates,
    score_unit_gaps,
)
from app.workflows.chaptering.pipelines.shared import run_units_pipeline
from app.workflows.chaptering.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
    ChapterGapScore,
    ChapterCandidate,
    ChapterUnit,
    ChapteringPipelineConfig,
    UnitRepairConfig,
    ValleyDetectionConfig,
)
from app.workflows.chaptering.segment_units import build_segment_chapter_units
from app.workflows.chaptering.selection import select_boundaries_from_candidates
from app.workflows.chaptering.semantic import score_context_windows
from app.workflows.chaptering.scores.valleys import detect_valley_candidates
from app.workflows.chaptering.unit_repair import repair_micro_units
from app.workflows.chaptering.windows import build_context_windows
from app.workflows.chaptering.word_units import (
    build_word_chapter_units,
    has_usable_word_timestamps,
)

Strategy = Literal["auto", "word", "segment"]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inspect chaptering Phase 3-5 scores for transcript JSON."
    )
    parser.add_argument("transcript_json", type=Path, nargs="+")
    parser.add_argument(
        "--strategy", choices=["auto", "word", "segment"], default="auto"
    )
    parser.add_argument("--use-embeddings", action="store_true")
    parser.add_argument("--min-chapter-duration", type=float, default=60.0)
    parser.add_argument("--target-chapter-duration", type=float, default=240.0)
    parser.add_argument("--max-chapter-duration", type=float, default=480.0)
    parser.add_argument("--max-chapters", type=int, default=12)
    parser.add_argument("--target-unit-duration", type=float, default=12.0)
    parser.add_argument("--max-unit-duration", type=float, default=20.0)
    parser.add_argument("--target-unit-words", type=int, default=40)
    parser.add_argument("--max-unit-words", type=int, default=80)
    parser.add_argument("--max-unit-chars", type=int, default=1200)
    parser.add_argument("--pause-boundary", type=float, default=1.0)
    parser.add_argument("--punctuation-poor-threshold", type=float, default=0.15)
    parser.add_argument("--score-context-seconds", type=float, default=90.0)
    parser.add_argument("--embedding-context-seconds", type=float, default=90.0)
    parser.add_argument("--long-pause-seconds", type=float, default=1.0)
    parser.add_argument("--max-pause-score-seconds", type=float, default=5.0)
    parser.add_argument("--min-context-text-chars", type=int, default=120)
    parser.add_argument("--valley-smoothing-radius", type=int, default=1)
    parser.add_argument("--valley-peak-window", type=int, default=2)
    parser.add_argument("--min-valley-depth", type=float, default=0.18)
    parser.add_argument("--retention-min-limit", type=int, default=12)
    parser.add_argument("--retention-max-limit", type=int, default=40)
    parser.add_argument("--retention-multiplier", type=int, default=4)
    parser.add_argument("--retention-top-score-fraction", type=float, default=0.60)
    parser.add_argument("--top", type=int, default=20)
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Write one phase report per transcript instead of printing.",
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
            output_path = args.output_dir / f"{transcript_json.stem}_phase_3_5.md"
            output_path.write_text(output, encoding="utf-8")
            print(f"wrote {output_path}")
        else:
            print(output, end="")


def _inspect_transcript(transcript_json: Path, args: argparse.Namespace) -> str:
    payload = json.loads(transcript_json.read_text(encoding="utf-8"))
    segments = _load_segments(payload, synthesize_ids=args.synthesize_ids)
    strategy = _resolve_strategy(args.strategy, segments)
    duration = _media_duration(payload, segments)
    config = _pipeline_config(args, strategy=strategy)
    request = _request(payload, segments, duration=duration, args=args)
    raw_units = _build_units(segments, strategy=strategy, config=config)
    units = repair_micro_units(
        raw_units,
        max_unit_duration=config.max_unit_duration_seconds,
        max_unit_words=config.max_unit_words,
        max_unit_chars=config.max_unit_chars,
        config=config.unit_repair,
    )

    gap_scores = score_unit_gaps(
        units,
        media_duration=duration,
        min_chapter_duration=args.min_chapter_duration,
        config=config.scoring,
    )
    all_gap_candidates = gap_scores_to_candidates(gap_scores)
    all_gap_windows = build_context_windows(
        units,
        all_gap_candidates,
        context_duration=config.context_window_seconds,
    )
    semantic_shift_scores_by_time = (
        score_context_windows(all_gap_windows, embedding=NoopTextEmbeddingProvider())
        if args.use_embeddings and all_gap_windows
        else {}
    )
    semantic_gap_scores = attach_semantic_shift_scores(
        gap_scores,
        semantic_shift_scores_by_time,
    )
    valley_gap_scores = detect_valley_candidates(
        semantic_gap_scores,
        min_candidate_distance_seconds=args.min_chapter_duration / 2,
        config=config.valley,
    )
    candidate_gap_scores = valley_gap_scores or semantic_gap_scores
    phase4_candidates = gap_scores_to_candidates(candidate_gap_scores)
    retained_candidates = retain_candidates_for_embedding(
        phase4_candidates,
        media_duration=duration,
        target_chapter_duration=args.target_chapter_duration,
        config=config.retention,
    )
    ranked_candidates = rank_boundary_candidates(
        retained_candidates,
        semantic_shift_scores_by_time=semantic_shift_scores_by_time,
        max_chapters=args.max_chapters,
        min_candidate_distance_seconds=args.min_chapter_duration / 2,
        config=config.retention,
    )
    boundaries = select_boundaries_from_candidates(
        ranked_candidates,
        media_duration=duration,
        min_duration=args.min_chapter_duration,
        target_duration=args.target_chapter_duration,
        max_duration=args.max_chapter_duration,
        max_chapters=args.max_chapters,
    )
    candidates_by_time = {candidate.time: candidate for candidate in ranked_candidates}
    chapters = build_chapters(
        request,
        duration=duration,
        boundaries=boundaries,
        semantic_shift_scores_by_time=semantic_shift_scores_by_time,
        candidates_by_time=candidates_by_time,
    )
    pipeline_result = run_units_pipeline(
        request=request,
        units=units,
        embedding=NoopTextEmbeddingProvider(),
        config=config,
    )

    return "\n".join(
        [
            *_header_lines(
                transcript_json, payload, args, strategy, duration, segments
            ),
            *_unit_summary_lines(units),
            *_phase3_lines(semantic_gap_scores, args.top),
            *_phase4_lines(valley_gap_scores, candidate_gap_scores),
            *_phase5_lines(retained_candidates, ranked_candidates, args.top),
            *_chapter_lines(chapters),
            *_pipeline_check_lines(pipeline_result),
            "",
        ]
    )


def _header_lines(
    transcript_json: Path,
    payload: dict[str, Any],
    args: argparse.Namespace,
    strategy: str,
    duration: float,
    segments: list[ChapteringTranscriptSegment],
) -> list[str]:
    return [
        "# Chaptering Phase 3-5 Inspect",
        "",
        f"- source: `{transcript_json}`",
        f"- video_id: `{payload.get('video_id', '')}`",
        f"- language: `{payload.get('language', '')}`",
        f"- media_duration_seconds: `{duration:.2f}`",
        f"- strategy: `{strategy}`",
        f"- segments: `{len(segments)}`",
        f"- use_embeddings: `{args.use_embeddings}`",
        "- embedding_provider: `NoopTextEmbeddingProvider`",
        "",
        "## Config",
        "",
        f"- chapter_duration: min `{args.min_chapter_duration}`, target "
        f"`{args.target_chapter_duration}`, max `{args.max_chapter_duration}`",
        f"- max_chapters: `{args.max_chapters}`",
        f"- unit_duration: target `{args.target_unit_duration}`, max "
        f"`{args.max_unit_duration}`",
        f"- score_context_seconds: `{args.score_context_seconds}`",
        f"- embedding_context_seconds: `{args.embedding_context_seconds}`",
        f"- valley: smoothing_radius `{args.valley_smoothing_radius}`, "
        f"peak_window `{args.valley_peak_window}`, min_depth "
        f"`{args.min_valley_depth}`",
        f"- retention: min `{args.retention_min_limit}`, max "
        f"`{args.retention_max_limit}`, multiplier `{args.retention_multiplier}`, "
        f"top_score_fraction `{args.retention_top_score_fraction}`",
        "",
    ]


def _unit_summary_lines(units: list[ChapterUnit]) -> list[str]:
    durations = [unit.end_time - unit.start_time for unit in units]
    if not durations:
        return ["## Unit Build", "", "- units: `0`", ""]

    return [
        "## Unit Build",
        "",
        f"- units: `{len(units)}`",
        f"- duration_min: `{min(durations):.2f}`",
        f"- duration_avg: `{sum(durations) / len(durations):.2f}`",
        f"- duration_max: `{max(durations):.2f}`",
        "",
        "### First Units",
        "",
        *_unit_lines(units[:10]),
    ]


def _unit_lines(units: list[ChapterUnit]) -> list[str]:
    lines: list[str] = []
    for unit in units:
        lines.extend(
            [
                f"- `{unit.unit_id}` `{unit.start_time:.2f}-{unit.end_time:.2f}` "
                f"segments=`{','.join(unit.segment_ids)}`",
                f"  - {unit.text[:240]}",
            ]
        )

    return [*lines, ""]


def _phase3_lines(gap_scores: list[ChapterGapScore], top: int) -> list[str]:
    lines = [
        "## Phase 3: Gap Cohesion Scoring",
        "",
        f"- scored_gaps: `{len(gap_scores)}`",
        "",
        "### Top By Combined Score",
        "",
        _gap_table(
            sorted(gap_scores, key=lambda gap: (-gap.combined_score, gap.time))[:top]
        ),
        "",
        "### Top By Lexical Shift",
        "",
        _gap_table(
            sorted(gap_scores, key=lambda gap: (-gap.lexical_shift_score, gap.time))[
                :top
            ]
        ),
        "",
    ]
    if any(gap.semantic_shift_score > 0 for gap in gap_scores):
        lines.extend(
            [
                "### Top By Semantic Shift",
                "",
                _gap_table(
                    sorted(
                        gap_scores,
                        key=lambda gap: (-gap.semantic_shift_score, gap.time),
                    )[:top]
                ),
                "",
            ]
        )

    return lines


def _phase4_lines(
    valley_gap_scores: list[ChapterGapScore],
    candidate_gap_scores: list[ChapterGapScore],
) -> list[str]:
    source = "valley_gap_scores" if valley_gap_scores else "all_gap_scores"
    return [
        "## Phase 4: Valley-Based Candidate Detection",
        "",
        f"- valleys: `{len(valley_gap_scores)}`",
        f"- candidate_source: `{source}`",
        f"- candidate_gap_scores: `{len(candidate_gap_scores)}`",
        "",
        _gap_table(valley_gap_scores),
        "",
    ]


def _phase5_lines(
    retained_candidates: list[ChapterCandidate],
    ranked_candidates: list[ChapterCandidate],
    top: int,
) -> list[str]:
    return [
        "## Phase 5: Candidate Ranking And Deterministic Fallback",
        "",
        f"- retained_candidates: `{len(retained_candidates)}`",
        f"- ranked_candidates: `{len(ranked_candidates)}`",
        "",
        "### Ranked Candidates",
        "",
        _candidate_table(
            sorted(
                ranked_candidates,
                key=lambda candidate: (-candidate.candidate_score, candidate.time),
            )[:top]
        ),
        "",
    ]


def _chapter_lines(chapters: list) -> list[str]:
    lines = ["## Selected Chapters", ""]
    for chapter in chapters:
        scores = chapter.scores
        lines.append(
            f"- `{chapter.index}` `{chapter.start_seconds:.2f}-{chapter.end_seconds:.2f}` "
            f"score=`{chapter.score}` semantic=`{scores.semantic_shift_score}` "
            f"lexical=`{scores.lexical_shift_score}` valley=`{scores.valley_depth_score}` "
            f"pause=`{scores.pause_score}` quality=`{scores.boundary_quality_score}`"
        )

    return [*lines, ""]


def _pipeline_check_lines(pipeline_result: Any) -> list[str]:
    starts = [chapter.start_seconds for chapter in pipeline_result.chapters]
    return [
        "## Pipeline Check",
        "",
        f"- run_units_pipeline_starts: `{starts}`",
        "",
    ]


def _gap_table(gaps: list[ChapterGapScore]) -> str:
    if not gaps:
        return "_none_"

    rows = [
        "| time | combined | lexical_cohesion | lexical_shift | semantic_shift | valley | marker | pause | quality | duration | text |",
        "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
    ]
    for gap in gaps:
        text = _compact_text(gap.right_text or gap.left_text, limit=110)
        rows.append(
            f"| {gap.time:.2f} | {gap.combined_score:.4f} | "
            f"{gap.lexical_cohesion_score:.4f} | {gap.lexical_shift_score:.4f} | "
            f"{gap.semantic_shift_score:.4f} | {gap.valley_depth_score:.4f} | "
            f"{gap.discourse_marker_score:.4f} | {gap.pause_score:.4f} | "
            f"{gap.boundary_quality_score:.4f} | {gap.duration_sanity_score:.4f} | "
            f"{text} |"
        )

    return "\n".join(rows)


def _candidate_table(candidates: list[ChapterCandidate]) -> str:
    if not candidates:
        return "_none_"

    rows = [
        "| time | candidate | cheap | semantic | lexical | valley | marker | pause | quality | duration |",
        "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for candidate in candidates:
        rows.append(
            f"| {candidate.time:.2f} | {candidate.candidate_score:.4f} | "
            f"{candidate.cheap_score:.4f} | {candidate.semantic_shift_score:.4f} | "
            f"{candidate.lexical_shift_score:.4f} | "
            f"{candidate.valley_depth_score:.4f} | "
            f"{candidate.discourse_marker_score:.4f} | {candidate.pause_score:.4f} | "
            f"{candidate.boundary_quality_score:.4f} | "
            f"{candidate.duration_sanity_score:.4f} |"
        )

    return "\n".join(rows)


def _resolve_strategy(
    strategy: Strategy,
    segments: list[ChapteringTranscriptSegment],
) -> Literal["word", "segment"]:
    if strategy == "segment":
        return "segment"

    if strategy == "word" or has_usable_word_timestamps(segments):
        return "word"

    return "segment"


def _build_units(
    segments: list[ChapteringTranscriptSegment],
    *,
    strategy: str,
    config: ChapteringPipelineConfig,
) -> list[ChapterUnit]:
    if strategy == "word":
        return build_word_chapter_units(
            segments,
            max_unit_duration=config.max_unit_duration_seconds,
            pause_boundary_seconds=config.pause_boundary_seconds,
            target_unit_duration=config.target_unit_duration_seconds,
            target_unit_words=config.target_unit_words,
            max_unit_words=config.max_unit_words,
            max_unit_chars=config.max_unit_chars,
        )

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


def _pipeline_config(
    args: argparse.Namespace,
    *,
    strategy: str,
) -> ChapteringPipelineConfig:
    return ChapteringPipelineConfig(
        strategy=strategy,
        model_name=f"{strategy}-chaptering-inspect",
        target_unit_duration_seconds=args.target_unit_duration,
        max_unit_duration_seconds=args.max_unit_duration,
        target_unit_words=args.target_unit_words,
        max_unit_words=args.max_unit_words,
        max_unit_chars=args.max_unit_chars,
        pause_boundary_seconds=args.pause_boundary,
        punctuation_poor_threshold=args.punctuation_poor_threshold,
        context_window_seconds=args.embedding_context_seconds,
        scoring=CandidateScoringConfig(
            context_seconds=args.score_context_seconds,
            long_pause_seconds=args.long_pause_seconds,
            max_pause_score_seconds=args.max_pause_score_seconds,
            min_context_text_chars=args.min_context_text_chars,
            discourse_marker_weight=0.30,
            pause_weight=0.25,
            lexical_shift_weight=0.20,
            boundary_quality_weight=0.15,
            duration_sanity_weight=0.10,
        ),
        valley=ValleyDetectionConfig(
            smoothing_radius=args.valley_smoothing_radius,
            peak_window=args.valley_peak_window,
            min_valley_depth=args.min_valley_depth,
        ),
        retention=CandidateRetentionConfig(
            min_limit=args.retention_min_limit,
            max_limit=args.retention_max_limit,
            multiplier=args.retention_multiplier,
            top_score_fraction=args.retention_top_score_fraction,
        ),
        unit_repair=UnitRepairConfig(
            short_duration_seconds=4.0,
            min_words=8,
            fragment_max_words=2,
            sparse_duration_seconds=6.0,
        ),
    )


def _request(
    payload: dict[str, Any],
    segments: list[ChapteringTranscriptSegment],
    *,
    duration: float,
    args: argparse.Namespace,
) -> ChapterGenerationRequest:
    return ChapterGenerationRequest(
        request_id=f"inspect-{payload.get('video_id') or 'transcript'}",
        language=_text_value(payload, "language") or "en",
        media_duration_seconds=duration,
        segments=segments,
        options=ChapteringOptions(
            min_chapter_duration_seconds=args.min_chapter_duration,
            target_chapter_duration_seconds=args.target_chapter_duration,
            max_chapter_duration_seconds=args.max_chapter_duration,
            max_chapters=args.max_chapters,
            use_embeddings=args.use_embeddings,
            use_llm=False,
        ),
    )


def _media_duration(
    payload: dict[str, Any],
    segments: list[ChapteringTranscriptSegment],
) -> float:
    duration = payload.get("duration") or payload.get("media_duration_seconds")
    if duration is not None:
        return float(duration)

    return max((segment.end_seconds for segment in segments), default=0.0)


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
        clean_text=_nullable_text_value(raw_segment, "clean_text"),
        speaker_label=_nullable_text_value(raw_segment, "speaker_label"),
        confidence=_nullable_float_value(raw_segment, "confidence"),
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
        confidence=_nullable_float_value(raw_word, "confidence"),
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


def _nullable_float_value(payload: dict[str, Any], *keys: str) -> float | None:
    for key in keys:
        value = payload.get(key)
        if value is not None:
            return float(value)
    return None


def _compact_text(text: str, *, limit: int) -> str:
    compacted = " ".join(text.split()).replace("|", "/")
    if len(compacted) <= limit:
        return compacted

    return f"{compacted[: limit - 3]}..."


if __name__ == "__main__":
    main()
