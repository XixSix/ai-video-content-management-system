from __future__ import annotations

import logging
from threading import Lock
from typing import Any

import numpy as np

from app.provider_contracts.audio_decoder import AudioWaveform
from app.provider_contracts.diarization import (
    DiarizedTurn,
    OfflineDiarizationAnalysis,
)
from app.provider_contracts.vad import SpeechRegion

logger = logging.getLogger(__name__)


class PyannoteCommunityDiarization:
    _pipeline_cache: dict[tuple[str, str, str], Any] = {}
    _pipeline_lock = Lock()

    def __init__(
        self,
        *,
        model_name: str,
        auth_token: str,
        device: str,
        pipeline: Any | None = None,
    ) -> None:
        self._model_name = model_name
        self._auth_token = auth_token
        self._device = device
        self._pipeline = pipeline
        self._pipeline_load_failed = False

    @property
    def model_name(self) -> str:
        return self._model_name

    def warm_up(self) -> None:
        silence = AudioWaveform(
            source_name="pyannote-warmup",
            sample_rate=16_000,
            channels=1,
            samples=tuple(0.0 for _ in range(8_000)),
        )
        self.analyze_offline_audio(silence)

    def analyze_offline_audio(
        self,
        audio: AudioWaveform,
    ) -> OfflineDiarizationAnalysis:
        """Run pyannote once and derive speech regions plus diarized turns.

        Notes:
            Speaker identities are intentionally not returned. The turns are
            only used to plan speaker-aware ASR windows.
        """
        if not audio.samples:
            return OfflineDiarizationAnalysis(speech_regions=[], turns=[])

        output = self._run_pipeline(audio)
        if output is None:
            return OfflineDiarizationAnalysis(speech_regions=[], turns=[])

        return OfflineDiarizationAnalysis(
            speech_regions=self._speech_regions_from_output(
                output,
                audio_size=len(audio.samples),
                sample_rate=audio.sample_rate,
            ),
            turns=self._diarized_turns_from_output(
                output,
                audio_size=len(audio.samples),
                sample_rate=audio.sample_rate,
            ),
        )

    def _run_pipeline(self, audio: AudioWaveform) -> Any | None:
        pipeline = self._get_pipeline()
        if pipeline is None:
            return None

        try:
            return pipeline(self._build_waveform_input(audio))
        except Exception as exc:
            logger.warning("pyannote_community_inference_failed error=%s", exc)
            return None

    def _get_pipeline(self) -> Any | None:
        if self._pipeline is not None:
            return self._pipeline

        if self._pipeline_load_failed:
            return None

        if not self._auth_token:
            logger.warning("pyannote_community_disabled reason=missing_auth_token")
            self._pipeline_load_failed = True
            return None

        cache_key = (self._model_name, self._auth_token, self._device or "")
        with self._pipeline_lock:
            cached = self._pipeline_cache.get(cache_key)
            if cached is not None:
                self._pipeline = cached
                return self._pipeline

            try:
                import torch
                from pyannote.audio import Pipeline

                try:
                    pipeline = Pipeline.from_pretrained(
                        self._model_name,
                        token=self._auth_token,
                    )
                except TypeError:
                    pipeline = Pipeline.from_pretrained(
                        self._model_name,
                        use_auth_token=self._auth_token,
                    )

                if self._device and hasattr(pipeline, "to"):
                    pipeline.to(torch.device(self._device))

                self._pipeline_cache[cache_key] = pipeline
                self._pipeline = pipeline
                return self._pipeline
            except Exception as exc:
                logger.warning("pyannote_community_load_failed error=%s", exc)
                self._pipeline_load_failed = True
                return None

    def _build_waveform_input(self, audio: AudioWaveform) -> dict[str, Any]:
        samples = np.asarray(audio.samples, dtype=np.float32)
        try:
            import torch

            waveform = torch.from_numpy(samples).unsqueeze(0)
            if self._device:
                waveform = waveform.to(torch.device(self._device))
        except Exception:
            waveform = np.asarray([samples], dtype=np.float32)

        return {"waveform": waveform, "sample_rate": audio.sample_rate}

    def _speech_regions_from_output(
        self,
        output: Any,
        *,
        audio_size: int,
        sample_rate: int,
    ) -> list[SpeechRegion]:
        regions: list[SpeechRegion] = []
        for start, end in self._iter_preferred_turn_bounds(output):
            start_sample = max(0, int(start * sample_rate))
            end_sample = min(audio_size, int(end * sample_rate))
            if end_sample > start_sample:
                regions.append(
                    SpeechRegion(
                        start_sample=start_sample,
                        end_sample=end_sample,
                    )
                )
        return regions

    def _diarized_turns_from_output(
        self,
        output: Any,
        *,
        audio_size: int,
        sample_rate: int,
    ) -> list[DiarizedTurn]:
        turns: list[DiarizedTurn] = []
        for start, end in self._iter_preferred_turn_bounds(output):
            start_sample = max(0, int(start * sample_rate))
            end_sample = min(audio_size, int(end * sample_rate))
            if end_sample > start_sample:
                turns.append(
                    DiarizedTurn(
                        start_sample=start_sample,
                        end_sample=end_sample,
                    )
                )
        return turns

    def _iter_preferred_turn_bounds(self, output: Any):
        diarization = (
            getattr(output, "exclusive_speaker_diarization", None)
            or getattr(output, "speaker_diarization", None)
            or output
        )

        if hasattr(diarization, "itertracks"):
            for segment, _track, _label in diarization.itertracks(yield_label=True):
                yield float(segment.start), float(segment.end)
            return

        if hasattr(diarization, "itersegments"):
            for segment in diarization.itersegments():
                yield float(segment.start), float(segment.end)
