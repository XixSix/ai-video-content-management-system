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
                "hook setup detail context. next idea detail context",
                words=[
                    _word(1, "seg-1", 0, 0.5, "hook"),
                    _word(2, "seg-1", 0.5, 1.0, "setup"),
                    _word(3, "seg-1", 1.0, 1.5, "detail"),
                    _word(4, "seg-1", 1.5, 2.0, "context."),
                    _word(5, "seg-1", 5.0, 5.5, "next"),
                    _word(6, "seg-1", 5.5, 6.0, "idea"),
                    _word(7, "seg-1", 6.0, 6.5, "detail"),
                    _word(8, "seg-1", 6.5, 7.0, "context"),
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

    assert [unit.text for unit in units] == [
        "hook setup detail context.",
        "next idea detail context",
    ]
    assert units[1].start_time == 5.0


def test_build_word_chapter_units_merges_micro_discourse_marker_forward() -> None:
    units = build_word_chapter_units(
        [
            _segment(
                1,
                0,
                6,
                "Intro complete. Now, next idea has useful context",
                words=[
                    _word(1, "seg-1", 0, 0.4, "Intro"),
                    _word(2, "seg-1", 0.8, 1.2, "complete."),
                    _word(3, "seg-1", 2.4, 2.7, "Now,"),
                    _word(4, "seg-1", 4.1, 4.5, "next"),
                    _word(5, "seg-1", 4.5, 4.9, "idea"),
                    _word(6, "seg-1", 4.9, 5.3, "has"),
                    _word(7, "seg-1", 5.3, 5.7, "useful"),
                    _word(8, "seg-1", 5.7, 6.1, "context"),
                ],
            )
        ],
        max_unit_duration=30,
        pause_boundary_seconds=1,
        target_unit_duration=30,
        target_unit_words=10,
        max_unit_words=20,
        max_unit_chars=1200,
    )

    assert [unit.text for unit in units] == [
        "Intro complete.",
        "Now, next idea has useful context",
    ]
    assert units[1].start_time == 2.4


def test_build_word_chapter_units_does_not_merge_micro_across_long_gap() -> None:
    units = build_word_chapter_units(
        [
            _segment(
                1,
                0,
                10,
                "OK. next idea has context",
                words=[
                    _word(1, "seg-1", 0, 0.4, "OK."),
                    _word(2, "seg-1", 6.0, 6.4, "next"),
                    _word(3, "seg-1", 6.4, 6.8, "idea"),
                    _word(4, "seg-1", 6.8, 7.2, "has"),
                    _word(5, "seg-1", 7.2, 7.6, "context"),
                ],
            )
        ],
        max_unit_duration=30,
        pause_boundary_seconds=1,
        target_unit_duration=30,
        target_unit_words=10,
        max_unit_words=20,
        max_unit_chars=1200,
    )

    assert [unit.text for unit in units] == ["OK.", "next idea has context"]


def test_build_word_chapter_units_keeps_final_micro_unit() -> None:
    units = build_word_chapter_units(
        [
            _segment(
                1,
                0,
                6,
                "main topic has enough context Thanks.",
                words=[
                    _word(1, "seg-1", 0, 0.5, "main"),
                    _word(2, "seg-1", 0.5, 1.0, "topic"),
                    _word(3, "seg-1", 1.0, 1.5, "has"),
                    _word(4, "seg-1", 1.5, 2.0, "enough"),
                    _word(5, "seg-1", 2.0, 2.5, "context"),
                    _word(6, "seg-1", 3.0, 3.4, "Thanks."),
                ],
            )
        ],
        max_unit_duration=30,
        pause_boundary_seconds=1,
        target_unit_duration=30,
        target_unit_words=5,
        max_unit_words=20,
        max_unit_chars=1200,
    )

    assert [unit.text for unit in units] == [
        "main topic has enough context",
        "Thanks.",
    ]


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
