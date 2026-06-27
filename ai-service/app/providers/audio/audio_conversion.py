from __future__ import annotations

import io
import wave

import numpy as np

SUPPORTED_ENCODINGS = {"pcm_s16le", "pcm_f32le", "wav"}


class AudioConversionError(ValueError):
    pass


def convert_audio_bytes_to_float32(
    *,
    audio_bytes: bytes,
    sample_rate: int,
    channels: int,
    encoding: str,
    wav_pcm_sample_width_bytes: int,
) -> tuple[np.ndarray, int]:
    """Convert supported audio bytes into mono float32 samples."""
    normalized_encoding = encoding.strip().lower()
    if normalized_encoding not in SUPPORTED_ENCODINGS:
        raise AudioConversionError(
            f"encoding must be one of {sorted(SUPPORTED_ENCODINGS)}"
        )

    if normalized_encoding == "wav":
        audio, wav_sample_rate, wav_channels = _wav_to_float32(
            audio_bytes,
            expected_sample_width_bytes=wav_pcm_sample_width_bytes,
        )
        return _to_mono(audio, wav_channels), wav_sample_rate

    _validate_pcm_payload(audio_bytes, sample_rate, channels, normalized_encoding)
    audio = (
        _pcm16_to_float32(audio_bytes)
        if normalized_encoding == "pcm_s16le"
        else _float32_from_bytes(audio_bytes)
    )
    return _to_mono(audio, channels), sample_rate


def _validate_pcm_payload(
    audio_bytes: bytes,
    sample_rate: int,
    channels: int,
    encoding: str,
) -> None:
    if sample_rate <= 0:
        raise AudioConversionError("sample_rate must be greater than 0")

    if channels <= 0:
        raise AudioConversionError("channels must be greater than 0")

    sample_size = 2 if encoding == "pcm_s16le" else 4
    if len(audio_bytes) % (channels * sample_size) != 0:
        raise AudioConversionError("payload size inconsistent with channel count")


def _wav_to_float32(
    audio_bytes: bytes,
    *,
    expected_sample_width_bytes: int,
) -> tuple[np.ndarray, int, int]:
    with wave.open(io.BytesIO(audio_bytes), "rb") as wav_file:
        channels = wav_file.getnchannels()
        sample_rate = wav_file.getframerate()
        sample_width = wav_file.getsampwidth()
        frames = wav_file.readframes(wav_file.getnframes())

    if sample_width != expected_sample_width_bytes:
        raise AudioConversionError(
            f"wav sample width must be {expected_sample_width_bytes} bytes"
        )

    if sample_width == 2:
        return _pcm16_to_float32(frames), sample_rate, channels

    raise AudioConversionError("unsupported wav sample width")


def _pcm16_to_float32(audio_bytes: bytes) -> np.ndarray:
    audio = np.frombuffer(audio_bytes, dtype="<i2")
    return (audio.astype(np.float32) / 32768.0).astype(np.float32, copy=False)


def _float32_from_bytes(audio_bytes: bytes) -> np.ndarray:
    audio = np.frombuffer(audio_bytes, dtype="<f4")
    return np.clip(audio.astype(np.float32, copy=False), -1.0, 1.0)


def _to_mono(audio: np.ndarray, channels: int) -> np.ndarray:
    if channels <= 0:
        raise AudioConversionError("channels must be greater than 0")

    if channels == 1:
        return audio.astype(np.float32, copy=False)

    if audio.size % channels != 0:
        raise AudioConversionError("audio length inconsistent with channel count")

    return audio.reshape(-1, channels).mean(axis=1).astype(np.float32, copy=False)
