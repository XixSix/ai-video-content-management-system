import json
import re
import subprocess
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.schemas.transcript.audio import AudioMetadata, AudioSanityResult


class FFmpegServiceError(Exception):
    pass


class AudioSanityError(Exception):
    def __init__(self, error_code: str, message: str) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}")


class FFmpegService:
    def __init__(
        self,
        *,
        ffmpeg_binary: str = settings.ffmpeg_binary,
        ffprobe_binary: str = settings.ffprobe_binary,
        timeout_seconds: int = settings.ffmpeg_timeout_seconds,
    ) -> None:
        self.ffmpeg_binary = ffmpeg_binary
        self.ffprobe_binary = ffprobe_binary
        self.timeout_seconds = timeout_seconds

    def extract_audio(
        self,
        video_path: Path,
        output_path: Path,
        *,
        sample_rate: int = settings.audio_sample_rate,
        channels: int = settings.audio_channels,
    ) -> Path:
        """Extract a normalized WAV audio track from a source media file."""
        output_path.parent.mkdir(parents=True, exist_ok=True)

        command = [
            self.ffmpeg_binary,
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-ac",
            str(channels),
            "-ar",
            str(sample_rate),
            "-c:a",
            "pcm_s16le",
            str(output_path),
        ]

        self._run(command)

        return output_path

    def probe_audio(self, audio_path: Path) -> AudioMetadata:
        """Read the first audio stream metadata with ffprobe."""
        command = [
            self.ffprobe_binary,
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=codec_name,sample_rate,channels,duration",
            "-of",
            "json",
            str(audio_path),
        ]

        result = self._run(command)
        payload = json.loads(result.stdout or "{}")
        stream = _first_stream(payload)

        return AudioMetadata(
            path=audio_path,
            duration_seconds=_to_float(stream.get("duration")),
            sample_rate=_to_int(stream.get("sample_rate")),
            channels=_to_int(stream.get("channels")),
            codec_name=stream.get("codec_name"),
        )

    def validate_audio(
        self,
        audio_path: Path,
        *,
        expected_sample_rate: int = settings.audio_sample_rate,
        expected_channels: int = settings.audio_channels,
        silence_threshold: float = 0.95,
    ) -> AudioSanityResult:
        """Validate extracted audio metadata and reject unusable audio files."""
        if not audio_path.exists() or audio_path.stat().st_size == 0:
            raise AudioSanityError(
                "AUDIO_EXTRACTION_EMPTY_OUTPUT",
                "Extracted audio file is missing or empty",
            )

        metadata = self.probe_audio(audio_path)
        silence_ratio = self.detect_silence_ratio(audio_path, metadata.duration_seconds)

        return validate_audio_sanity(
            audio_path,
            metadata=metadata,
            silence_ratio=silence_ratio,
            expected_sample_rate=expected_sample_rate,
            expected_channels=expected_channels,
            silence_threshold=silence_threshold,
        )

    def detect_silence_ratio(
        self, audio_path: Path, duration_seconds: float | None
    ) -> float:
        """Estimate how much of an audio file is silence using ffmpeg silencedetect."""
        if duration_seconds is None or duration_seconds <= 0:
            return 0.0

        command = [
            self.ffmpeg_binary,
            "-hide_banner",
            "-nostats",
            "-i",
            str(audio_path),
            "-af",
            "silencedetect=noise=-50dB:d=0.5",
            "-f",
            "null",
            "-",
        ]

        result = self._run(command)
        return parse_silence_ratio(result.stderr, duration_seconds)

    def _run(self, command: list[str]) -> subprocess.CompletedProcess[str]:
        """Run an FFmpeg command and normalize process failures."""
        try:
            return subprocess.run(
                command,
                capture_output=True,
                check=True,
                text=True,
                timeout=self.timeout_seconds,
            )
        except FileNotFoundError as error:
            raise FFmpegServiceError(
                f"FFmpeg binary not found: {command[0]}"
            ) from error
        except subprocess.TimeoutExpired as error:
            raise FFmpegServiceError(
                f"Command timed out: {_command_name(command)}"
            ) from error
        except subprocess.CalledProcessError as error:
            message = error.stderr.strip() or error.stdout.strip() or str(error)
            raise FFmpegServiceError(
                f"Command failed: {_command_name(command)}: {message}"
            ) from error


def _first_stream(payload: dict[str, Any]) -> dict[str, Any]:
    """Return the first ffprobe stream or raise a service error."""
    streams = payload.get("streams")

    if not isinstance(streams, list) or not streams:
        raise FFmpegServiceError("No audio stream found")

    stream = streams[0]

    if not isinstance(stream, dict):
        raise FFmpegServiceError("Invalid ffprobe audio stream")

    return stream


def _to_int(value: Any) -> int | None:
    if value is None:
        return None

    return int(value)


def _to_float(value: Any) -> float | None:
    if value is None:
        return None

    return float(value)


def parse_silence_ratio(stderr: str, duration_seconds: float) -> float:
    """Calculate the bounded silence ratio from ffmpeg silencedetect output."""
    if duration_seconds <= 0:
        return 0.0

    durations = [
        float(match) for match in re.findall(r"silence_duration:\s*([0-9.]+)", stderr)
    ]
    total_silence = sum(durations)

    return min(1.0, max(0.0, total_silence / duration_seconds))


def validate_audio_sanity(
    audio_path: Path,
    *,
    metadata: AudioMetadata,
    silence_ratio: float,
    expected_sample_rate: int,
    expected_channels: int,
    silence_threshold: float = 0.95,
) -> AudioSanityResult:
    """Validate audio extraction output against worker transcription requirements."""
    if not audio_path.exists() or audio_path.stat().st_size == 0:
        raise AudioSanityError(
            "AUDIO_EXTRACTION_EMPTY_OUTPUT", "Extracted audio file is missing or empty"
        )

    if metadata.duration_seconds is None or metadata.duration_seconds <= 0:
        raise AudioSanityError(
            "AUDIO_INVALID_DURATION", "Extracted audio duration is missing or invalid"
        )

    if metadata.sample_rate is None or metadata.sample_rate != expected_sample_rate:
        raise AudioSanityError(
            "AUDIO_INVALID_SAMPLE_RATE",
            f"Expected sample rate {expected_sample_rate}, got {metadata.sample_rate}",
        )

    if metadata.channels is None or metadata.channels != expected_channels:
        raise AudioSanityError(
            "AUDIO_INVALID_CHANNELS",
            f"Expected {expected_channels} channel(s), got {metadata.channels}",
        )

    if silence_ratio > silence_threshold:
        raise AudioSanityError("AUDIO_NO_SPEECH_DETECTED", "Audio is mostly silence")

    return AudioSanityResult(metadata=metadata, silence_ratio=silence_ratio)


def _command_name(command: list[str]) -> str:
    return Path(command[0]).name if command else "unknown"


ffmpeg_service = FFmpegService()
