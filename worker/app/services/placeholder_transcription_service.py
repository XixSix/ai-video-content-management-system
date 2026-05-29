from app.schemas.transcript.output import TranscriptJobOptions
from app.schemas.transcript.result import (
    TRANSCRIPT_SOURCE_IMPORTED,
    TranscriptResult,
    TranscriptSegmentResult,
    count_words,
)
from app.schemas.transcript.audio import AudioSanityResult

PLACEHOLDER_TRANSCRIBER_MODEL = "worker-placeholder-transcriber-v1"
PLACEHOLDER_TRANSCRIPT_SOURCE = TRANSCRIPT_SOURCE_IMPORTED


PlaceholderTranscriptSegment = TranscriptSegmentResult
PlaceholderTranscriptResult = TranscriptResult


class PlaceholderTranscriptionService:
    def transcribe(
        self,
        *,
        audio: AudioSanityResult,
        options: TranscriptJobOptions,
    ) -> PlaceholderTranscriptResult:
        """Create deterministic placeholder segments for a validated audio file."""
        duration = audio.metadata.duration_seconds or 1.0
        language = "vi" if options.language == "auto" else options.language
        midpoint = max(0.5, min(duration / 2, duration - 0.1))

        segments = [
            TranscriptSegmentResult(
                start_time=0.0,
                end_time=round(midpoint, 3),
                text="Noi dung transcript dang duoc tao boi placeholder transcriber.",
                confidence=1.0,
            ),
            TranscriptSegmentResult(
                start_time=round(midpoint, 3),
                end_time=round(duration, 3),
                text="Pipeline worker da xu ly source, audio va persistence thanh cong.",
                confidence=1.0,
            ),
        ]
        full_text = " ".join(segment.text for segment in segments)

        return TranscriptResult(
            language=language,
            source=PLACEHOLDER_TRANSCRIPT_SOURCE,
            model=PLACEHOLDER_TRANSCRIBER_MODEL,
            full_text=full_text,
            segments=segments,
            word_count=count_words(full_text),
        )

placeholder_transcription_service = PlaceholderTranscriptionService()
