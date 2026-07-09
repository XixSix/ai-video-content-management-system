import json
import math
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


@dataclass(frozen=True)
class FrameScore:
    path: Path
    timestamp_seconds: float
    brightness: float
    contrast: float
    sharpness: float
    brightness_balance: float
    score: float


def build_thumbnail_timestamps(
    duration_seconds: float,
    *,
    candidate_count: int,
) -> list[float]:
    """Return evenly spaced thumbnail candidate timestamps within useful video bounds."""
    if duration_seconds <= 0 or candidate_count <= 0:
        raise ValueError("Thumbnail duration and candidate count must be positive")

    return np.linspace(
        duration_seconds * 0.05,
        duration_seconds * 0.85,
        candidate_count,
    ).tolist()


def select_best_thumbnail(
    candidates: list[tuple[Path, float]],
    *,
    minimum_brightness: float = 20,
    maximum_brightness: float = 235,
) -> FrameScore:
    """Select the strongest thumbnail frame from extracted image candidates.

    The selector scores each frame by sharpness, contrast, and balanced
    brightness. It first ignores very dark or blown-out frames when possible,
    then falls back to all candidates if every frame is outside the preferred
    brightness range.
    """
    if not candidates:
        raise ValueError("At least one thumbnail candidate is required")

    raw_scores = [_measure_frame(path, timestamp) for path, timestamp in candidates]
    eligible = [
        score
        for score in raw_scores
        if minimum_brightness <= score.brightness <= maximum_brightness
    ]
    scored_candidates = eligible or raw_scores
    sharpness = _min_max([candidate.sharpness for candidate in scored_candidates])
    contrast = _min_max([candidate.contrast for candidate in scored_candidates])
    brightness = _min_max(
        [candidate.brightness_balance for candidate in scored_candidates]
    )
    final_scores: list[FrameScore] = []

    for index, candidate in enumerate(scored_candidates):
        final_scores.append(
            FrameScore(
                path=candidate.path,
                timestamp_seconds=candidate.timestamp_seconds,
                brightness=candidate.brightness,
                contrast=candidate.contrast,
                sharpness=candidate.sharpness,
                brightness_balance=candidate.brightness_balance,
                score=(
                    0.50 * sharpness[index]
                    + 0.25 * contrast[index]
                    + 0.25 * brightness[index]
                ),
            )
        )

    return max(final_scores, key=lambda candidate: candidate.score)


def save_thumbnail(
    source_path: Path,
    output_path: Path,
    *,
    max_width: int,
    jpeg_quality: int,
) -> Path:
    """Convert a selected frame to a bounded RGB JPEG thumbnail."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source_path) as image:
        image = image.convert("RGB")

        if image.width > max_width:
            height = max(1, round(image.height * max_width / image.width))
            image = image.resize(
                (max_width, height),
                Image.Resampling.LANCZOS,
            )

        image.save(
            output_path,
            format="JPEG",
            quality=jpeg_quality,
            optimize=True,
        )

    _validate_image(output_path)
    return output_path


def get_sprite_base_interval(duration_seconds: float) -> float:
    """Return the default frame interval for a thumbnail sprite duration."""
    if duration_seconds < 30 * 60:
        return 5.0
    if duration_seconds <= 2 * 60 * 60:
        return 10.0
    return 30.0


def build_sprite_timestamps(
    duration_seconds: float,
    *,
    minimum_frames: int,
    maximum_frames: int,
) -> tuple[list[float], float]:
    """Build evenly spaced frame timestamps for thumbnail sprite extraction.

    The frame count starts from a duration-based interval, then clamps into the
    configured minimum and maximum bounds. The returned effective interval is
    the exact spacing used for metadata and downstream sprite sheet playback.
    """
    if duration_seconds <= 0:
        raise ValueError("Sprite duration must be positive")
    if minimum_frames <= 0 or maximum_frames < minimum_frames:
        raise ValueError("Invalid sprite frame bounds")

    base_interval = get_sprite_base_interval(duration_seconds)
    base_count = max(1, math.ceil(duration_seconds / base_interval))
    frame_count = min(maximum_frames, max(minimum_frames, base_count))
    effective_interval = duration_seconds / frame_count
    timestamps = [index * effective_interval for index in range(frame_count)]
    return timestamps, effective_interval


def compose_sprite_sheets(
    frame_paths: list[Path],
    timestamps: list[float],
    output_dir: Path,
    *,
    columns: int,
    frames_per_sheet: int,
    frame_width: int,
    frame_height: int,
    jpeg_quality: int,
    effective_interval_seconds: float,
) -> list[tuple[Path, dict[str, int | float]]]:
    """Pack extracted frames into one or more JPEG sprite sheets.

    Frames are resized to the configured cell size, pasted row by row into each
    sheet, and paired with metadata describing frame indexes, time bounds, grid
    dimensions, and playback interval.
    """
    if len(frame_paths) != len(timestamps) or not frame_paths:
        raise ValueError("Sprite frames and timestamps must be non-empty and aligned")

    output_dir.mkdir(parents=True, exist_ok=True)
    sheet_count = math.ceil(len(frame_paths) / frames_per_sheet)
    outputs: list[tuple[Path, dict[str, int | float]]] = []

    for sheet_index in range(sheet_count):
        first_frame_index = sheet_index * frames_per_sheet
        sheet_frames = frame_paths[
            first_frame_index : first_frame_index + frames_per_sheet
        ]
        rows = math.ceil(len(sheet_frames) / columns)
        sheet = Image.new(
            "RGB",
            (columns * frame_width, rows * frame_height),
            color="black",
        )

        for local_index, frame_path in enumerate(sheet_frames):
            with Image.open(frame_path) as frame:
                frame = frame.convert("RGB")
                if frame.size != (frame_width, frame_height):
                    frame = frame.resize(
                        (frame_width, frame_height),
                        Image.Resampling.LANCZOS,
                    )
                x = (local_index % columns) * frame_width
                y = (local_index // columns) * frame_height
                sheet.paste(frame, (x, y))

        output_path = output_dir / f"sprite-{sheet_index:03d}.jpg"
        sheet.save(
            output_path,
            format="JPEG",
            quality=jpeg_quality,
            optimize=True,
        )
        _validate_image(output_path)
        last_frame_index = first_frame_index + len(sheet_frames) - 1
        outputs.append(
            (
                output_path,
                {
                    "sheetIndex": sheet_index,
                    "sheetCount": sheet_count,
                    "frameCount": len(sheet_frames),
                    "firstFrameIndex": first_frame_index,
                    "startTime": round(timestamps[first_frame_index], 6),
                    "endTime": round(timestamps[last_frame_index], 6),
                    "effectiveIntervalSeconds": round(effective_interval_seconds, 6),
                    "columns": columns,
                    "rows": rows,
                    "frameWidth": frame_width,
                    "frameHeight": frame_height,
                },
            )
        )

    return outputs


def build_waveform_payload(
    wav_path: Path,
    *,
    requested_bins_per_second: int,
    maximum_bins: int,
) -> dict[str, object]:
    """Convert a mono PCM WAV file into compact normalized waveform peaks.

    The payload stores max absolute sample amplitude per time bin as uint8-like
    values in the range 0..255, plus enough metadata for clients to render the
    waveform without reading the source audio.
    """
    with wave.open(str(wav_path), "rb") as wav_file:
        channels = wav_file.getnchannels()
        sample_width = wav_file.getsampwidth()
        sample_rate = wav_file.getframerate()
        frame_count = wav_file.getnframes()
        raw_samples = wav_file.readframes(frame_count)

    if channels != 1 or sample_width != 2 or sample_rate <= 0:
        raise ValueError("Waveform input must be mono signed 16-bit PCM")

    samples = np.frombuffer(raw_samples, dtype="<i2").astype(np.int32)

    if samples.size == 0:
        raise ValueError("Waveform input contains no samples")

    duration_seconds = samples.size / sample_rate
    requested_bin_count = max(
        1, math.ceil(duration_seconds * requested_bins_per_second)
    )
    bin_count = min(maximum_bins, requested_bin_count, samples.size)
    boundaries = np.linspace(0, samples.size, bin_count + 1, dtype=np.int64)
    absolute_samples = np.abs(samples)
    maxima = np.maximum.reduceat(absolute_samples, boundaries[:-1])
    peaks = np.rint(np.minimum(1.0, maxima / 32767.0) * 255.0).astype(np.uint8)

    return {
        "version": 1,
        "encoding": "uint8",
        "scale": 255,
        "durationSeconds": round(duration_seconds, 6),
        "sampleRate": sample_rate,
        "channels": channels,
        "requestedBinsPerSecond": requested_bins_per_second,
        "actualBinsPerSecond": round(bin_count / duration_seconds, 6),
        "binCount": bin_count,
        "peaks": peaks.tolist(),
    }


def write_compact_json(payload: dict[str, object], output_path: Path) -> Path:
    """Write minified JSON and verify that the output file is non-empty."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )

    if output_path.stat().st_size == 0:
        raise ValueError("Generated JSON output is empty")

    return output_path


def _measure_frame(path: Path, timestamp_seconds: float) -> FrameScore:
    """Measure brightness, contrast, and Laplacian sharpness for one frame."""
    with Image.open(path) as image:
        grayscale = np.asarray(image.convert("L"), dtype=np.float32)

    if grayscale.size == 0:
        raise ValueError(f"Thumbnail candidate is empty: {path}")

    brightness = float(grayscale.mean())
    contrast = float(grayscale.std())
    center = grayscale[1:-1, 1:-1]

    if center.size == 0:
        sharpness = 0.0
    else:
        laplacian = (
            -4 * center
            + grayscale[:-2, 1:-1]
            + grayscale[2:, 1:-1]
            + grayscale[1:-1, :-2]
            + grayscale[1:-1, 2:]
        )
        sharpness = float(laplacian.var())

    brightness_balance = max(0.0, 1.0 - abs(brightness - 127.5) / 127.5)
    return FrameScore(
        path=path,
        timestamp_seconds=timestamp_seconds,
        brightness=brightness,
        contrast=contrast,
        sharpness=sharpness,
        brightness_balance=brightness_balance,
        score=0.0,
    )


def _min_max(values: list[float]) -> list[float]:
    """Normalize values to 0..1, returning neutral scores for flat inputs."""
    minimum = min(values)
    maximum = max(values)

    if math.isclose(minimum, maximum):
        return [0.5 for _ in values]

    return [(value - minimum) / (maximum - minimum) for value in values]


def _validate_image(path: Path) -> None:
    """Raise when an image output is missing, empty, or unreadable."""
    if not path.exists() or path.stat().st_size == 0:
        raise ValueError(f"Generated image is missing or empty: {path}")

    with Image.open(path) as image:
        image.verify()
