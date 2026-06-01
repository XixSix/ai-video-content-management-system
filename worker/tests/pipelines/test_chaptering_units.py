from uuid import UUID

from app.pipelines.chaptering.units import build_chapter_units
from app.schemas.chaptering.result import ChapteringTranscriptSegment

MAX_UNIT_DURATION = 30.0
PAUSE_BOUNDARY_SECONDS = 1.2


def _segment(
    index: int,
    *,
    start_time: float,
    end_time: float,
    text: str,
    clean_text: str | None = None,
) -> ChapteringTranscriptSegment:
    return ChapteringTranscriptSegment(
        id=UUID(f"00000000-0000-4000-8000-{index:012d}"),
        start_time=start_time,
        end_time=end_time,
        text=text,
        clean_text=clean_text,
    )


def test_build_chapter_units_merges_split_sentence_segments() -> None:
    segments = [
        _segment(1, start_time=0.0, end_time=1.5, text="Today we will talk about"),
        _segment(2, start_time=1.5, end_time=3.0, text="making better short videos."),
        _segment(3, start_time=3.2, end_time=5.0, text="Next we look at an example."),
    ]

    units = build_chapter_units(
        segments,
        max_unit_duration=MAX_UNIT_DURATION,
        pause_boundary_seconds=PAUSE_BOUNDARY_SECONDS,
    )

    assert [unit.text for unit in units] == [
        "Today we will talk about making better short videos.",
        "Next we look at an example.",
    ]
    assert units[0].start_time == 0.0
    assert units[0].end_time == 3.0
    assert units[0].segment_ids == [segments[0].id, segments[1].id]


def test_build_chapter_units_splits_on_long_pause() -> None:
    segments = [
        _segment(1, start_time=0.0, end_time=1.0, text="This section is not finished"),
        _segment(2, start_time=3.0, end_time=4.0, text="but there is a long pause."),
    ]

    units = build_chapter_units(
        segments,
        max_unit_duration=MAX_UNIT_DURATION,
        pause_boundary_seconds=PAUSE_BOUNDARY_SECONDS,
    )

    assert [unit.text for unit in units] == [
        "This section is not finished",
        "but there is a long pause.",
    ]


def test_build_chapter_units_closes_overlong_unit() -> None:
    segments = [
        _segment(1, start_time=0.0, end_time=5.0, text="A long idea"),
        _segment(2, start_time=5.0, end_time=11.0, text="keeps going"),
        _segment(3, start_time=11.0, end_time=13.0, text="and then ends."),
    ]

    units = build_chapter_units(
        segments,
        max_unit_duration=10.0,
        pause_boundary_seconds=PAUSE_BOUNDARY_SECONDS,
    )

    assert [unit.text for unit in units] == [
        "A long idea keeps going",
        "and then ends.",
    ]


def test_build_chapter_units_uses_clean_text_when_available() -> None:
    segments = [
        _segment(
            1,
            start_time=0.0,
            end_time=1.0,
            text="  Hello   there.",
            clean_text="hello there",
        )
    ]

    units = build_chapter_units(
        segments,
        max_unit_duration=MAX_UNIT_DURATION,
        pause_boundary_seconds=PAUSE_BOUNDARY_SECONDS,
    )

    assert units[0].text == "Hello there."
    assert units[0].clean_text == "hello there"
