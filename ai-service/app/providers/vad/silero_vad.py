from __future__ import annotations

import numpy as np
import silero_vad
import torch

from app.provider_contracts.audio_decoder import AudioWaveform
from app.provider_contracts.vad import SpeechRegion


class SileroVad:
    def __init__(
        self,
        *,
        sample_rate: int,
        threshold: float,
        min_speech_duration_ms: int,
        min_silence_duration_ms: int,
        speech_pad_ms: int,
        use_onnx: bool,
    ) -> None:
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.min_speech_duration_ms = min_speech_duration_ms
        self.min_silence_duration_ms = min_silence_duration_ms
        self.speech_pad_ms = speech_pad_ms
        self.use_onnx = use_onnx
        self._model = None

    @property
    def model_name(self) -> str:
        return "silero-vad"

    def warm_up(self) -> None:
        silence = AudioWaveform(
            source_name="silence",
            sample_rate=self.sample_rate,
            channels=1,
            duration_seconds=0.5,
            samples=tuple(0.0 for _ in range(self.sample_rate // 2)),
        )
        self.detect_speech_regions(silence)

    def has_speech(self, audio: AudioWaveform) -> bool:
        return bool(self.detect_speech_regions(audio))

    def detect_speech_regions(self, audio: AudioWaveform) -> list[SpeechRegion]:
        samples = np.asarray(audio.samples, dtype=np.float32)
        if samples.size == 0:
            return []

        if audio.sample_rate != self.sample_rate:
            raise ValueError(
                f"Silero VAD expects {self.sample_rate} Hz audio, got {audio.sample_rate}"
            )

        output = self._run_pipeline(samples, self.sample_rate)
        if output is None:
            return []

        return _speech_regions_from_output(
            output,
            audio_size=samples.size,
        )

    def _run_pipeline(
        self, audio: np.ndarray, sample_rate: int
    ) -> list[dict[str, int]] | None:
        model = self._get_model()
        audio_tensor = torch.from_numpy(audio.astype(np.float32, copy=False))
        return silero_vad.get_speech_timestamps(
            audio_tensor,
            model,
            threshold=self.threshold,
            sampling_rate=sample_rate,
            min_speech_duration_ms=self.min_speech_duration_ms,
            min_silence_duration_ms=self.min_silence_duration_ms,
            speech_pad_ms=self.speech_pad_ms,
            return_seconds=False,
        )

    def _get_model(self):
        if self._model is None:
            self._model = silero_vad.load_silero_vad(onnx=self.use_onnx)

        return self._model


def _speech_regions_from_output(
    output: list[dict[str, int]],
    *,
    audio_size: int,
) -> list[SpeechRegion]:
    regions: list[SpeechRegion] = []
    for item in output:
        start_sample = max(0, int(item["start"]))
        end_sample = min(audio_size, int(item["end"]))
        if start_sample < end_sample:
            regions.append(
                SpeechRegion(
                    start_sample=start_sample,
                    end_sample=end_sample,
                )
            )

    return regions
