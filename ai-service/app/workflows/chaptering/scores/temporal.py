from app.workflows.chaptering.scores.common import clamp_score


def pause_score(
    pause_seconds: float,
    *,
    long_pause_seconds: float,
    max_pause_score_seconds: float,
) -> float:
    """Return normalized pause strength for a gap."""
    if pause_seconds < long_pause_seconds:
        return 0.0

    return clamp_score(pause_seconds / max_pause_score_seconds)


def duration_sanity_score(
    time: float,
    *,
    media_duration: float,
    min_chapter_duration: float,
) -> float:
    """Return weak preference for gaps away from media edges."""
    if min_chapter_duration <= 0:
        return 0.0

    available_margin = min(time, media_duration - time)
    return clamp_score(available_margin / (min_chapter_duration * 2))
