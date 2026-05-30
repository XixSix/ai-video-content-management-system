import re

from app.schemas.chaptering.result import ChapteringTranscriptSegment

TITLE_MAX_LENGTH = 80
SUMMARY_MAX_LENGTH = 180


def chapter_text(segments: list[ChapteringTranscriptSegment]) -> str:
    """Join transcript segment text for a chapter range."""
    return " ".join(
        segment.text.strip() for segment in segments if segment.text.strip()
    )


def chapter_title(text: str, index: int) -> str:
    """Build a stable fallback title from the first meaningful sentence."""
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return f"Phần {index}"

    first_sentence = re.split(r"(?<=[.!?。])\s+", cleaned, maxsplit=1)[0]
    title = first_sentence[:TITLE_MAX_LENGTH].strip()

    if len(first_sentence) > TITLE_MAX_LENGTH:
        title = f"{title.rstrip()}..."

    return title or f"Phần {index}"


def chapter_summary(text: str) -> str | None:
    """Build a deterministic short summary from chapter text."""
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return None

    summary = cleaned[:SUMMARY_MAX_LENGTH].strip()
    if len(cleaned) > SUMMARY_MAX_LENGTH:
        summary = f"{summary.rstrip()}..."

    return summary
