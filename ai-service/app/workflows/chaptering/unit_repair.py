import re

from app.workflows.chaptering.schemas import ChapterUnit, UnitRepairConfig

WORD_RE = re.compile(r"[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?")
TERMINAL_PUNCTUATION = (".", "!", "?")
CONTINUATION_GAP_SECONDS = 0.05
TRANSITION_OPENER_RE = re.compile(
    r"^(?:"
    r"at(?:\s+number)?|"
    r"now|"
    r"so\s+those\s+are\s+all|"
    r"mobile\s+apps|"
    r"let'?s\s+talk|"
    r"and\s+number|"
    r"number|"
    r"first|"
    r"second|"
    r"third|"
    r"finally|"
    r"and\s+finally"
    r")\b",
    re.IGNORECASE,
)
BACKCHANNEL_RE = re.compile(
    r"^(?:ok(?:ay)?|yes|yeah|yep|no|nope|right|sure|correct|exactly|thanks?)"
    r"[\s.!?,]*$",
    re.IGNORECASE,
)


def repair_micro_units(
    units: list[ChapterUnit],
    *,
    max_unit_duration: float,
    max_unit_words: int,
    max_unit_chars: int,
    config: UnitRepairConfig,
) -> list[ChapterUnit]:
    """Merge tiny post-build units before scoring candidate boundaries.

    Timeline builders preserve timestamp boundaries from words or ASR segments.
    This pass only repairs units that are too short or sparse to provide useful
    boundary evidence, and only when the merged result stays within hard unit
    budgets.
    """
    repaired = list(units)
    index = 0

    while index < len(repaired):
        direction = _repair_direction(
            repaired,
            index,
            max_unit_duration=max_unit_duration,
            max_unit_words=max_unit_words,
            max_unit_chars=max_unit_chars,
            config=config,
        )

        if direction == "backward":
            repaired[index - 1] = _merge_units(repaired[index - 1], repaired[index])
            repaired.pop(index)
            index = max(index - 1, 0)
            continue

        if direction == "forward":
            repaired[index] = _merge_units(repaired[index], repaired[index + 1])
            repaired.pop(index + 1)
            continue

        index += 1

    return _renumber_units(repaired)


def _repair_direction(
    units: list[ChapterUnit],
    index: int,
    *,
    max_unit_duration: float,
    max_unit_words: int,
    max_unit_chars: int,
    config: UnitRepairConfig,
) -> str | None:
    """Choose the lowest-risk merge direction for one micro unit."""
    unit = units[index]
    if not _is_repairable_micro_unit(unit, config=config):
        return None

    can_merge_previous = index > 0 and _can_merge_units(
        units[index - 1],
        unit,
        max_unit_duration=max_unit_duration,
        max_unit_words=max_unit_words,
        max_unit_chars=max_unit_chars,
    )
    can_merge_next = index < len(units) - 1 and _can_merge_units(
        unit,
        units[index + 1],
        max_unit_duration=max_unit_duration,
        max_unit_words=max_unit_words,
        max_unit_chars=max_unit_chars,
    )

    if not can_merge_previous and not can_merge_next:
        return None

    if _looks_like_transition_opener(unit):
        if can_merge_next:
            return "forward"
        if can_merge_previous:
            return "backward"

    if _looks_like_previous_sentence_continuation(units, index):
        if can_merge_previous:
            return "backward"
        if can_merge_next:
            return "forward"

    if _looks_like_leading_fragment(unit):
        if can_merge_next:
            return "forward"
        if can_merge_previous:
            return "backward"

    if _looks_like_backchannel(unit):
        if can_merge_previous:
            return "backward"
        if can_merge_next:
            return "forward"

    if _has_terminal_punctuation(unit):
        if can_merge_previous:
            return "backward"
        if can_merge_next:
            return "forward"

    if can_merge_previous and can_merge_next:
        previous_gap = _gap_between(units[index - 1], unit)
        next_gap = _gap_between(unit, units[index + 1])
        return "backward" if previous_gap <= next_gap else "forward"

    return "backward" if can_merge_previous else "forward"


def _is_repairable_micro_unit(unit: ChapterUnit, *, config: UnitRepairConfig) -> bool:
    """Return true when a unit is too small or sparse for scoring."""
    duration = _unit_duration(unit)
    word_count = _unit_word_count(unit)

    if word_count <= config.fragment_max_words:
        return True

    if duration < config.short_duration_seconds:
        return True

    return duration < config.sparse_duration_seconds and word_count < config.min_words


def _looks_like_leading_fragment(unit: ChapterUnit) -> bool:
    """Return true for short fragments that should usually prefix the next unit."""
    text = unit.text.strip()
    return bool(text) and not text.endswith(TERMINAL_PUNCTUATION)


def _looks_like_transition_opener(unit: ChapterUnit) -> bool:
    """Return true for short transition markers that should prefix following text."""
    return bool(TRANSITION_OPENER_RE.match(_normalize_text(unit.text)))


def _looks_like_previous_sentence_continuation(
    units: list[ChapterUnit],
    index: int,
) -> bool:
    """Return true when a fragment continues an unfinished previous sentence."""
    if index <= 0:
        return False

    unit = units[index]
    previous = units[index - 1]
    text = unit.text.lstrip()
    if not text:
        return False

    return (
        not _has_terminal_punctuation(previous)
        and _gap_between(previous, unit) <= CONTINUATION_GAP_SECONDS
        and text[0].islower()
    )


def _looks_like_backchannel(unit: ChapterUnit) -> bool:
    """Return true for standalone acknowledgements with low topic signal."""
    return bool(BACKCHANNEL_RE.match(_normalize_text(unit.text)))


def _can_merge_units(
    left: ChapterUnit,
    right: ChapterUnit,
    *,
    max_unit_duration: float,
    max_unit_words: int,
    max_unit_chars: int,
) -> bool:
    """Return true when a merged unit still fits hard analysis budgets."""
    text = _normalize_text(f"{left.text} {right.text}")

    if right.end_time - left.start_time > max_unit_duration:
        return False

    if max_unit_words and len(WORD_RE.findall(text)) > max_unit_words:
        return False

    return not (max_unit_chars and len(text) > max_unit_chars)


def _merge_units(left: ChapterUnit, right: ChapterUnit) -> ChapterUnit:
    """Merge adjacent units while preserving source segment identity."""
    text = _normalize_text(f"{left.text} {right.text}")
    return ChapterUnit(
        unit_id=left.unit_id,
        start_time=left.start_time,
        end_time=right.end_time,
        text=text,
        clean_text=text,
        segment_ids=_unique_segment_ids(left.segment_ids, right.segment_ids),
    )


def _renumber_units(units: list[ChapterUnit]) -> list[ChapterUnit]:
    """Return units with stable sequential ids after repair merges."""
    return [
        ChapterUnit(
            unit_id=f"unit_{index + 1:04d}",
            start_time=unit.start_time,
            end_time=unit.end_time,
            text=unit.text,
            clean_text=unit.clean_text,
            segment_ids=unit.segment_ids,
        )
        for index, unit in enumerate(units)
    ]


def _unique_segment_ids(left_ids: list[str], right_ids: list[str]) -> list[str]:
    """Return unique segment ids in first-seen order."""
    seen: set[str] = set()
    segment_ids: list[str] = []

    for segment_id in [*left_ids, *right_ids]:
        if segment_id in seen:
            continue
        seen.add(segment_id)
        segment_ids.append(segment_id)

    return segment_ids


def _unit_duration(unit: ChapterUnit) -> float:
    return unit.end_time - unit.start_time


def _unit_word_count(unit: ChapterUnit) -> int:
    return len(WORD_RE.findall(unit.text))


def _gap_between(left: ChapterUnit, right: ChapterUnit) -> float:
    return right.start_time - left.end_time


def _has_terminal_punctuation(unit: ChapterUnit) -> bool:
    return unit.text.rstrip().endswith(TERMINAL_PUNCTUATION)


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()
