import json
import re
import subprocess
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.schemas.media_preview.probe import MediaProbe
from app.schemas.transcribe.audio import AudioMetadata, AudioSanityResult


class FFmpegServiceError(Exception):
    pass


class FFmpegBinaryNotFoundError(FFmpegServiceError):
    pass


class FFmpegTimeoutError(FFmpegServiceError):
    pass


class FFmpegCommandError(FFmpegServiceError):
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

    def probe_media(self, media_path: Path) -> MediaProbe:
        """Read duration and stream availability for media preview processing."""
        command = [
            self.ffprobe_binary,
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_type,width,height,duration",
            "-of",
            "json",
            str(media_path),
        ]
        result = self._run(command)

        try:
            payload = json.loads(result.stdout or "{}")
        except json.JSONDecodeError as error:
            raise FFmpegCommandError("Invalid ffprobe JSON output") from error

        streams = payload.get("streams")

        if not isinstance(streams, list) or not streams:
            raise FFmpegCommandError("No media streams found")

        video_stream = next(
            (
                stream
                for stream in streams
                if isinstance(stream, dict) and stream.get("codec_type") == "video"
            ),
            None,
        )
        audio_stream = next(
            (
                stream
                for stream in streams
                if isinstance(stream, dict) and stream.get("codec_type") == "audio"
            ),
            None,
        )
        format_payload = payload.get("format")
        format_duration = (
            _to_float(format_payload.get("duration"))
            if isinstance(format_payload, dict)
            else None
        )
        stream_durations = [
            duration
            for stream in streams
            if isinstance(stream, dict)
            for duration in [_to_float(stream.get("duration"))]
            if duration is not None
        ]
        duration_seconds = format_duration or (
            max(stream_durations) if stream_durations else None
        )

        if duration_seconds is None or duration_seconds <= 0:
            raise FFmpegCommandError("Media duration is missing or invalid")

        return MediaProbe(
            duration_seconds=duration_seconds,
            has_video=video_stream is not None,
            has_audio=audio_stream is not None,
            width=_to_int(video_stream.get("width")) if video_stream else None,
            height=_to_int(video_stream.get("height")) if video_stream else None,
        )

    def extract_frame(
        self,
        media_path: Path,
        output_path: Path,
        *,
        timestamp_seconds: float,
        max_width: int | None = None,
        width: int | None = None,
        height: int | None = None,
    ) -> Path:
        """Extract one JPEG frame, optionally resized for thumbnail or sprite use."""
        output_path.parent.mkdir(parents=True, exist_ok=True)

        command = [
            self.ffmpeg_binary,
            "-y",
            "-ss",
            f"{max(0.0, timestamp_seconds):.6f}",
            "-i",
            str(media_path),
            "-frames:v",
            "1",
        ]

        if width is not None and height is not None:
            command.extend(
                [
                    "-vf",
                    (
                        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black"
                    ),
                ]
            )
        elif max_width is not None:
            command.extend(["-vf", f"scale=min({max_width}\\,iw):-2"])

        command.extend(["-q:v", "2", str(output_path)])
        self._run(command)
        _validate_non_empty_output(output_path)
        return output_path

    def extract_frames(
        self,
        media_path: Path,
        output_pattern: Path,
        *,
        frames_per_second: float,
        frame_count: int,
        width: int,
        height: int,
    ) -> list[Path]:
        """Extract evenly spaced, letterboxed JPEG frames in one FFmpeg process."""
        output_pattern.parent.mkdir(parents=True, exist_ok=True)
        filter_value = (
            f"fps={frames_per_second:.12f},"
            f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black"
        )
        command = [
            self.ffmpeg_binary,
            "-y",
            "-i",
            str(media_path),
            "-vf",
            filter_value,
            "-frames:v",
            str(frame_count),
            "-q:v",
            "3",
            str(output_pattern),
        ]
        self._run(command)
        frames = sorted(output_pattern.parent.glob("frame-*.jpg"))

        if len(frames) != frame_count:
            raise FFmpegCommandError(
                f"Expected {frame_count} sprite frames, generated {len(frames)}"
            )

        for frame in frames:
            _validate_non_empty_output(frame)

        return frames

    def extract_pcm_wav(
        self,
        media_path: Path,
        output_path: Path,
        *,
        sample_rate: int,
        duration_seconds: float | None = None,
    ) -> Path:
        """Extract mono signed 16-bit PCM WAV for waveform peak calculation."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        command = [
            self.ffmpeg_binary,
            "-y",
            "-i",
            str(media_path),
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(sample_rate),
            "-c:a",
            "pcm_s16le",
        ]

        if duration_seconds is not None:
            command.extend(["-t", f"{duration_seconds:.6f}"])

        command.append(str(output_path))
        self._run(command)
        _validate_non_empty_output(output_path)
        return output_path

    def render_short_clip(
        self,
        media_path: Path,
        output_path: Path,
        *,
        start_time: float,
        duration: float,
        aspect_ratio: str,
        subtitle_path: Path | None = None,
    ) -> Path:
        """Cut a source video into a rendered short clip with MVP crop settings."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        filters = [_video_filter_for_aspect_ratio(aspect_ratio)]

        if subtitle_path is not None:
            filters.append(f"subtitles={_escape_filter_path(subtitle_path)}")

        command = [
            self.ffmpeg_binary,
            "-y",
            "-ss",
            f"{max(0.0, start_time):.6f}",
            "-i",
            str(media_path),
            "-t",
            f"{max(0.1, duration):.6f}",
            "-vf",
            ",".join(filters),
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            str(output_path),
        ]
        self._run(command)
        _validate_non_empty_output(output_path)
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
            raise FFmpegBinaryNotFoundError(
                f"FFmpeg binary not found: {command[0]}"
            ) from error
        except subprocess.TimeoutExpired as error:
            raise FFmpegTimeoutError(
                f"Command timed out: {_command_name(command)}"
            ) from error
        except subprocess.CalledProcessError as error:
            message = error.stderr.strip() or error.stdout.strip() or str(error)
            raise FFmpegCommandError(
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

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_float(value: Any) -> float | None:
    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


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


def _video_filter_for_aspect_ratio(aspect_ratio: str) -> str:
    if aspect_ratio == "16:9":
        return "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080"

    if aspect_ratio == "1:1":
        return "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080"

    return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"


def _escape_filter_path(path: Path) -> str:
    return str(path).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def _validate_non_empty_output(output_path: Path) -> None:
    if not output_path.exists() or output_path.stat().st_size == 0:
        raise FFmpegCommandError(f"FFmpeg output is missing or empty: {output_path}")


ffmpeg_service = FFmpegService()
