from pathlib import Path
from collections.abc import Sequence

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
        enable_word_timestamps: bool = False,
    ) -> TranscriptResult:
        _ = enable_word_timestamps
        return self._build_result(
            label=local_path.name,
            language=language,
        )

    def transcribe_audio(
        self,
        *,
        samples: Sequence[float],
        sample_rate: int,
        language: str | None,
        enable_word_timestamps: bool = False,
    ) -> TranscriptResult:
        _ = sample_rate, enable_word_timestamps
        return self._build_result(
            label=f"{len(samples)} samples",
            language=language,
        )

    def _build_result(self, *, label: str, language: str | None) -> TranscriptResult:
        selected_language = (
            self._default_language if language in {None, ""} else language
        )
        text = f"Noop transcript placeholder for {label}."

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
