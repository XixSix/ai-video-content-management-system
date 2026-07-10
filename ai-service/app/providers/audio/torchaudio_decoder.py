from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import torch
import torchaudio

from app.provider_contracts.audio_decoder import AudioWaveform


class TorchaudioAudioDecoder:
    def __init__(
        self,
        *,
        min_sample_rate: int,
        max_sample_rate: int,
        supported_channels: tuple[int, ...],
    ) -> None:
        self._min_sample_rate = min_sample_rate
        self._max_sample_rate = max_sample_rate
        self._supported_channels = set(supported_channels)

    def decode(self, local_path: Path) -> AudioWaveform:
        """Load, validate, and downmix audio for transcribe."""
        try:
            metadata = self._load_audio_metadata(local_path)
        except Exception as exc:
            raise ValueError(
                f"audio source metadata is unreadable: {local_path}"
            ) from exc

        sample_rate = int(metadata.sample_rate)
        channels = int(metadata.num_channels)
        frame_count = int(metadata.num_frames)

        self._validate_audio_file_metadata(
            sample_rate=sample_rate,
            channels=channels,
            frame_count=frame_count,
        )

        samples = self._load_mono_samples(local_path, sample_rate)

        return AudioWaveform(
            source_name=local_path.name,
            sample_rate=sample_rate,
            channels=1,
            duration_seconds=len(samples) / sample_rate if sample_rate else None,
            samples=samples,
        )

    def _load_audio_metadata(self, path: Path) -> Any:
        info = getattr(torchaudio, "info", None)

        if info is not None:
            return info(path)

        waveform, sample_rate = torchaudio.load(path)
        channels = int(waveform.shape[0]) if waveform.ndim >= 2 else 1
        frame_count = int(waveform.shape[-1]) if waveform.ndim >= 1 else 0
        return SimpleNamespace(
            sample_rate=sample_rate,
            num_channels=channels,
            num_frames=frame_count,
        )

    def _validate_audio_file_metadata(
        self,
        *,
        sample_rate: int,
        channels: int,
        frame_count: int,
    ) -> None:
        if sample_rate < self._min_sample_rate or sample_rate > self._max_sample_rate:
            raise ValueError(f"unsupported audio sample rate: {sample_rate}")

        if channels not in self._supported_channels:
            raise ValueError(f"unsupported audio channel count: {channels}")

        if frame_count <= 0:
            raise ValueError("audio source has no frames")

    def _load_mono_samples(self, path: Path, sample_rate: int) -> tuple[float, ...]:
        _ = sample_rate
        waveform, _loaded_sample_rate = torchaudio.load(path)

        waveform = waveform.to(torch.float32)
        if waveform.ndim == 1:
            mono = waveform
        else:
            mono = waveform.mean(dim=0)

        return tuple(float(value) for value in mono.tolist())
