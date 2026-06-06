import re

from app.schemas.chaptering import ChapteringTranscriptSegment
from app.workflows.chaptering.schemas import ChapterUnit
from app.workflows.chaptering.scores.normalize import collapse_whitespace

SENTENCE_END_RE = re.compile(r"[.!?。！？…]['\")\]]*$")  # Sentence-ending mark.
WORD_RE = re.compile(r"[^\W_]+", re.UNICODE)  # Unicode word chars except "_".


def build_segment_chapter_units(
    segments: list[ChapteringTranscriptSegment],
    *,
    max_unit_duration: float,
    pause_boundary_seconds: float,
    target_unit_duration: float,
    target_unit_words: int,
    max_unit_words: int,
    max_unit_chars: int,
    punctuation_poor_threshold: float = 0.15,
) -> list[ChapterUnit]:
    """Merge ASR segments into stable sentence-like timeline units.

    The builder skips empty segments, starts a new unit after a configured long
    pause, and closes units at real ASR segment boundaries. When punctuation is
    present, sentence endings are preferred. When punctuation is sparse, the
    builder creates pseudo-sentence units using target duration and word
    budgets. Maximum duration, word count, and character count are budget
    boundaries for merged segment buffers.

    Notes:
        This step builds workflow DTOs only. It does not mutate transcript text,
        invent punctuation, or split inside a long ASR segment without word-level
        timestamps.
    """
    units: list[ChapterUnit] = []
    current: list[ChapteringTranscriptSegment] = []
    non_empty_segments = [segment for segment in segments if segment.text.strip()]
    punctuation_poor = _is_punctuation_poor(
        non_empty_segments,
        threshold=punctuation_poor_threshold,
    )

    for segment in non_empty_segments:
        if current and _starts_after_long_pause(
            current[-1],
            segment,
            pause_boundary_seconds=pause_boundary_seconds,
        ):
            units.append(_unit_from_segments(len(units), current))
            current = []

        if current and _would_exceed_max_budget(
            current,
            segment,
            max_unit_duration=max_unit_duration,
            max_unit_words=max_unit_words,
            max_unit_chars=max_unit_chars,
        ):
            units.append(_unit_from_segments(len(units), current))
            current = []

        current.append(segment)

        if _should_flush_after_append(
            current,
            punctuation_poor=punctuation_poor,
            target_unit_duration=target_unit_duration,
            target_unit_words=target_unit_words,
            max_unit_duration=max_unit_duration,
            max_unit_words=max_unit_words,
            max_unit_chars=max_unit_chars,
        ):
            units.append(_unit_from_segments(len(units), current))
            current = []

    if current:
        units.append(_unit_from_segments(len(units), current))

    return units


def _should_flush_after_append(
    segments: list[ChapteringTranscriptSegment],
    *,
    punctuation_poor: bool,
    target_unit_duration: float,
    target_unit_words: int,
    max_unit_duration: float,
    max_unit_words: int,
    max_unit_chars: int,
) -> bool:
    """Return true when the current buffer should become a timeline unit."""
    text = _join_text(segments)
    duration = segments[-1].end_seconds - segments[0].start_seconds
    word_count = _word_count(text)

    if duration >= max_unit_duration:
        return True

    if max_unit_words and word_count >= max_unit_words:
        return True

    if max_unit_chars and len(text) >= max_unit_chars:
        return True

    if _has_sentence_end(text) and _is_near_target(
        duration=duration,
        word_count=word_count,
        target_unit_duration=target_unit_duration,
        target_unit_words=target_unit_words,
    ):
        return True

    if not punctuation_poor:
        return False

    if duration >= target_unit_duration:
        return True

    return bool(target_unit_words and word_count >= target_unit_words)


def _is_near_target(
    *,
    duration: float,
    word_count: int,
    target_unit_duration: float,
    target_unit_words: int,
) -> bool:
    """Return true when a sentence end is close enough to target budgets."""
    if duration >= target_unit_duration * 0.7:
        return True

    if target_unit_words and word_count >= target_unit_words * 0.7:
        return True

    return False


def _would_exceed_max_budget(
    segments: list[ChapteringTranscriptSegment],
    next_segment: ChapteringTranscriptSegment,
    *,
    max_unit_duration: float,
    max_unit_words: int,
    max_unit_chars: int,
) -> bool:
    """Return true when adding the next segment would exceed max budgets."""
    candidate = [*segments, next_segment]
    text = _join_text(candidate)
    duration = candidate[-1].end_seconds - candidate[0].start_seconds

    if duration > max_unit_duration:
        return True

    if max_unit_words and _word_count(text) > max_unit_words:
        return True

    return bool(max_unit_chars and len(text) > max_unit_chars)


def _starts_after_long_pause(
    previous: ChapteringTranscriptSegment,
    current: ChapteringTranscriptSegment,
    *,
    pause_boundary_seconds: float,
) -> bool:
    """Return true only when the current segment starts after a long pause."""
    return current.start_seconds - previous.end_seconds >= pause_boundary_seconds


def _is_punctuation_poor(
    segments: list[ChapteringTranscriptSegment],
    *,
    threshold: float,
) -> bool:
    """Return true when sentence-ending punctuation is sparse in the transcript."""
    if not segments:
        return False

    sentence_end_count = sum(
        1 for segment in segments if _has_sentence_end(segment.text)
    )
    return sentence_end_count / len(segments) < threshold


def _has_sentence_end(text: str) -> bool:
    """Return true when text ends with sentence punctuation."""
    return bool(SENTENCE_END_RE.search(text.strip()))


def _word_count(text: str) -> int:
    """Count word-like tokens with Unicode letters and numbers."""
    return len(WORD_RE.findall(text))


def _unit_from_segments(
    index: int,
    segments: list[ChapteringTranscriptSegment],
) -> ChapterUnit:
    return ChapterUnit(
        unit_id=f"unit_{index + 1:04d}",
        start_time=segments[0].start_seconds,
        end_time=segments[-1].end_seconds,
        text=_join_text(segments),
        clean_text=collapse_whitespace(
            " ".join(segment.clean_text or segment.text for segment in segments)
        ),
        segment_ids=[segment.segment_id for segment in segments],
    )


def _join_text(segments: list[ChapteringTranscriptSegment]) -> str:
    """Join raw segment text with normalized whitespace."""
    return collapse_whitespace(
        " ".join(segment.text.strip() for segment in segments if segment.text.strip())
    )
