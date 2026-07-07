from dataclasses import dataclass

TRANSCRIPT_SOURCE_IMPORTED = "IMPORTED"


@dataclass(frozen=True)
class TranscriptSegmentResult:
    start_time: float
    end_time: float
    text: str
    confidence: float | None = None
    speaker_label: str | None = None


@dataclass(frozen=True)
class TranscriptResult:
    language: str
    source: str
    model: str
    full_text: str
    segments: list[TranscriptSegmentResult]
    word_count: int


def count_words(text: str) -> int:
    """Count non-empty whitespace-delimited words in transcript text."""
    return len([word for word in text.split() if word.strip()])
