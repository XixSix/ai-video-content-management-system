import re
from dataclasses import dataclass

from nltk.tokenize.punkt import PunktSentenceTokenizer

from app.schemas.chaptering import ChapteringTranscriptSegment, ChapteringTranscriptWord
from app.workflows.chaptering.schemas import ChapterUnit


@dataclass(frozen=True)
class TimelineWord:
    """Store a word timestamp with chaptering-friendly metadata."""

    word_id: str
    segment_id: str
    start_seconds: float
    end_seconds: float
    text: str
    sentence_end_hint: bool = False


def build_word_chapter_units(
    segments: list[ChapteringTranscriptSegment],
    *,
    max_unit_duration: float,
    pause_boundary_seconds: float,
    target_unit_duration: float,
    target_unit_words: int,
    max_unit_words: int,
    max_unit_chars: int,
    sentence_tokenizer: PunktSentenceTokenizer | None = None,
) -> list[ChapterUnit]:
    """Build timeline units from word-level timestamps.

    The word strategy has three steps:
    1. Normalize valid word timestamps into a flat timeline.
    2. Run Punkt once over the full word stream to annotate sentence ends.
    3. Group words into units using sentence hints and timeline budgets.

    Notes:
        The builder does not interpolate timestamps or invent missing word
        metadata. If no valid word timestamps are available, callers should fall
        back to segment-based units.
    """
    timeline_words = _collect_timeline_words(segments)
    sentence_words = _annotate_sentence_boundaries(
        timeline_words,
        sentence_tokenizer=sentence_tokenizer or PunktSentenceTokenizer(),
    )
    return _group_words_into_units(
        sentence_words,
        max_unit_duration=max_unit_duration,
        pause_boundary_seconds=pause_boundary_seconds,
        target_unit_duration=target_unit_duration or max_unit_duration,
        target_unit_words=target_unit_words,
        max_unit_words=max_unit_words,
        max_unit_chars=max_unit_chars,
    )


def has_usable_word_timestamps(segments: list[ChapteringTranscriptSegment]) -> bool:
    """Return true when at least one valid word timestamp can enter the timeline."""
    return bool(_collect_timeline_words(segments))


def _collect_timeline_words(
    segments: list[ChapteringTranscriptSegment],
) -> list[TimelineWord]:
    """Collect valid transcript words into a timestamp-sorted timeline.

    Words without explicit `word_id` or `segment_id` are ignored here instead of
    receiving generated fallback metadata. The word pipeline only groups words
    whose timeline identity came from the ASR/provider output.
    """
    words: list[TimelineWord] = []

    for segment in segments:
        for word in segment.words:
            timeline_word = _normalize_word(word)
            if timeline_word is not None:
                words.append(timeline_word)

    return sorted(words, key=lambda word: (word.start_seconds, word.end_seconds))


def _normalize_word(word: ChapteringTranscriptWord) -> TimelineWord | None:
    """Trim and validate one ASR word before adding it to the timeline."""
    word_id = word.word_id.strip()
    segment_id = (word.segment_id or "").strip()
    text = word.text.strip()

    if not word_id or not segment_id:
        return None

    if not text or word.start_seconds >= word.end_seconds:
        return None

    return TimelineWord(
        word_id=word_id,
        segment_id=segment_id,
        start_seconds=word.start_seconds,
        end_seconds=word.end_seconds,
        text=text,
    )


def _annotate_sentence_boundaries(
    words: list[TimelineWord],
    *,
    sentence_tokenizer: PunktSentenceTokenizer,
) -> list[TimelineWord]:
    """Mark words that end a Punkt-detected sentence.

    The tokenizer runs once over the full joined word stream. Its sentence span
    end offsets are mapped back to the original word timestamps by character
    offset, so the later grouping step can close units at real word boundaries.
    """
    if not words:
        return words

    text, char_ends = _join_words_with_offsets(words)
    sentence_end_offsets = {
        end for _, end in sentence_tokenizer.span_tokenize(text) if end > 0
    }

    return [
        TimelineWord(
            word_id=word.word_id,
            segment_id=word.segment_id,
            start_seconds=word.start_seconds,
            end_seconds=word.end_seconds,
            text=word.text,
            sentence_end_hint=char_end in sentence_end_offsets,
        )
        for word, char_end in zip(words, char_ends, strict=True)
    ]


def _group_words_into_units(
    words: list[TimelineWord],
    *,
    max_unit_duration: float,
    pause_boundary_seconds: float,
    target_unit_duration: float,
    target_unit_words: int,
    max_unit_words: int,
    max_unit_chars: int,
) -> list[ChapterUnit]:
    """Group sentence-annotated words into chapter analysis units.

    Long pauses and max budgets close the current unit before adding the next
    word. After a word is appended, target budgets and sentence-end hints may
    close the unit. Every returned unit uses the first and last word timestamps;
    no interpolation is performed.
    """
    units: list[ChapterUnit] = []
    current: list[TimelineWord] = []

    for index, word in enumerate(words):
        if current and _starts_after_long_pause(
            current[-1],
            word,
            pause_boundary_seconds=pause_boundary_seconds,
        ):
            units.append(_unit_from_words(len(units), current))
            current = []

        if current and _would_exceed_max_budget(
            current,
            word,
            max_unit_duration=max_unit_duration,
            max_unit_words=max_unit_words,
            max_unit_chars=max_unit_chars,
        ):
            units.append(_unit_from_words(len(units), current))
            current = []

        current.append(word)

        if _should_flush_after_append(
            current,
            remaining_words=words[index + 1 :],
            pause_boundary_seconds=pause_boundary_seconds,
            target_unit_duration=target_unit_duration,
            target_unit_words=target_unit_words,
            max_unit_duration=max_unit_duration,
            max_unit_words=max_unit_words,
            max_unit_chars=max_unit_chars,
        ):
            units.append(_unit_from_words(len(units), current))
            current = []

    if current:
        units.append(_unit_from_words(len(units), current))

    return units


def _join_words_with_offsets(words: list[TimelineWord]) -> tuple[str, list[int]]:
    """Join words into text and return each word's ending character offset."""
    text_parts: list[str] = []
    char_ends: list[int] = []
    cursor = 0

    for index, word in enumerate(words):
        if index:
            text_parts.append(" ")
            cursor += 1

        text_parts.append(word.text)
        cursor += len(word.text)
        char_ends.append(cursor)

    return "".join(text_parts), char_ends


def _should_flush_after_append(
    words: list[TimelineWord],
    *,
    remaining_words: list[TimelineWord],
    pause_boundary_seconds: float,
    target_unit_duration: float,
    target_unit_words: int,
    max_unit_duration: float,
    max_unit_words: int,
    max_unit_chars: int,
) -> bool:
    """Return true when the current word buffer should become a unit."""
    text = _join_text(words)
    duration = words[-1].end_seconds - words[0].start_seconds
    word_count = len(words)

    if duration >= max_unit_duration:
        return True

    if max_unit_words and word_count >= max_unit_words:
        return True

    if max_unit_chars and len(text) >= max_unit_chars:
        return True

    if words[-1].sentence_end_hint and _is_near_target(
        duration=duration,
        word_count=word_count,
        target_unit_duration=target_unit_duration,
        target_unit_words=target_unit_words,
    ):
        return True

    target_reached = duration >= target_unit_duration or (
        target_unit_words and word_count >= target_unit_words
    )
    if not target_reached:
        return False

    return not _can_wait_for_sentence_hint(
        words,
        remaining_words=remaining_words,
        pause_boundary_seconds=pause_boundary_seconds,
        max_unit_duration=max_unit_duration,
        max_unit_words=max_unit_words,
        max_unit_chars=max_unit_chars,
    )


def _can_wait_for_sentence_hint(
    words: list[TimelineWord],
    *,
    remaining_words: list[TimelineWord],
    pause_boundary_seconds: float,
    max_unit_duration: float,
    max_unit_words: int,
    max_unit_chars: int,
) -> bool:
    """Return true when the next sentence hint can fit before hard boundaries."""
    candidate = list(words)

    for next_word in remaining_words:
        if _starts_after_long_pause(
            candidate[-1],
            next_word,
            pause_boundary_seconds=pause_boundary_seconds,
        ):
            return False

        if _would_exceed_max_budget(
            candidate,
            next_word,
            max_unit_duration=max_unit_duration,
            max_unit_words=max_unit_words,
            max_unit_chars=max_unit_chars,
        ):
            return False

        candidate.append(next_word)
        if next_word.sentence_end_hint:
            return True

    return False


def _is_near_target(
    *,
    duration: float,
    word_count: int,
    target_unit_duration: float,
    target_unit_words: int,
) -> bool:
    """Return true when a sentence hint is close enough to target budgets."""
    if duration >= target_unit_duration * 0.7:
        return True

    if target_unit_words and word_count >= target_unit_words * 0.7:
        return True

    return False


def _would_exceed_max_budget(
    words: list[TimelineWord],
    next_word: TimelineWord,
    *,
    max_unit_duration: float,
    max_unit_words: int,
    max_unit_chars: int,
) -> bool:
    """Return true when adding the next word would exceed hard budgets."""
    candidate = [*words, next_word]
    text = _join_text(candidate)
    duration = candidate[-1].end_seconds - candidate[0].start_seconds

    if duration > max_unit_duration:
        return True

    if max_unit_words and len(candidate) > max_unit_words:
        return True

    if max_unit_chars and len(text) > max_unit_chars:
        return True

    return False


def _starts_after_long_pause(
    previous: TimelineWord,
    current: TimelineWord,
    *,
    pause_boundary_seconds: float,
) -> bool:
    """Return true when two adjacent words are separated by a long pause."""
    return current.start_seconds - previous.end_seconds >= pause_boundary_seconds


def _unit_from_words(index: int, words: list[TimelineWord]) -> ChapterUnit:
    """Build a ChapterUnit from a non-empty word buffer."""
    text = _join_text(words)
    return ChapterUnit(
        unit_id=f"unit_{index + 1:04d}",
        start_time=words[0].start_seconds,
        end_time=words[-1].end_seconds,
        text=text,
        clean_text=text,
        segment_ids=_unique_segment_ids(words),
    )


def _unique_segment_ids(words: list[TimelineWord]) -> list[str]:
    """Return unique segment ids in first-seen word order."""
    seen: set[str] = set()
    segment_ids: list[str] = []

    for word in words:
        if word.segment_id in seen:
            continue
        seen.add(word.segment_id)
        segment_ids.append(word.segment_id)

    return segment_ids


def _join_text(words: list[TimelineWord]) -> str:
    """Join word text with normalized whitespace."""
    return _normalize_text(" ".join(word.text for word in words if word.text.strip()))


def _normalize_text(text: str) -> str:
    """Collapse repeated whitespace."""
    return re.sub(r"\s+", " ", text).strip()
