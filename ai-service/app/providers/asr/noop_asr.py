from pathlib import Path

from app.schemas.transcript import TranscriptResult, TranscriptSegmentResult


class NoopAsr:
    def __init__(self, *, default_language: str = "en") -> None:
        self._default_language = default_language

    @property
    def model_name(self) -> str:
        return ""

    def warm_up(self) -> None:
        return None

    def transcribe(
        self,
        *,
        local_path: Path,
        language: str | None,
    ) -> TranscriptResult:
        selected_language = (
            self._default_language if language in {None, ""} else language
        )
        text = f"Noop transcript placeholder for {local_path.name}."

        return TranscriptResult(
            language=selected_language,
            full_text=text,
            segments=[
                TranscriptSegmentResult(
                    segment_id="seg-0001",
                    start_seconds=0.0,
                    end_seconds=1.0,
                    text=text,
                ),
            ],
            asr_model=self.model_name,
        )
