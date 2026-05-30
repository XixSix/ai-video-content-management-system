from uuid import UUID

from app.pipelines.chaptering.units import build_chapter_units
from app.schemas.chaptering.result import ChapteringTranscriptSegment


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
        _segment(1, start_time=0.0, end_time=1.5, text="Hôm nay mình sẽ nói về"),
        _segment(2, start_time=1.5, end_time=3.0, text="cách làm video ngắn."),
        _segment(3, start_time=3.2, end_time=5.0, text="Tiếp theo là ví dụ."),
    ]

    units = build_chapter_units(segments)

    assert [unit.text for unit in units] == [
        "Hôm nay mình sẽ nói về cách làm video ngắn.",
        "Tiếp theo là ví dụ.",
    ]
    assert units[0].start_time == 0.0
    assert units[0].end_time == 3.0
    assert units[0].segment_ids == [segments[0].id, segments[1].id]


def test_build_chapter_units_splits_on_long_pause() -> None:
    segments = [
        _segment(1, start_time=0.0, end_time=1.0, text="Phần này chưa kết thúc"),
        _segment(2, start_time=3.0, end_time=4.0, text="nhưng có khoảng nghỉ dài."),
    ]

    units = build_chapter_units(segments, pause_boundary_seconds=1.2)

    assert [unit.text for unit in units] == [
        "Phần này chưa kết thúc",
        "nhưng có khoảng nghỉ dài.",
    ]


def test_build_chapter_units_closes_overlong_unit() -> None:
    segments = [
        _segment(1, start_time=0.0, end_time=5.0, text="Một ý dài"),
        _segment(2, start_time=5.0, end_time=11.0, text="vẫn đang tiếp tục"),
        _segment(3, start_time=11.0, end_time=13.0, text="và kết thúc."),
    ]

    units = build_chapter_units(segments, max_unit_duration=10.0)

    assert [unit.text for unit in units] == [
        "Một ý dài vẫn đang tiếp tục",
        "và kết thúc.",
    ]


def test_build_chapter_units_uses_clean_text_when_available() -> None:
    segments = [
        _segment(
            1,
            start_time=0.0,
            end_time=1.0,
            text="  Xin   chào.",
            clean_text="xin chào",
        )
    ]

    units = build_chapter_units(segments)

    assert units[0].text == "Xin chào."
    assert units[0].clean_text == "xin chào"
