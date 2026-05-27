from dataclasses import dataclass

from app.schemas.transcript.output import TranscriptJobOptions
from app.services.ffmpeg_service import AudioSanityResult

PLACEHOLDER_TRANSCRIBER_MODEL = "worker-placeholder-transcriber-v1"
PLACEHOLDER_TRANSCRIPT_SOURCE = "IMPORTED"


@dataclass(frozen=True)
class PlaceholderTranscriptSegment:
    start_time: float
    end_time: float
    text: str
    confidence: float | None = None
    speaker_label: str | None = None


@dataclass(frozen=True)
class PlaceholderTranscriptResult:
    language: str
    source: str
    model: str
    full_text: str
    segments: list[PlaceholderTranscriptSegment]
    word_count: int


class PlaceholderTranscriptionService:
    def transcribe(
        self,
        *,
        audio: AudioSanityResult,
        options: TranscriptJobOptions,
    ) -> PlaceholderTranscriptResult:
        duration = audio.metadata.duration_seconds or 1.0
        language = "vi" if options.language == "auto" else options.language
        midpoint = max(0.5, min(duration / 2, duration - 0.1))

        segments = [
            PlaceholderTranscriptSegment(
                start_time=0.0,
                end_time=round(midpoint, 3),
                text="Noi dung transcript dang duoc tao boi placeholder transcriber.",
                confidence=1.0,
            ),
            PlaceholderTranscriptSegment(
                start_time=round(midpoint, 3),
                end_time=round(duration, 3),
                text="Pipeline worker da xu ly source, audio va persistence thanh cong.",
                confidence=1.0,
            ),
        ]
        full_text = " ".join(segment.text for segment in segments)

        return PlaceholderTranscriptResult(
            language=language,
            source=PLACEHOLDER_TRANSCRIPT_SOURCE,
            model=PLACEHOLDER_TRANSCRIBER_MODEL,
            full_text=full_text,
            segments=segments,
            word_count=count_words(full_text),
        )


def count_words(text: str) -> int:
    return len([word for word in text.split() if word.strip()])


placeholder_transcription_service = PlaceholderTranscriptionService()
