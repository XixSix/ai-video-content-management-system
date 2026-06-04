from app.workflows.chaptering.scores.common import clamp_score


def boundary_quality_score(
    left_text: str,
    right_text: str,
    *,
    min_context_text_chars: int,
) -> float:
    """Return context sufficiency score for both sides of a gap."""
    if min_context_text_chars <= 0:
        return 0.0

    return clamp_score(min(len(left_text), len(right_text)) / min_context_text_chars)
