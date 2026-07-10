from app.workflows.generate_chapters.scores.common import clamp_score
from app.workflows.generate_chapters.scores.normalize import content_char_count


def boundary_quality_score(
    left_text: str,
    right_text: str,
    *,
    min_context_text_chars: int,
) -> float:
    """Return context sufficiency score for both sides of a gap."""
    if min_context_text_chars <= 0:
        return 0.0

    shorter_context_chars = min(
        content_char_count(left_text),
        content_char_count(right_text),
    )
    return clamp_score(shorter_context_chars / min_context_text_chars)
