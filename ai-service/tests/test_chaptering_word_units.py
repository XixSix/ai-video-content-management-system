from app.schemas.chaptering import ChapteringTranscriptSegment, ChapteringTranscriptWord
from app.workflows.chaptering.word_units import (
    TimelineWord,
    build_word_chapter_units,
    collect_timeline_words,
    has_sufficient_word_alignment_coverage,
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


def _timeline(
    segments: list[ChapteringTranscriptSegment],
) -> list[TimelineWord]:
    return collect_timeline_words(segments)


def test_build_word_chapter_units_groups_words_by_budget() -> None:
    units = build_word_chapter_units(
        _timeline(
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
            ]
        ),
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


def test_word_alignment_coverage_rejects_low_usable_word_count() -> None:
    segments = [
        _segment(
            1,
            0,
            6,
            "one two three four five",
            words=[
                _word(1, "seg-1", 0, 0.5, "one"),
                _word(2, "seg-1", 0.5, 1.0, "two"),
            ],
        )
    ]

    assert not has_sufficient_word_alignment_coverage(segments, _timeline(segments))


def test_word_alignment_coverage_accepts_threshold_usable_word_count() -> None:
    segments = [
        _segment(
            1,
            0,
            6,
            "one two three four five",
            words=[
                _word(1, "seg-1", 0, 0.5, "one"),
                _word(2, "seg-1", 0.5, 1.0, "two"),
                _word(3, "seg-1", 1.0, 1.5, "three"),
                _word(4, "seg-1", 1.5, 2.0, "four"),
                _word(5, "seg-1", 2.0, 2.0, "five"),
            ],
        )
    ]

    assert has_sufficient_word_alignment_coverage(segments, _timeline(segments))


def test_word_alignment_coverage_uses_clean_text_when_available() -> None:
    segment = _segment(
        1,
        0,
        6,
        "raw one two three four five",
        words=[
            _word(1, "seg-1", 0, 0.5, "edited"),
            _word(2, "seg-1", 0.5, 1.0, "one"),
            _word(3, "seg-1", 1.0, 1.5, "two"),
        ],
    )
    segment = segment.model_copy(update={"clean_text": "edited one two"})

    assert has_sufficient_word_alignment_coverage([segment], _timeline([segment]))


def test_build_word_chapter_units_waits_for_sentence_hint_after_target() -> None:
    units = build_word_chapter_units(
        _timeline(
            [
                _segment(
                    1,
                    0,
                    6,
                    "one two three four five six.",
                    words=[
                        _word(1, "seg-1", 0, 0.5, "one"),
                        _word(2, "seg-1", 0.5, 1.0, "two"),
                        _word(3, "seg-1", 1.0, 1.5, "three"),
                        _word(4, "seg-1", 1.5, 2.0, "four"),
                        _word(5, "seg-1", 2.0, 2.5, "five"),
                        _word(6, "seg-1", 2.5, 3.0, "six."),
                    ],
                )
            ]
        ),
        max_unit_duration=30,
        pause_boundary_seconds=2,
        target_unit_duration=30,
        target_unit_words=3,
        max_unit_words=10,
        max_unit_chars=1200,
    )

    assert [unit.text for unit in units] == ["one two three four five six."]


def test_build_word_chapter_units_breaks_on_word_pause() -> None:
    units = build_word_chapter_units(
        _timeline(
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
            ]
        ),
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


def test_build_word_chapter_units_keeps_pause_split_micro_unit() -> None:
    units = build_word_chapter_units(
        _timeline(
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
            ]
        ),
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
        _timeline(
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
                        _word(6, "seg-1", 4.0, 4.4, "Thanks."),
                    ],
                )
            ]
        ),
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
        _timeline(
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
            ]
        ),
        max_unit_duration=30,
        pause_boundary_seconds=2,
        target_unit_duration=30,
        target_unit_words=10,
        max_unit_words=20,
        max_unit_chars=1200,
    )

    assert len(units) == 1
    assert units[0].segment_ids == ["seg-1", "seg-2"]


def test_build_word_chapter_units_accepts_precollected_timeline_words() -> None:
    timeline_words = collect_timeline_words(
        [
            _segment(
                1,
                0,
                2,
                "one two",
                words=[
                    _word(1, "seg-1", 0, 0.5, "one"),
                    _word(2, "seg-1", 0.5, 1.0, "two"),
                ],
            )
        ]
    )

    units = build_word_chapter_units(
        timeline_words,
        max_unit_duration=30,
        pause_boundary_seconds=2,
        target_unit_duration=30,
        target_unit_words=10,
        max_unit_words=20,
        max_unit_chars=1200,
    )

    assert [unit.text for unit in units] == ["one two"]
    assert units[0].segment_ids == ["seg-1"]


def test_collect_timeline_words_rejects_segment_only_input() -> None:
    assert (
        collect_timeline_words([_segment(1, 0, 2, "segment without word timestamps")])
        == []
    )


def test_collect_timeline_words_rejects_words_without_identity() -> None:
    assert (
        collect_timeline_words(
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
        == []
    )
