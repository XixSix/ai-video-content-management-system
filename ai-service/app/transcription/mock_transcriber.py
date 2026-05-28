from dataclasses import dataclass
from pathlib import Path

MOCK_TRANSCRIBER_MODEL = "ai-service-mock-transcriber-v1"
MOCK_LANGUAGE_DEFAULT = "vi"


@dataclass(frozen=True)
class MockTranscriptSegment:
    segment_id: str
    start_seconds: float
    end_seconds: float
    text: str


@dataclass(frozen=True)
class MockTranscriptResult:
    language: str
    full_text: str
    segments: list[MockTranscriptSegment]
    asr_model: str = MOCK_TRANSCRIBER_MODEL
    diarization_model: str = ""
    source_separation_model: str = ""


class MockTranscriber:
    def transcribe(
        self,
        *,
        local_path: Path,
        language: str,
    ) -> MockTranscriptResult:
        """Return deterministic transcript text without running an ML model."""
        selected_language = MOCK_LANGUAGE_DEFAULT if language in {"", "auto"} else language
        filename = local_path.name
        segments = [
            MockTranscriptSegment(
                segment_id="seg-0001",
                start_seconds=0.0,
                end_seconds=5.0,
                text=f"Mock transcript generated for {filename}.",
            ),
            MockTranscriptSegment(
                segment_id="seg-0002",
                start_seconds=5.0,
                end_seconds=10.0,
                text="ai-service received audio from worker through gRPC.",
            ),
        ]
        full_text = " ".join(segment.text for segment in segments)

        return MockTranscriptResult(
            language=selected_language,
            full_text=full_text,
            segments=segments,
        )


mock_transcriber = MockTranscriber()
