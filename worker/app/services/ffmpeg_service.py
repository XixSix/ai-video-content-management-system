import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.core.config import settings


class FFmpegServiceError(Exception):
    pass


@dataclass(frozen=True)
class AudioMetadata:
    path: Path
    duration_seconds: float | None
    sample_rate: int | None
    channels: int | None
    codec_name: str | None


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

    def _run(self, command: list[str]) -> subprocess.CompletedProcess[str]:
        try:
            return subprocess.run(
                command,
                capture_output=True,
                check=True,
                text=True,
                timeout=self.timeout_seconds,
            )
        except subprocess.TimeoutExpired as error:
            raise FFmpegServiceError(f"Command timed out: {_command_name(command)}") from error
        except subprocess.CalledProcessError as error:
            message = error.stderr.strip() or error.stdout.strip() or str(error)
            raise FFmpegServiceError(f"Command failed: {_command_name(command)}: {message}") from error


def _first_stream(payload: dict[str, Any]) -> dict[str, Any]:
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


def _command_name(command: list[str]) -> str:
    return Path(command[0]).name if command else "unknown"


ffmpeg_service = FFmpegService()
