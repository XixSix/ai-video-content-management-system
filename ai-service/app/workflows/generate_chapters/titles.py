import re

from app.schemas.generate_chapters import GenerateChaptersTranscriptSegment
from app.workflows.generate_chapters.scores.normalize import collapse_whitespace

TITLE_MAX_LENGTH = 80
SUMMARY_MAX_LENGTH = 180


def chapter_text(segments: list[GenerateChaptersTranscriptSegment]) -> str:
    """Join transcript segment text for a chapter range."""
    return " ".join(
        segment.text.strip() for segment in segments if segment.text.strip()
    )


def chapter_title(text: str, index: int) -> str:
    """Build a stable fallback title from the first meaningful sentence."""
    cleaned = collapse_whitespace(text)
    if not cleaned:
        return f"Part {index}"

    first_sentence = re.split(r"(?<=[.!?。])\s+", cleaned, maxsplit=1)[0]
    title = first_sentence[:TITLE_MAX_LENGTH].strip()

    if len(first_sentence) > TITLE_MAX_LENGTH:
        title = f"{title.rstrip()}..."

    return title or f"Part {index}"


def chapter_summary(text: str) -> str | None:
    """Build a deterministic short summary from chapter text."""
    cleaned = collapse_whitespace(text)
    if not cleaned:
        return None

    summary = cleaned[:SUMMARY_MAX_LENGTH].strip()
    if len(cleaned) > SUMMARY_MAX_LENGTH:
        summary = f"{summary.rstrip()}..."

    return summary
