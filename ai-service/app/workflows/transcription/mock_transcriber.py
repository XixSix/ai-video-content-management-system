from pathlib import Path

from app.schemas.transcript import TranscriptResult, TranscriptSegmentResult

MOCK_TRANSCRIBER_MODEL = "ai-service-mock-transcriber-v1"
MOCK_LANGUAGE_DEFAULT = "vi"


class MockTranscriber:
    def transcribe(
        self,
        *,
        local_path: Path,
        language: str | None,
    ) -> TranscriptResult:
        """Return deterministic transcript text without running an ML model."""
        selected_language = (
            MOCK_LANGUAGE_DEFAULT if language in {None, "", "auto"} else language
        )
        filename = local_path.name
        segments = [
            TranscriptSegmentResult(
                segment_id="seg-0001",
                start_seconds=0.0,
                end_seconds=5.0,
                text=f"Mock transcript generated for {filename}.",
            ),
            TranscriptSegmentResult(
                segment_id="seg-0002",
                start_seconds=5.0,
                end_seconds=10.0,
                text="ai-service received audio from worker through gRPC.",
            ),
        ]
        full_text = " ".join(segment.text for segment in segments)

        return TranscriptResult(
            language=selected_language,
            full_text=full_text,
            segments=segments,
            asr_model=MOCK_TRANSCRIBER_MODEL,
        )

    @property
    def model_name(self) -> str:
        return MOCK_TRANSCRIBER_MODEL

    def warm_up(self) -> None:
        return None


mock_transcriber = MockTranscriber()
