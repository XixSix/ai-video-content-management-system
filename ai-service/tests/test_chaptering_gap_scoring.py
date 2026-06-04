from app.providers.chaptering.noop_embedding import NoopTextEmbeddingProvider
from app.schemas.chaptering import (
    ChapterGenerationRequest,
    ChapteringOptions,
    ChapteringTranscriptSegment,
)
from app.workflows.chaptering.gap_scoring import (
    attach_semantic_shift_scores,
    gap_scores_to_candidates,
    score_unit_gaps,
)
from app.workflows.chaptering.pipelines.shared import run_units_pipeline
from app.workflows.chaptering.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
    ChapterUnit,
    ChapteringPipelineConfig,
    ValleyDetectionConfig,
)


def test_score_unit_gaps_uses_bag_of_words_cosine_for_lexical_shift() -> None:
    similar_gap = score_unit_gaps(
        [
            _unit(1, 0, 10, "database schema prisma users queries"),
            _unit(2, 10, 20, "database prisma users relations queries"),
        ],
        media_duration=30,
        min_chapter_duration=5,
        config=_scoring_config(context_seconds=10),
    )[0]
    changed_gap = score_unit_gaps(
        [
            _unit(1, 0, 10, "database schema prisma users queries"),
            _unit(2, 10, 20, "camera lighting lenses framing exposure"),
        ],
        media_duration=30,
        min_chapter_duration=5,
        config=_scoring_config(context_seconds=10),
    )[0]

    assert similar_gap.lexical_cohesion_score > changed_gap.lexical_cohesion_score
    assert similar_gap.lexical_shift_score < changed_gap.lexical_shift_score
    assert changed_gap.lexical_shift_score == 1.0


def test_score_unit_gaps_scores_pause_marker_and_context_quality() -> None:
    gap = score_unit_gaps(
        [
            _unit(1, 0, 10, "The upload flow stores original media metadata."),
            _unit(
                2,
                12,
                20,
                "Next topic is chaptering with candidate boundary scoring.",
            ),
        ],
        media_duration=30,
        min_chapter_duration=5,
        config=_scoring_config(context_seconds=20),
    )[0]

    assert gap.pause_score == 0.5
    assert gap.discourse_marker_score == 1.0
    assert gap.boundary_quality_score == 1.0
    assert gap.combined_score > 0


def test_score_unit_gaps_filters_times_that_cannot_form_valid_chapters() -> None:
    gap_scores = score_unit_gaps(
        [
            _unit(1, 0, 4, "Intro."),
            _unit(2, 4, 8, "Too close to start."),
            _unit(3, 10, 18, "Valid middle boundary."),
            _unit(4, 26, 30, "Too close to end."),
        ],
        media_duration=30,
        min_chapter_duration=8,
        config=_scoring_config(context_seconds=20),
    )

    assert [gap.time for gap in gap_scores] == [10]


def test_semantic_scores_attach_to_gap_scores_without_changing_candidate_times() -> (
    None
):
    gap_scores = score_unit_gaps(
        [
            _unit(1, 0, 10, "Authentication and upload workflow."),
            _unit(2, 10, 20, "Chaptering and topic segmentation."),
        ],
        media_duration=30,
        min_chapter_duration=5,
        config=_scoring_config(context_seconds=10),
    )

    scored = attach_semantic_shift_scores(gap_scores, {10: 0.75})
    candidates = gap_scores_to_candidates(scored)

    assert scored[0].semantic_shift_score == 0.75
    assert [candidate.time for candidate in candidates] == [10]
    assert candidates[0].cheap_score == scored[0].combined_score


def test_units_pipeline_uses_scored_gap_candidate_times_without_embeddings() -> None:
    units = [
        _unit(1, 0, 20, "Introductory overview of media upload and storage."),
        _unit(2, 20, 40, "Transcript processing and background jobs."),
        _unit(3, 40, 60, "Next topic is chaptering and boundary scoring."),
        _unit(4, 60, 80, "Finally the system prepares platform clips."),
    ]
    request = ChapterGenerationRequest(
        request_id="chaptering-job-1",
        language="en",
        media_duration_seconds=90,
        segments=[
            _segment(1, 0, 20, units[0].text),
            _segment(2, 20, 40, units[1].text),
            _segment(3, 40, 60, units[2].text),
            _segment(4, 60, 80, units[3].text),
        ],
        options=ChapteringOptions(
            min_chapter_duration_seconds=15,
            target_chapter_duration_seconds=30,
            max_chapter_duration_seconds=60,
            max_chapters=3,
            use_embeddings=False,
            use_llm=False,
        ),
    )

    result = run_units_pipeline(
        request=request,
        units=units,
        embedding=NoopTextEmbeddingProvider(),
        config=_pipeline_config(),
    )

    starts = [chapter.start_seconds for chapter in result.chapters]
    assert starts[0] == 0
    assert set(starts[1:]).issubset({unit.start_time for unit in units[1:]})
    assert result.chapters[1].scores is not None
    assert result.chapters[1].scores.lexical_shift_score is not None
    assert result.chapters[1].scores.semantic_shift_score == 0.0


def test_units_pipeline_attaches_valley_depth_to_selected_boundary() -> None:
    units = [
        _unit(1, 0, 20, "database schema prisma users database queries"),
        _unit(2, 20, 40, "database relations prisma tables users queries"),
        _unit(3, 40, 60, "camera lighting lenses exposure framing shots"),
        _unit(4, 60, 80, "camera composition lenses lighting exposure scene"),
    ]
    request = ChapterGenerationRequest(
        request_id="chaptering-job-2",
        language="en",
        media_duration_seconds=90,
        segments=[
            _segment(1, 0, 20, units[0].text),
            _segment(2, 20, 40, units[1].text),
            _segment(3, 40, 60, units[2].text),
            _segment(4, 60, 80, units[3].text),
        ],
        options=ChapteringOptions(
            min_chapter_duration_seconds=10,
            target_chapter_duration_seconds=40,
            max_chapter_duration_seconds=80,
            max_chapters=3,
            use_embeddings=False,
            use_llm=False,
        ),
    )

    result = run_units_pipeline(
        request=request,
        units=units,
        embedding=NoopTextEmbeddingProvider(),
        config=_pipeline_config(context_seconds=20),
    )

    assert [chapter.start_seconds for chapter in result.chapters] == [0, 40]
    assert result.chapters[1].scores is not None
    assert result.chapters[1].scores.valley_depth_score is not None
    assert result.chapters[1].scores.valley_depth_score > 0


def test_units_pipeline_falls_back_to_all_gap_candidates_when_no_valleys_pass() -> None:
    units = [
        _unit(1, 0, 20, "database schema prisma users database queries"),
        _unit(2, 20, 40, "database relations prisma tables users queries"),
        _unit(3, 40, 60, "camera lighting lenses exposure framing shots"),
        _unit(4, 60, 80, "camera composition lenses lighting exposure scene"),
    ]
    request = ChapterGenerationRequest(
        request_id="chaptering-job-3",
        language="en",
        media_duration_seconds=90,
        segments=[
            _segment(1, 0, 20, units[0].text),
            _segment(2, 20, 40, units[1].text),
            _segment(3, 40, 60, units[2].text),
            _segment(4, 60, 80, units[3].text),
        ],
        options=ChapteringOptions(
            min_chapter_duration_seconds=10,
            target_chapter_duration_seconds=40,
            max_chapter_duration_seconds=80,
            max_chapters=3,
            use_embeddings=False,
            use_llm=False,
        ),
    )

    result = run_units_pipeline(
        request=request,
        units=units,
        embedding=NoopTextEmbeddingProvider(),
        config=_pipeline_config(context_seconds=20, min_valley_depth=1.1),
    )

    starts = [chapter.start_seconds for chapter in result.chapters]
    assert starts[0] == 0
    assert len(starts) > 1
    assert set(starts[1:]).issubset({unit.start_time for unit in units[1:]})


def _scoring_config(
    *,
    context_seconds: float = 90,
    min_context_text_chars: int = 20,
) -> CandidateScoringConfig:
    return CandidateScoringConfig(
        context_seconds=context_seconds,
        long_pause_seconds=1.0,
        max_pause_score_seconds=4.0,
        min_context_text_chars=min_context_text_chars,
        discourse_marker_weight=0.30,
        pause_weight=0.25,
        lexical_shift_weight=0.20,
        boundary_quality_weight=0.15,
        duration_sanity_weight=0.10,
    )


def _pipeline_config(
    *,
    context_seconds: float = 90,
    min_valley_depth: float = 0.18,
) -> ChapteringPipelineConfig:
    return ChapteringPipelineConfig(
        strategy="segment",
        model_name="segment-chaptering-v1",
        target_unit_duration_seconds=12.0,
        max_unit_duration_seconds=20.0,
        target_unit_words=40,
        max_unit_words=80,
        max_unit_chars=1200,
        pause_boundary_seconds=1.0,
        punctuation_poor_threshold=0.15,
        context_window_seconds=90.0,
        scoring=_scoring_config(context_seconds=context_seconds),
        valley=ValleyDetectionConfig(
            smoothing_radius=0,
            peak_window=2,
            min_valley_depth=min_valley_depth,
        ),
        retention=CandidateRetentionConfig(
            min_limit=12,
            max_limit=40,
            multiplier=4,
            top_score_fraction=0.60,
        ),
    )


def _unit(index: int, start: float, end: float, text: str) -> ChapterUnit:
    return ChapterUnit(
        unit_id=f"unit_{index:04d}",
        start_time=start,
        end_time=end,
        text=text,
        clean_text=text,
        segment_ids=[f"seg_{index:04d}"],
    )


def _segment(
    index: int,
    start: float,
    end: float,
    text: str,
) -> ChapteringTranscriptSegment:
    return ChapteringTranscriptSegment(
        segment_id=f"seg_{index:04d}",
        start_seconds=start,
        end_seconds=end,
        text=text,
    )
