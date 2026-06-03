import re
from dataclasses import dataclass

from nltk.tokenize.punkt import PunktSentenceTokenizer

from app.schemas.chaptering import ChapteringTranscriptSegment, ChapteringTranscriptWord
from app.workflows.chaptering.schemas import ChapterUnit
from app.workflows.chaptering.units import SENTENCE_END_RE


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
    target_unit_duration: float | None = None,
    target_unit_words: int | None = None,
    max_unit_words: int | None = None,
    max_unit_chars: int | None = None,
    sentence_tokenizer: PunktSentenceTokenizer | None = None,
) -> list[ChapterUnit]:
    """Build timeline units from word-level timestamps.

    Words are flattened from transcript segments and grouped into the same
    `ChapterUnit` shape used by the segment strategy. Unit boundaries are real
    word timestamp boundaries. Punkt sentence hints and punctuation can close a
    unit once it is near the target budget, while max duration, max word count,
    max text length, and long pauses remain deterministic cut points.

    Notes:
        The builder does not interpolate timestamps. If no valid word timestamps
        are available, callers should fall back to segment-based units.
    """
    words = _with_sentence_hints(
        _flatten_words(segments),
        sentence_tokenizer=sentence_tokenizer or PunktSentenceTokenizer(),
    )
    units: list[ChapterUnit] = []
    current: list[TimelineWord] = []
    target_duration = target_unit_duration or max_unit_duration

    for word in words:
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
            target_unit_duration=target_duration,
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


def has_usable_word_timestamps(segments: list[ChapteringTranscriptSegment]) -> bool:
    """Return true when at least one valid word timestamp is available."""
    return bool(_flatten_words(segments))


def _flatten_words(segments: list[ChapteringTranscriptSegment]) -> list[TimelineWord]:
    words: list[TimelineWord] = []

    for segment in segments:
        for index, word in enumerate(segment.words):
            timeline_word = _timeline_word(segment, word, index)
            if timeline_word is not None:
                words.append(timeline_word)

    return sorted(words, key=lambda word: (word.start_seconds, word.end_seconds))


def _timeline_word(
    segment: ChapteringTranscriptSegment,
    word: ChapteringTranscriptWord,
    index: int,
) -> TimelineWord | None:
    text = word.text.strip()
    if not text or word.start_seconds >= word.end_seconds:
        return None

    segment_id = word.segment_id or segment.segment_id
    return TimelineWord(
        word_id=word.word_id or f"{segment_id}_word_{index + 1}",
        segment_id=segment_id,
        start_seconds=word.start_seconds,
        end_seconds=word.end_seconds,
        text=text,
    )


def _with_sentence_hints(
    words: list[TimelineWord],
    *,
    sentence_tokenizer: PunktSentenceTokenizer,
) -> list[TimelineWord]:
    if not words:
        return words

    text, char_ends = _join_words_with_offsets(words)
    sentence_end_offsets = {
        end for _, end in sentence_tokenizer.span_tokenize(text) if end > 0
    }

    hinted_words: list[TimelineWord] = []
    for word, char_end in zip(words, char_ends, strict=True):
        hinted_words.append(
            TimelineWord(
                word_id=word.word_id,
                segment_id=word.segment_id,
                start_seconds=word.start_seconds,
                end_seconds=word.end_seconds,
                text=word.text,
                sentence_end_hint=(
                    char_end in sentence_end_offsets
                    or bool(SENTENCE_END_RE.search(word.text))
                ),
            )
        )

    return hinted_words


def _join_words_with_offsets(words: list[TimelineWord]) -> tuple[str, list[int]]:
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
    target_unit_duration: float,
    target_unit_words: int | None,
    max_unit_duration: float,
    max_unit_words: int | None,
    max_unit_chars: int | None,
) -> bool:
    text = _join_text(words)
    duration = words[-1].end_seconds - words[0].start_seconds
    word_count = len(words)

    if duration >= max_unit_duration:
        return True

    if max_unit_words is not None and word_count >= max_unit_words:
        return True

    if max_unit_chars is not None and len(text) >= max_unit_chars:
        return True

    target_reached = duration >= target_unit_duration or (
        target_unit_words is not None and word_count >= target_unit_words
    )
    if target_reached:
        return True

    return words[-1].sentence_end_hint and _is_near_target(
        duration=duration,
        word_count=word_count,
        target_unit_duration=target_unit_duration,
        target_unit_words=target_unit_words,
    )


def _is_near_target(
    *,
    duration: float,
    word_count: int,
    target_unit_duration: float,
    target_unit_words: int | None,
) -> bool:
    if duration >= target_unit_duration * 0.7:
        return True

    return target_unit_words is not None and word_count >= target_unit_words * 0.7


def _would_exceed_max_budget(
    words: list[TimelineWord],
    next_word: TimelineWord,
    *,
    max_unit_duration: float,
    max_unit_words: int | None,
    max_unit_chars: int | None,
) -> bool:
    candidate = [*words, next_word]
    text = _join_text(candidate)
    duration = candidate[-1].end_seconds - candidate[0].start_seconds

    if duration > max_unit_duration:
        return True

    if max_unit_words is not None and len(candidate) > max_unit_words:
        return True

    return max_unit_chars is not None and len(text) > max_unit_chars


def _starts_after_long_pause(
    previous: TimelineWord,
    current: TimelineWord,
    *,
    pause_boundary_seconds: float,
) -> bool:
    return current.start_seconds - previous.end_seconds >= pause_boundary_seconds


def _unit_from_words(index: int, words: list[TimelineWord]) -> ChapterUnit:
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
    seen: set[str] = set()
    segment_ids: list[str] = []

    for word in words:
        if word.segment_id in seen:
            continue
        seen.add(word.segment_id)
        segment_ids.append(word.segment_id)

    return segment_ids


def _join_text(words: list[TimelineWord]) -> str:
    return _normalize_text(" ".join(word.text for word in words if word.text.strip()))


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()
