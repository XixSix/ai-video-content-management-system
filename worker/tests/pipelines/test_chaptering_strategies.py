from uuid import UUID

from app.pipelines.chaptering import pipeline
from app.pipelines.chaptering.schemas import ChapterUnit
from app.pipelines.chaptering.strategies import candidate_chapter, rule_based_chapter
from app.schemas.chaptering.output import ChapteringJobOptions
from app.schemas.chaptering.result import (
    ChapteringResult,
    ChapteringTranscript,
    ChapteringTranscriptSegment,
)


def _segment(
    index: int,
    *,
    start_time: float,
    end_time: float,
    text: str = "Segment.",
) -> ChapteringTranscriptSegment:
    return ChapteringTranscriptSegment(
        id=UUID(f"00000000-0000-4000-8000-{index:012d}"),
        start_time=start_time,
        end_time=end_time,
        text=text,
    )


def _unit(index: int, *, start_time: float, end_time: float) -> ChapterUnit:
    return ChapterUnit(
        unit_id=f"unit_{index:04d}",
        start_time=start_time,
        end_time=end_time,
        text=f"Unit {index}.",
        clean_text=f"Unit {index}.",
        segment_ids=[UUID(f"00000000-0000-4000-8000-{index:012d}")],
    )


def _transcript() -> ChapteringTranscript:
    return ChapteringTranscript(
        id=UUID("00000000-0000-4000-8000-000000000101"),
        media_id=UUID("00000000-0000-4000-8000-000000000102"),
        language="en",
        version=1,
        media_duration=180.0,
        segments=[
            _segment(1, start_time=0.0, end_time=30.0),
            _segment(2, start_time=50.0, end_time=80.0),
            _segment(3, start_time=100.0, end_time=130.0),
        ],
    )


def _result(transcript: ChapteringTranscript) -> ChapteringResult:
    return ChapteringResult(
        transcript_id=transcript.id,
        transcript_version=transcript.version,
        source="RULE_BASED",
        model="rule-based-chaptering-v1",
        chapters=[],
    )


def test_generate_chapters_dispatches_to_rule_based_strategy(monkeypatch) -> None:
    transcript = _transcript()
    options = ChapteringJobOptions()
    calls: list[str] = []

    def generate_rule_based(
        received_transcript: ChapteringTranscript,
        received_options: ChapteringJobOptions,
    ) -> ChapteringResult:
        assert received_transcript is transcript
        assert received_options is options
        calls.append("rule_based")
        return _result(transcript)

    def generate_candidate(
        received_transcript: ChapteringTranscript,
        received_options: ChapteringJobOptions,
    ) -> ChapteringResult:
        calls.append("candidate")
        return _result(received_transcript)

    monkeypatch.setattr(pipeline.settings, "chaptering_pipeline_strategy", "rule_based")
    monkeypatch.setattr(pipeline, "generate_rule_based_chapters", generate_rule_based)
    monkeypatch.setattr(pipeline, "generate_candidate_chapters", generate_candidate)

    pipeline._generate_chapters_for_configured_strategy(transcript, options)

    assert calls == ["rule_based"]


def test_generate_chapters_dispatches_to_candidate_strategy(monkeypatch) -> None:
    transcript = _transcript()
    options = ChapteringJobOptions()
    calls: list[str] = []

    def generate_rule_based(
        received_transcript: ChapteringTranscript,
        received_options: ChapteringJobOptions,
    ) -> ChapteringResult:
        calls.append("rule_based")
        return _result(received_transcript)

    def generate_candidate(
        received_transcript: ChapteringTranscript,
        received_options: ChapteringJobOptions,
    ) -> ChapteringResult:
        assert received_transcript is transcript
        assert received_options is options
        calls.append("candidate")
        return _result(transcript)

    monkeypatch.setattr(pipeline.settings, "chaptering_pipeline_strategy", "candidate")
    monkeypatch.setattr(pipeline, "generate_rule_based_chapters", generate_rule_based)
    monkeypatch.setattr(pipeline, "generate_candidate_chapters", generate_candidate)

    pipeline._generate_chapters_for_configured_strategy(transcript, options)

    assert calls == ["candidate"]


def test_rule_based_strategy_uses_raw_segment_start_candidates(monkeypatch) -> None:
    captured: dict[str, list[float]] = {}

    def select_boundaries(
        segments: list[ChapteringTranscriptSegment],
        *,
        media_duration: float,
        min_duration: float,
        target_duration: float,
        max_chapters: int,
        candidate_times: list[float] | None = None,
    ) -> list[float]:
        captured["candidate_times"] = candidate_times or []
        return [0.0]

    monkeypatch.setattr(rule_based_chapter, "select_boundaries", select_boundaries)
    monkeypatch.setattr(
        rule_based_chapter,
        "build_chaptering_result",
        lambda transcript, options, duration, boundaries: _result(transcript),
    )

    rule_based_chapter.generate_rule_based_chapters(
        _transcript(),
        ChapteringJobOptions(
            min_chapter_duration=30.0,
            target_chapter_duration=60.0,
            max_chapters=3,
        ),
    )

    assert captured["candidate_times"] == [50.0, 100.0]


def test_candidate_strategy_uses_chapter_unit_start_candidates(monkeypatch) -> None:
    captured: dict[str, list[float]] = {}
    units = [
        _unit(1, start_time=0.0, end_time=30.0),
        _unit(2, start_time=50.0, end_time=80.0),
        _unit(3, start_time=100.0, end_time=130.0),
    ]

    def select_boundaries(
        segments: list[ChapteringTranscriptSegment],
        *,
        media_duration: float,
        min_duration: float,
        target_duration: float,
        max_chapters: int,
        candidate_times: list[float] | None = None,
    ) -> list[float]:
        captured["candidate_times"] = candidate_times or []
        return [0.0]

    monkeypatch.setattr(
        candidate_chapter,
        "build_chapter_units",
        lambda segments, *, max_unit_duration, pause_boundary_seconds: units,
    )
    monkeypatch.setattr(candidate_chapter, "select_boundaries", select_boundaries)
    monkeypatch.setattr(
        candidate_chapter,
        "build_chaptering_result",
        lambda transcript, options, duration, boundaries: _result(transcript),
    )

    candidate_chapter.generate_candidate_chapters(
        _transcript(),
        ChapteringJobOptions(
            min_chapter_duration=30.0,
            target_chapter_duration=60.0,
            max_chapters=3,
        ),
    )

    assert captured["candidate_times"] == [50.0, 100.0]
