from app.providers.generate_chapters.noop_embedding import NoopTextEmbeddingProvider
from app.providers.generate_chapters.noop_boundary_evaluation import (
    NoopChapterBoundaryEvaluationProvider,
)
from app.providers.generate_chapters.noop_title import NoopChapterTitleProvider
from app.schemas.generate_chapters import (
    GenerateChaptersRequest,
    GenerateChaptersOptions,
    GenerateChaptersTranscriptSegment,
)
from app.workflows.generate_chapters.scores.gap_scoring import (
    attach_semantic_shift_scores,
    gap_scores_to_candidates,
    score_unit_gaps,
)
from app.workflows.generate_chapters.scores.scoring import score_boundary
from app.workflows.generate_chapters.scores.quality import boundary_quality_score
from app.workflows.generate_chapters.pipelines.shared import run_units_pipeline
from app.workflows.generate_chapters.schemas import (
    BoundaryEvaluation,
    BoundaryEvaluationInput,
    CandidateRetentionConfig,
    CandidateScoringConfig,
    ChapterTitleInput,
    ChapterTitleResult,
    ChapterUnit,
    GenerateChaptersPipelineConfig,
    UnitRepairConfig,
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
    assert similar_gap.combined_score == changed_gap.combined_score


def test_score_unit_gaps_scores_pause_marker_and_context_quality() -> None:
    gap = score_unit_gaps(
        [
            _unit(1, 0, 10, "The upload flow stores original media metadata."),
            _unit(
                2,
                12,
                20,
                "Next topic is generate_chapters with candidate boundary scoring.",
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


def test_score_boundary_uses_clean_text_for_transition_marker() -> None:
    segment = _segment(
        2,
        10,
        20,
        "Raw edited transcript content.",
    ).model_copy(update={"clean_text": "Next topic is edited transcript content."})

    score = score_boundary(
        [
            _segment(1, 0, 10, "Previous section has enough context."),
            segment,
        ],
        start_time=10,
        previous_start=0,
        target_duration=10,
    )

    assert score.discourse_marker_score == 1.0


def test_boundary_quality_score_ignores_whitespace() -> None:
    assert (
        boundary_quality_score(
            "a b c",
            "x  y\tz",
            min_context_text_chars=5,
        )
        == 0.6
    )


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
            _unit(2, 10, 20, "GenerateChapters and topic segmentation."),
        ],
        media_duration=30,
        min_chapter_duration=5,
        config=_scoring_config(context_seconds=10),
    )

    scored = attach_semantic_shift_scores(gap_scores, {10: 0.75})
    candidates = gap_scores_to_candidates(scored)

    assert scored[0].semantic_shift_score == 0.75
    assert scored[0].semantic_cohesion_score == 0.25
    assert [candidate.time for candidate in candidates] == [10]
    assert candidates[0].cheap_score == scored[0].combined_score
    assert candidates[0].semantic_shift_score == scored[0].semantic_shift_score
    assert candidates[0].semantic_cohesion_score == scored[0].semantic_cohesion_score


def test_units_pipeline_uses_scored_gap_candidate_times_without_embeddings() -> None:
    units = [
        _unit(1, 0, 20, "Introductory overview of media upload and storage."),
        _unit(2, 20, 40, "Transcript processing and background jobs."),
        _unit(3, 40, 60, "Next topic is generate_chapters and boundary scoring."),
        _unit(4, 60, 80, "Finally the system prepares platform clips."),
    ]
    request = GenerateChaptersRequest(
        request_id="generate_chapters-job-1",
        language="en",
        media_duration_seconds=90,
        segments=[
            _segment(1, 0, 20, units[0].text),
            _segment(2, 20, 40, units[1].text),
            _segment(3, 40, 60, units[2].text),
            _segment(4, 60, 80, units[3].text),
        ],
        options=GenerateChaptersOptions(
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
        boundary_evaluator=NoopChapterBoundaryEvaluationProvider(),
        title_provider=NoopChapterTitleProvider(),
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
    request = GenerateChaptersRequest(
        request_id="generate_chapters-job-2",
        language="en",
        media_duration_seconds=90,
        segments=[
            _segment(1, 0, 20, units[0].text),
            _segment(2, 20, 40, units[1].text),
            _segment(3, 40, 60, units[2].text),
            _segment(4, 60, 80, units[3].text),
        ],
        options=GenerateChaptersOptions(
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
        boundary_evaluator=NoopChapterBoundaryEvaluationProvider(),
        title_provider=NoopChapterTitleProvider(),
        config=_pipeline_config(context_seconds=20),
    )

    starts = [chapter.start_seconds for chapter in result.chapters]
    assert 40 in starts
    selected = next(
        chapter for chapter in result.chapters if chapter.start_seconds == 40
    )
    assert selected.scores is not None
    assert selected.scores.valley_depth_score is not None
    assert selected.scores.valley_depth_score > 0


def test_units_pipeline_detects_valley_after_embedding_semantic_scores() -> None:
    units = [
        _unit(1, 0, 20, "media workflow upload storage metadata"),
        _unit(2, 20, 40, "media workflow upload storage metadata"),
        _unit(3, 40, 60, "media workflow upload storage metadata"),
        _unit(4, 60, 80, "media workflow upload storage metadata"),
        _unit(5, 80, 100, "media workflow upload storage metadata"),
    ]
    request = GenerateChaptersRequest(
        request_id="generate_chapters-job-semantic-valley",
        language="en",
        media_duration_seconds=110,
        segments=[
            _segment(1, 0, 20, units[0].text),
            _segment(2, 20, 40, units[1].text),
            _segment(3, 40, 60, units[2].text),
            _segment(4, 60, 80, units[3].text),
            _segment(5, 80, 100, units[4].text),
        ],
        options=GenerateChaptersOptions(
            min_chapter_duration_seconds=10,
            target_chapter_duration_seconds=40,
            max_chapter_duration_seconds=80,
            max_chapters=3,
            use_embeddings=True,
            use_llm=False,
        ),
    )

    result = run_units_pipeline(
        request=request,
        units=units,
        embedding=_SequencedSemanticShiftEmbeddingProvider(
            shift_by_call=[0.0, 1.0, 0.0, 0.0]
        ),
        boundary_evaluator=NoopChapterBoundaryEvaluationProvider(),
        title_provider=NoopChapterTitleProvider(),
        config=_pipeline_config(context_seconds=20),
    )

    starts = [chapter.start_seconds for chapter in result.chapters]
    assert 40 in starts
    selected = next(
        chapter for chapter in result.chapters if chapter.start_seconds == 40
    )
    assert selected.scores is not None
    assert selected.scores.semantic_shift_score == 1.0
    assert selected.scores.valley_depth_score > 0


def test_units_pipeline_falls_back_to_all_gap_candidates_when_no_valleys_pass() -> None:
    units = [
        _unit(1, 0, 20, "database schema prisma users database queries"),
        _unit(2, 20, 40, "database relations prisma tables users queries"),
        _unit(3, 40, 60, "camera lighting lenses exposure framing shots"),
        _unit(4, 60, 80, "camera composition lenses lighting exposure scene"),
    ]
    request = GenerateChaptersRequest(
        request_id="generate_chapters-job-3",
        language="en",
        media_duration_seconds=90,
        segments=[
            _segment(1, 0, 20, units[0].text),
            _segment(2, 20, 40, units[1].text),
            _segment(3, 40, 60, units[2].text),
            _segment(4, 60, 80, units[3].text),
        ],
        options=GenerateChaptersOptions(
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
        boundary_evaluator=NoopChapterBoundaryEvaluationProvider(),
        title_provider=NoopChapterTitleProvider(),
        config=_pipeline_config(context_seconds=20, min_valley_depth=1.1),
    )

    starts = [chapter.start_seconds for chapter in result.chapters]
    assert starts[0] == 0
    assert len(starts) > 1
    assert set(starts[1:]).issubset({unit.start_time for unit in units[1:]})


def test_units_pipeline_uses_llm_evaluation_to_boost_candidate_selection() -> None:
    units = [
        _unit(1, 0, 20, "same topic words repeat"),
        _unit(2, 20, 40, "same topic words repeat"),
        _unit(3, 40, 60, "same topic words repeat"),
        _unit(4, 60, 80, "same topic words repeat"),
    ]

    result = run_units_pipeline(
        request=_pipeline_request(
            units,
            request_id="generate_chapters-job-llm-boost",
            use_llm=True,
        ),
        units=units,
        embedding=NoopTextEmbeddingProvider(),
        boundary_evaluator=_FakeBoundaryEvaluationProvider(
            [
                BoundaryEvaluation(
                    candidate_time=20,
                    is_chapter_boundary=True,
                    confidence=1.0,
                    transition_intent="CHANGE_TOPIC",
                    reason="Important shift.",
                )
            ]
        ),
        title_provider=NoopChapterTitleProvider(),
        config=_pipeline_config(context_seconds=20),
    )

    starts = [chapter.start_seconds for chapter in result.chapters]
    assert result.source == "LLM"
    assert starts[1] == 20
    assert result.chapters[1].scores.llm_confidence_score == 1.0


def test_units_pipeline_uses_llm_evaluation_to_suppress_false_candidate() -> None:
    units = [
        _unit(1, 0, 20, "introductory overview before marker"),
        _unit(2, 20, 40, "Next topic marker but still same content"),
        _unit(3, 40, 60, "different section with enough context"),
        _unit(4, 60, 80, "different section continues"),
    ]

    result = run_units_pipeline(
        request=_pipeline_request(
            units,
            request_id="generate_chapters-job-llm-suppress",
            use_llm=True,
        ),
        units=units,
        embedding=NoopTextEmbeddingProvider(),
        boundary_evaluator=_FakeBoundaryEvaluationProvider(
            [
                BoundaryEvaluation(
                    candidate_time=40,
                    is_chapter_boundary=False,
                    confidence=1.0,
                    transition_intent="CONTINUE_TOPIC",
                    reason="Marker is not a real chapter boundary.",
                )
            ]
        ),
        title_provider=NoopChapterTitleProvider(),
        config=_pipeline_config(context_seconds=20, min_valley_depth=1.1),
    )

    starts = [chapter.start_seconds for chapter in result.chapters]
    assert result.source == "LLM"
    assert starts[1] != 40


def test_units_pipeline_falls_back_when_llm_evaluation_provider_fails() -> None:
    units = [
        _unit(1, 0, 20, "same topic words repeat"),
        _unit(2, 20, 40, "same topic words repeat"),
        _unit(3, 40, 60, "same topic words repeat"),
        _unit(4, 60, 80, "same topic words repeat"),
    ]

    result = run_units_pipeline(
        request=_pipeline_request(
            units,
            request_id="generate_chapters-job-llm-fallback",
            use_llm=True,
        ),
        units=units,
        embedding=NoopTextEmbeddingProvider(),
        boundary_evaluator=_FailingBoundaryEvaluationProvider(),
        title_provider=NoopChapterTitleProvider(),
        config=_pipeline_config(context_seconds=20),
    )

    assert result.source == "RULE_BASED"
    assert all(
        chapter.scores.llm_confidence_score in (None, 0.0)
        for chapter in result.chapters
    )


def test_units_pipeline_applies_llm_titles_without_changing_boundaries() -> None:
    units = [
        _unit(1, 0, 20, "upload media and validate source files"),
        _unit(2, 20, 40, "transcript jobs and segment storage"),
        _unit(3, 40, 60, "chapter boundary scoring and ranking"),
        _unit(4, 60, 80, "clip publishing and platform export"),
    ]

    baseline = run_units_pipeline(
        request=_pipeline_request(
            units,
            request_id="generate_chapters-job-title-baseline",
            use_llm=False,
        ),
        units=units,
        embedding=NoopTextEmbeddingProvider(),
        boundary_evaluator=NoopChapterBoundaryEvaluationProvider(),
        title_provider=NoopChapterTitleProvider(),
        config=_pipeline_config(context_seconds=20),
    )
    result = run_units_pipeline(
        request=_pipeline_request(
            units,
            request_id="generate_chapters-job-title-llm",
            use_llm=True,
        ),
        units=units,
        embedding=NoopTextEmbeddingProvider(),
        boundary_evaluator=NoopChapterBoundaryEvaluationProvider(),
        title_provider=_FakeChapterTitleProvider(
            [
                ChapterTitleResult(
                    chapter_index=1,
                    title="Media Upload Setup",
                    summary="Prepare uploaded media for downstream AI work.",
                )
            ]
        ),
        config=_pipeline_config(context_seconds=20),
    )

    assert result.source == "LLM"
    assert [chapter.start_seconds for chapter in result.chapters] == [
        chapter.start_seconds for chapter in baseline.chapters
    ]
    assert result.chapters[0].title == "Media Upload Setup"
    assert (
        result.chapters[0].summary == "Prepare uploaded media for downstream AI work."
    )


def test_units_pipeline_ignores_invalid_llm_titles() -> None:
    units = [
        _unit(1, 0, 20, "upload media and validate source files"),
        _unit(2, 20, 40, "transcript jobs and segment storage"),
        _unit(3, 40, 60, "chapter boundary scoring and ranking"),
        _unit(4, 60, 80, "clip publishing and platform export"),
    ]

    result = run_units_pipeline(
        request=_pipeline_request(
            units,
            request_id="generate_chapters-job-title-invalid",
            use_llm=True,
        ),
        units=units,
        embedding=NoopTextEmbeddingProvider(),
        boundary_evaluator=NoopChapterBoundaryEvaluationProvider(),
        title_provider=_FakeChapterTitleProvider(
            [ChapterTitleResult(chapter_index=999, title="Invalid")]
        ),
        config=_pipeline_config(context_seconds=20),
    )

    assert result.source == "RULE_BASED"
    assert result.chapters[0].title != "Invalid"


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
) -> GenerateChaptersPipelineConfig:
    return GenerateChaptersPipelineConfig(
        strategy="segment",
        model_name="segment-generate-chapters-v1",
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
            semantic_weight=0.70,
        ),
        retention=CandidateRetentionConfig(
            min_limit=12,
            max_limit=40,
            multiplier=4,
            top_score_fraction=0.60,
        ),
        unit_repair=UnitRepairConfig(
            short_duration_seconds=4.0,
            min_words=8,
            fragment_max_words=2,
            sparse_duration_seconds=6.0,
            continuation_gap_seconds=0.05,
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
) -> GenerateChaptersTranscriptSegment:
    return GenerateChaptersTranscriptSegment(
        segment_id=f"seg_{index:04d}",
        start_seconds=start,
        end_seconds=end,
        text=text,
    )


def _pipeline_request(
    units: list[ChapterUnit],
    *,
    request_id: str,
    use_llm: bool,
) -> GenerateChaptersRequest:
    return GenerateChaptersRequest(
        request_id=request_id,
        language="en",
        media_duration_seconds=90,
        segments=[
            _segment(index, unit.start_time, unit.end_time, unit.text)
            for index, unit in enumerate(units, start=1)
        ],
        options=GenerateChaptersOptions(
            min_chapter_duration_seconds=10,
            target_chapter_duration_seconds=40,
            max_chapter_duration_seconds=80,
            max_chapters=3,
            use_embeddings=False,
            use_llm=use_llm,
        ),
    )


class _SequencedSemanticShiftEmbeddingProvider:
    def __init__(self, *, shift_by_call: list[float]) -> None:
        self._shift_by_call = shift_by_call

    @property
    def model_name(self) -> str:
        return "test-sequenced-embedding"

    @property
    def dimension(self) -> int:
        return 2

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        assert len(texts) == len(self._shift_by_call) * 2
        embeddings: list[list[float]] = []
        for shift in self._shift_by_call:
            if shift >= 1.0:
                embeddings.extend([[1.0, 0.0], [0.0, 1.0]])
            else:
                embeddings.extend([[1.0, 0.0], [1.0, 0.0]])

        return embeddings


class _FakeBoundaryEvaluationProvider:
    def __init__(self, evaluations: list[BoundaryEvaluation]) -> None:
        self.inputs: list[BoundaryEvaluationInput] = []
        self._evaluations = evaluations

    def evaluate_boundaries(
        self,
        inputs: list[BoundaryEvaluationInput],
    ) -> list[BoundaryEvaluation]:
        self.inputs = inputs
        return self._evaluations


class _FailingBoundaryEvaluationProvider:
    def evaluate_boundaries(
        self,
        inputs: list[BoundaryEvaluationInput],
    ) -> list[BoundaryEvaluation]:
        _ = inputs
        raise RuntimeError("provider failed")


class _FakeChapterTitleProvider:
    def __init__(self, results: list[ChapterTitleResult]) -> None:
        self.inputs: list[ChapterTitleInput] = []
        self._results = results

    def generate_titles(
        self,
        inputs: list[ChapterTitleInput],
    ) -> list[ChapterTitleResult]:
        self.inputs = inputs
        return self._results
