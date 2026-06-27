from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

from app.providers.asr.faster_whisper_adapter import FasterWhisperAsr


def test_faster_whisper_adapter_maps_segments(
    monkeypatch,
    tmp_path: Path,
) -> None:
    model_calls: list[dict] = []

    class FakeWhisperModel:
        def __init__(self, *args, **kwargs) -> None:
            model_calls.append({"args": args, "kwargs": kwargs})

        def transcribe(self, audio, **kwargs):
            model_calls.append({"audio": audio, "kwargs": kwargs})
            segments = [
                SimpleNamespace(start=0.0, end=1.5, text=" Hello "),
                SimpleNamespace(start=1.5, end=3.0, text=" world "),
                SimpleNamespace(start=3.0, end=4.0, text=" "),
            ]
            info = SimpleNamespace(language="en")
            return iter(segments), info

    fake_module = ModuleType("faster_whisper")
    fake_module.WhisperModel = FakeWhisperModel
    monkeypatch.setitem(__import__("sys").modules, "faster_whisper", fake_module)

    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"wav")
    asr = FasterWhisperAsr(
        default_language="en",
        model_size="small",
        device="cpu",
        compute_type="int8",
        cpu_threads=2,
        num_workers=1,
        download_root=tmp_path / "models",
        local_files_only=True,
    )

    result = asr.transcribe(local_path=audio_path, language="auto")

    assert result.language == "en"
    assert result.full_text == "Hello world"
    assert result.asr_model == "small"
    assert len(result.segments) == 2
    assert result.segments[0].segment_id == "seg-0001"
    assert result.segments[0].start_seconds == 0.0
    assert result.segments[0].end_seconds == 1.5
    assert model_calls[0]["kwargs"]["device"] == "cpu"
    assert model_calls[0]["kwargs"]["compute_type"] == "int8"
    assert model_calls[0]["kwargs"]["local_files_only"] is True
    assert model_calls[1]["audio"] == str(audio_path)
    assert model_calls[1]["kwargs"]["language"] is None
    assert model_calls[1]["kwargs"]["vad_filter"] is False


def test_faster_whisper_adapter_uses_default_language(
    monkeypatch,
    tmp_path: Path,
) -> None:
    model_calls: list[dict] = []

    class FakeWhisperModel:
        def __init__(self, *args, **kwargs) -> None:
            return None

        def transcribe(self, audio, **kwargs):
            model_calls.append({"audio": audio, "kwargs": kwargs})
            segments = [SimpleNamespace(start=0.0, end=1.0, text=" hello ")]
            info = SimpleNamespace(language=None)
            return iter(segments), info

    fake_module = ModuleType("faster_whisper")
    fake_module.WhisperModel = FakeWhisperModel
    monkeypatch.setitem(__import__("sys").modules, "faster_whisper", fake_module)

    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"wav")
    asr = FasterWhisperAsr(
        default_language="en",
        model_size="small",
        device="cpu",
        compute_type="int8",
        cpu_threads=2,
        num_workers=1,
        download_root=None,
        local_files_only=False,
    )

    result = asr.transcribe(local_path=audio_path, language="")

    assert result.language == "en"
    assert model_calls[0]["kwargs"]["language"] == "en"


def test_faster_whisper_adapter_transcribes_audio_samples(
    monkeypatch,
    tmp_path: Path,
) -> None:
    model_calls: list[dict] = []

    class FakeWhisperModel:
        def __init__(self, *args, **kwargs) -> None:
            return None

        def transcribe(self, audio, **kwargs):
            model_calls.append({"audio": audio, "kwargs": kwargs})
            segments = [SimpleNamespace(start=0.0, end=0.5, text=" sample ")]
            info = SimpleNamespace(language="en")
            return iter(segments), info

    fake_module = ModuleType("faster_whisper")
    fake_module.WhisperModel = FakeWhisperModel
    monkeypatch.setitem(__import__("sys").modules, "faster_whisper", fake_module)

    asr = FasterWhisperAsr(
        default_language="en",
        model_size="small",
        device="cpu",
        compute_type="int8",
        cpu_threads=2,
        num_workers=1,
        download_root=tmp_path / "models",
        local_files_only=True,
    )

    result = asr.transcribe_audio(
        samples=(0.1, 0.2),
        sample_rate=16_000,
        language="en",
    )

    assert result.full_text == "sample"
    assert model_calls[0]["audio"].tolist() == pytest.approx([0.1, 0.2])
    assert model_calls[0]["kwargs"]["language"] == "en"
    assert model_calls[0]["kwargs"]["vad_filter"] is False
