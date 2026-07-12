from __future__ import annotations

import numpy as np
import pyloudnorm as pyln
import torch
import torchaudio

from app.core.config import Settings, get_settings
from app.provider_contracts.audio_decoder import AudioWaveform


class AudioPreprocessingError(ValueError):
    pass


def _resample_linear(
    audio: np.ndarray,
    source_rate: int,
    target_rate: int,
    resamplers: dict[tuple[int, int], torchaudio.transforms.Resample],
) -> np.ndarray:
    if source_rate <= 0:
        raise AudioPreprocessingError("sample_rate must be greater than 0")

    if source_rate == target_rate or audio.size == 0:
        return audio.astype(np.float32, copy=False)

    resampler = resamplers.get((source_rate, target_rate))
    if resampler is None:
        resampler = torchaudio.transforms.Resample(
            orig_freq=source_rate,
            new_freq=target_rate,
        )
        resamplers[(source_rate, target_rate)] = resampler

    audio_tensor = torch.from_numpy(audio.astype(np.float32, copy=False)).unsqueeze(0)
    return resampler(audio_tensor).squeeze(0).numpy().astype(np.float32, copy=False)


def _normalize_loudness(
    audio: np.ndarray,
    target_sample_rate: int,
    *,
    target_loudness: float,
    min_loudness: float,
    min_normalize_seconds: float,
    enable_loudness_normalization: bool,
    loudness_meters: dict[int, pyln.Meter],
) -> np.ndarray:
    if not enable_loudness_normalization:
        return audio.astype(np.float32, copy=False)

    min_samples = int(target_sample_rate * min_normalize_seconds)
    if audio.size < min_samples:
        return audio.astype(np.float32, copy=False)

    audio = audio.astype(np.float32, copy=False)
    loudness = _get_loudness_meter(
        target_sample_rate,
        loudness_meters,
    ).integrated_loudness(audio)
    if not np.isfinite(loudness) or loudness <= min_loudness:
        return audio

    normalized = pyln.normalize.loudness(audio, loudness, target_loudness)
    return np.clip(normalized, -1.0, 1.0).astype(np.float32, copy=False)


def _get_loudness_meter(
    target_sample_rate: int,
    loudness_meters: dict[int, pyln.Meter],
) -> pyln.Meter:
    meter = loudness_meters.get(target_sample_rate)
    if meter is None:
        meter = pyln.Meter(target_sample_rate)
        loudness_meters[target_sample_rate] = meter
    return meter


def _normalize_peak(audio: np.ndarray, peak_ceiling: float) -> np.ndarray:
    if audio.size == 0:
        return audio.astype(np.float32, copy=False)

    peak = float(np.max(np.abs(audio)))
    if peak <= 0.0 or peak <= peak_ceiling:
        return audio.astype(np.float32, copy=False)

    return (audio / peak * peak_ceiling).astype(np.float32)


class AudioPreprocessor:
    def __init__(
        self,
        settings: Settings | None = None,
        *,
        enable_loudness_normalization: bool | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._enable_loudness_normalization = (
            self._settings.audio_enable_loudness_normalization
            if enable_loudness_normalization is None
            else enable_loudness_normalization
        )
        self._loudness_meters: dict[int, pyln.Meter] = {}
        self._resamplers: dict[tuple[int, int], torchaudio.transforms.Resample] = {}

    def preprocess(
        self,
        *,
        audio: AudioWaveform,
        target_sample_rate: int | None = None,
    ) -> AudioWaveform:
        # Convert to Numpy array
        samples = np.asarray(audio.samples, dtype=np.float32)
        target_rate = target_sample_rate or self._settings.audio_target_sample_rate

        # Resample using torchaudio
        samples = _resample_linear(
            samples,
            audio.sample_rate,
            target_rate,
            self._resamplers,
        )

        # Normalize loudness using pyloudnorm
        samples = _normalize_loudness(
            samples,
            target_rate,
            target_loudness=self._settings.audio_target_loudness,
            min_loudness=self._settings.audio_min_loudness,
            min_normalize_seconds=self._settings.audio_min_normalize_seconds,
            enable_loudness_normalization=self._enable_loudness_normalization,
            loudness_meters=self._loudness_meters,
        )

        # Normalize peak
        samples = _normalize_peak(samples, self._settings.audio_peak_ceiling)
        samples = np.ascontiguousarray(samples, dtype=np.float32)

        return audio.model_copy(
            update={
                "sample_rate": target_rate,
                "channels": 1,
                "duration_seconds": len(samples) / target_rate if target_rate else None,
                "samples": tuple(float(value) for value in samples.tolist()),
            }
        )
