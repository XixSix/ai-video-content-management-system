from pathlib import Path
from types import SimpleNamespace

import pytest
import torch

from app.providers.audio import torchaudio_decoder
from app.providers.audio.torchaudio_decoder import TorchaudioAudioDecoder


def test_decode_accepts_torchaudio_info_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        torchaudio_decoder.torchaudio,
        "info",
        lambda path: SimpleNamespace(
            sample_rate=16_000,
            num_channels=1,
            num_frames=32_000,
        ),
        raising=False,
    )
    monkeypatch.setattr(
        torchaudio_decoder.torchaudio,
        "load",
        lambda path: (torch.tensor([[0.0, 0.5]], dtype=torch.float32), 16_000),
    )

    _decoder().decode(Path("audio.wav"))


def test_decode_rejects_unreadable_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_unreadable(path: Path) -> None:
        raise RuntimeError("not readable")

    monkeypatch.setattr(
        torchaudio_decoder.torchaudio,
        "info",
        raise_unreadable,
        raising=False,
    )

    with pytest.raises(ValueError, match="metadata is unreadable"):
        _decoder().decode(Path("audio.wav"))


def test_decode_returns_lightweight_metadata(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"audio")
    monkeypatch.setattr(
        torchaudio_decoder.torchaudio,
        "info",
        lambda path: SimpleNamespace(
            sample_rate=16_000,
            num_channels=1,
            num_frames=24_000,
        ),
        raising=False,
    )
    monkeypatch.setattr(
        torchaudio_decoder.torchaudio,
        "load",
        lambda path: (torch.tensor([[0.0, 0.5]], dtype=torch.float32), 16_000),
    )

    waveform = _decoder().decode(audio_path)

    assert waveform.source_name == "audio.wav"
    assert waveform.sample_rate == 16_000
    assert waveform.channels == 1
    assert waveform.duration_seconds == 2 / 16_000
    assert waveform.samples == (0.0, 0.5)


@pytest.mark.parametrize(
    ("sample_rate", "channels", "frame_count", "message"),
    [
        (7_999, 1, 1, "sample rate"),
        (16_000, 3, 1, "channel count"),
        (16_000, 1, 0, "no frames"),
    ],
)
def test_decode_rejects_unsupported_audio_metadata(
    sample_rate: int,
    channels: int,
    frame_count: int,
    message: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        torchaudio_decoder.torchaudio,
        "info",
        lambda path: SimpleNamespace(
            sample_rate=sample_rate,
            num_channels=channels,
            num_frames=frame_count,
        ),
        raising=False,
    )

    with pytest.raises(ValueError, match=message):
        _decoder().decode(Path("audio.wav"))


def _decoder() -> TorchaudioAudioDecoder:
    return TorchaudioAudioDecoder(
        min_sample_rate=8_000,
        max_sample_rate=192_000,
        supported_channels=(1, 2),
    )
