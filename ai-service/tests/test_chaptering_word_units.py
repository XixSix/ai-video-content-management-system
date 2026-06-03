from app.schemas.chaptering import ChapteringTranscriptSegment, ChapteringTranscriptWord
from app.workflows.chaptering.word_units import (
    build_word_chapter_units,
    has_usable_word_timestamps,
)


def _segment(
    index: int,
    start: float,
    end: float,
    text: str,
    *,
    words: list[ChapteringTranscriptWord] | None = None,
) -> ChapteringTranscriptSegment:
    return ChapteringTranscriptSegment(
        segment_id=f"seg-{index}",
        start_seconds=start,
        end_seconds=end,
        text=text,
        words=words or [],
    )


def _word(
    index: int,
    segment_id: str,
    start: float,
    end: float,
    text: str,
    *,
    word_id: str | None = None,
) -> ChapteringTranscriptWord:
    return ChapteringTranscriptWord(
        word_id=word_id if word_id is not None else f"word-{index}",
        segment_id=segment_id,
        start_seconds=start,
        end_seconds=end,
        text=text,
    )


def test_build_word_chapter_units_groups_words_by_budget() -> None:
    units = build_word_chapter_units(
        [
            _segment(
                1,
                0,
                6,
                "one two three four five six",
                words=[
                    _word(1, "seg-1", 0, 0.5, "one"),
                    _word(2, "seg-1", 0.5, 1.0, "two"),
                    _word(3, "seg-1", 1.0, 1.5, "three"),
                    _word(4, "seg-1", 1.5, 2.0, "four"),
                    _word(5, "seg-1", 2.0, 2.5, "five"),
                    _word(6, "seg-1", 2.5, 3.0, "six"),
                ],
            )
        ],
        max_unit_duration=30,
        pause_boundary_seconds=2,
        target_unit_duration=30,
        target_unit_words=3,
        max_unit_words=5,
        max_unit_chars=1200,
    )

    assert [unit.text for unit in units] == ["one two three", "four five six"]
    assert units[0].start_time == 0
    assert units[0].end_time == 1.5
    assert units[0].segment_ids == ["seg-1"]


def test_build_word_chapter_units_breaks_on_word_pause() -> None:
    units = build_word_chapter_units(
        [
            _segment(
                1,
                0,
                8,
                "hook setup next idea",
                words=[
                    _word(1, "seg-1", 0, 0.5, "hook"),
                    _word(2, "seg-1", 0.5, 1.0, "setup"),
                    _word(3, "seg-1", 4.0, 4.5, "next"),
                    _word(4, "seg-1", 4.5, 5.0, "idea"),
                ],
            )
        ],
        max_unit_duration=30,
        pause_boundary_seconds=2,
        target_unit_duration=30,
        target_unit_words=10,
        max_unit_words=20,
        max_unit_chars=1200,
    )

    assert [unit.text for unit in units] == ["hook setup", "next idea"]
    assert units[1].start_time == 4.0


def test_build_word_chapter_units_preserves_ordered_segment_ids() -> None:
    units = build_word_chapter_units(
        [
            _segment(
                1,
                0,
                2,
                "first part",
                words=[
                    _word(1, "seg-1", 0, 0.5, "first"),
                    _word(2, "seg-1", 0.5, 1.0, "part"),
                ],
            ),
            _segment(
                2,
                2,
                4,
                "second part",
                words=[
                    _word(3, "seg-2", 2.0, 2.5, "second"),
                    _word(4, "seg-2", 2.5, 3.0, "part"),
                ],
            ),
        ],
        max_unit_duration=30,
        pause_boundary_seconds=2,
        target_unit_duration=30,
        target_unit_words=10,
        max_unit_words=20,
        max_unit_chars=1200,
    )

    assert len(units) == 1
    assert units[0].segment_ids == ["seg-1", "seg-2"]


def test_has_usable_word_timestamps_rejects_segment_only_input() -> None:
    assert not has_usable_word_timestamps(
        [_segment(1, 0, 2, "segment without word timestamps")]
    )


def test_has_usable_word_timestamps_rejects_words_without_identity() -> None:
    assert not has_usable_word_timestamps(
        [
            _segment(
                1,
                0,
                2,
                "words without identity",
                words=[
                    _word(1, "", 0, 0.5, "missing-segment"),
                    _word(2, "seg-1", 0.5, 1.0, "missing-word", word_id=""),
                ],
            )
        ]
    )
