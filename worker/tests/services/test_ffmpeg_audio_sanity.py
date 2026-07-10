from pathlib import Path

import pytest

from app.schemas.transcribe.audio import AudioMetadata
from app.services.ffmpeg_service import (
    FFmpegService,
    FFmpegServiceError,
    parse_silence_ratio,
    validate_audio_sanity,
)


def _write_audio_file(path: Path) -> Path:
    path.write_bytes(b"wav")
    return path


def _metadata(**overrides: object) -> AudioMetadata:
    values = {
        "path": Path("audio.wav"),
        "duration_seconds": 10.0,
        "sample_rate": 16000,
        "channels": 1,
        "codec_name": "pcm_s16le",
    }
    values.update(overrides)
    return AudioMetadata(**values)


def test_audio_sanity_accepts_valid_audio(tmp_path: Path) -> None:
    audio_path = _write_audio_file(tmp_path / "audio.wav")

    result = validate_audio_sanity(
        audio_path,
        metadata=_metadata(path=audio_path),
        silence_ratio=0.1,
        expected_sample_rate=16000,
        expected_channels=1,
    )

    assert result.silence_ratio == 0.1
    assert result.metadata.sample_rate == 16000


@pytest.mark.parametrize(
    ("metadata_overrides", "silence_ratio", "expected_code"),
    [
        ({"duration_seconds": None}, 0.1, "AUDIO_INVALID_DURATION"),
        ({"duration_seconds": 0.0}, 0.1, "AUDIO_INVALID_DURATION"),
        ({"sample_rate": 8000}, 0.1, "AUDIO_INVALID_SAMPLE_RATE"),
        ({"channels": 2}, 0.1, "AUDIO_INVALID_CHANNELS"),
        ({}, 0.96, "AUDIO_NO_SPEECH_DETECTED"),
    ],
)
def test_audio_sanity_rejects_invalid_metadata(
    tmp_path: Path,
    metadata_overrides: dict[str, object],
    silence_ratio: float,
    expected_code: str,
) -> None:
    audio_path = _write_audio_file(tmp_path / "audio.wav")

    with pytest.raises(FFmpegServiceError) as error:
        validate_audio_sanity(
            audio_path,
            metadata=_metadata(path=audio_path, **metadata_overrides),
            silence_ratio=silence_ratio,
            expected_sample_rate=16000,
            expected_channels=1,
        )

    assert error.value.error_code == expected_code


def test_audio_sanity_rejects_missing_or_empty_file(tmp_path: Path) -> None:
    missing_path = tmp_path / "missing.wav"

    with pytest.raises(FFmpegServiceError) as missing_error:
        validate_audio_sanity(
            missing_path,
            metadata=_metadata(path=missing_path),
            silence_ratio=0.1,
            expected_sample_rate=16000,
            expected_channels=1,
        )

    empty_path = tmp_path / "empty.wav"
    empty_path.touch()

    with pytest.raises(FFmpegServiceError) as empty_error:
        validate_audio_sanity(
            empty_path,
            metadata=_metadata(path=empty_path),
            silence_ratio=0.1,
            expected_sample_rate=16000,
            expected_channels=1,
        )

    assert missing_error.value.error_code == "AUDIO_EXTRACTION_EMPTY_OUTPUT"
    assert empty_error.value.error_code == "AUDIO_EXTRACTION_EMPTY_OUTPUT"


def test_parse_silence_ratio_sums_detected_durations() -> None:
    stderr = """
    [silencedetect @ 0x1] silence_duration: 2.5
    [silencedetect @ 0x1] silence_duration: 1.5
    """

    assert parse_silence_ratio(stderr, 10.0) == 0.4


def test_ffmpeg_binary_missing_has_clear_error() -> None:
    service = FFmpegService(ffmpeg_binary="definitely-missing-ffmpeg-binary")

    with pytest.raises(FFmpegServiceError, match="FFmpeg binary not found"):
        service._run(["definitely-missing-ffmpeg-binary", "-version"])
