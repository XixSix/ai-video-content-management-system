from app.schemas.chaptering import ChapteringTranscriptSegment
from app.workflows.chaptering.units import build_chapter_units


def _segment(
    index: int,
    start: float,
    end: float,
    text: str,
    *,
    clean_text: str | None = None,
) -> ChapteringTranscriptSegment:
    return ChapteringTranscriptSegment(
        segment_id=f"seg-{index}",
        start_seconds=start,
        end_seconds=end,
        text=text,
        clean_text=clean_text,
    )


def test_build_chapter_units_merges_split_sentence_until_punctuation() -> None:
    units = build_chapter_units(
        [
            _segment(1, 0, 4, "Today we talk about"),
            _segment(2, 4, 8, "how to make better videos."),
            _segment(3, 8, 12, "Now we move on."),
        ],
        max_unit_duration=30,
        pause_boundary_seconds=1,
        target_unit_duration=20,
        target_unit_words=80,
        max_unit_words=160,
        max_unit_chars=1200,
    )

    assert [unit.segment_ids for unit in units] == [["seg-1", "seg-2"], ["seg-3"]]
    assert units[0].start_time == 0
    assert units[0].end_time == 8
    assert units[0].text == "Today we talk about how to make better videos."


def test_build_chapter_units_breaks_on_long_pause() -> None:
    units = build_chapter_units(
        [
            _segment(1, 0, 6, "The setup continues without punctuation"),
            _segment(2, 9, 14, "The next idea starts here"),
        ],
        max_unit_duration=30,
        pause_boundary_seconds=2,
        target_unit_duration=20,
        target_unit_words=80,
        max_unit_words=160,
        max_unit_chars=1200,
    )

    assert [unit.segment_ids for unit in units] == [["seg-1"], ["seg-2"]]
    assert units[1].start_time == 9


def test_build_chapter_units_creates_pseudo_sentences_without_punctuation() -> None:
    units = build_chapter_units(
        [
            _segment(1, 0, 10, "today we talk about hooks"),
            _segment(2, 10, 20, "then we remove the dead space"),
            _segment(3, 20, 30, "now we talk about captions"),
        ],
        max_unit_duration=60,
        pause_boundary_seconds=2,
        target_unit_duration=20,
        target_unit_words=80,
        max_unit_words=160,
        max_unit_chars=1200,
    )

    assert [unit.segment_ids for unit in units] == [["seg-1", "seg-2"], ["seg-3"]]
    assert units[0].end_time == 20


def test_build_chapter_units_uses_word_budget_as_soft_boundary() -> None:
    units = build_chapter_units(
        [
            _segment(1, 0, 5, "one two three four"),
            _segment(2, 5, 10, "five six seven eight"),
            _segment(3, 10, 15, "nine ten"),
        ],
        max_unit_duration=60,
        pause_boundary_seconds=2,
        target_unit_duration=30,
        target_unit_words=80,
        max_unit_words=7,
        max_unit_chars=1200,
    )

    assert [unit.segment_ids for unit in units] == [["seg-1"], ["seg-2", "seg-3"]]


def test_build_chapter_units_preserves_single_overlong_segment() -> None:
    units = build_chapter_units(
        [
            _segment(
                1,
                0,
                90,
                "a very long asr segment without punctuation or word timestamps",
            )
        ],
        max_unit_duration=30,
        pause_boundary_seconds=2,
        target_unit_duration=20,
        target_unit_words=80,
        max_unit_words=160,
        max_unit_chars=1200,
    )

    assert len(units) == 1
    assert units[0].start_time == 0
    assert units[0].end_time == 90
    assert units[0].segment_ids == ["seg-1"]


def test_build_chapter_units_uses_clean_text_fallback_per_segment() -> None:
    units = build_chapter_units(
        [
            _segment(1, 0, 4, " noisy text ", clean_text="clean text"),
            _segment(2, 4, 8, "second sentence."),
        ],
        max_unit_duration=30,
        pause_boundary_seconds=1,
        target_unit_duration=20,
        target_unit_words=80,
        max_unit_words=160,
        max_unit_chars=1200,
    )

    assert units[0].text == "noisy text second sentence."
    assert units[0].clean_text == "clean text second sentence."
