import json
import wave
from pathlib import Path

import numpy as np
from PIL import Image

from app.pipelines.media_preview.algorithms import (
    build_sprite_timestamps,
    build_thumbnail_timestamps,
    build_waveform_payload,
    compose_sprite_sheets,
    select_best_thumbnail,
    write_compact_json,
)


def _save_grayscale(path: Path, values: np.ndarray) -> Path:
    Image.fromarray(values.astype(np.uint8), mode="L").save(path)
    return path


def test_thumbnail_sampling_uses_five_to_eighty_five_percent() -> None:
    timestamps = build_thumbnail_timestamps(100, candidate_count=12)

    assert len(timestamps) == 12
    assert timestamps[0] == 5
    assert timestamps[-1] == 85


def test_thumbnail_scoring_rejects_black_and_prefers_sharp_frame(
    tmp_path: Path,
) -> None:
    black = _save_grayscale(
        tmp_path / "black.png",
        np.zeros((32, 32), dtype=np.uint8),
    )
    soft = _save_grayscale(
        tmp_path / "soft.png",
        np.full((32, 32), 128, dtype=np.uint8),
    )
    checker = np.indices((32, 32)).sum(axis=0) % 2
    sharp = _save_grayscale(tmp_path / "sharp.png", checker * 255)

    selected = select_best_thumbnail(
        [(black, 1), (soft, 2), (sharp, 3)],
    )

    assert selected.path == sharp
    assert selected.timestamp_seconds == 3
    assert selected.sharpness > 0


def test_thumbnail_scoring_falls_back_when_all_frames_are_dark(
    tmp_path: Path,
) -> None:
    dark_a = _save_grayscale(
        tmp_path / "dark-a.png",
        np.full((8, 8), 5, dtype=np.uint8),
    )
    dark_b = _save_grayscale(
        tmp_path / "dark-b.png",
        np.full((8, 8), 10, dtype=np.uint8),
    )

    selected = select_best_thumbnail([(dark_a, 1), (dark_b, 2)])

    assert selected.path in {dark_a, dark_b}


def test_sprite_timestamps_apply_floor_and_never_reach_eof() -> None:
    timestamps, interval = build_sprite_timestamps(
        10,
        minimum_frames=20,
        maximum_frames=2000,
    )

    assert len(timestamps) == 20
    assert interval == 0.5
    assert timestamps[-1] < 10


def test_sprite_timestamps_apply_adaptive_interval_and_cap() -> None:
    medium, medium_interval = build_sprite_timestamps(
        60 * 60,
        minimum_frames=20,
        maximum_frames=2000,
    )
    capped, capped_interval = build_sprite_timestamps(
        100_000,
        minimum_frames=20,
        maximum_frames=2000,
    )

    assert len(medium) == 360
    assert medium_interval == 10
    assert len(capped) == 2000
    assert capped_interval == 50


def test_sprite_composition_splits_one_hundred_frames_per_sheet(
    tmp_path: Path,
) -> None:
    frames: list[Path] = []

    for index in range(101):
        path = tmp_path / f"frame-{index:03d}.jpg"
        Image.new("RGB", (2, 2), color=(index % 255, 0, 0)).save(path)
        frames.append(path)

    outputs = compose_sprite_sheets(
        frames,
        [float(index) for index in range(101)],
        tmp_path / "sheets",
        columns=10,
        frames_per_sheet=100,
        frame_width=2,
        frame_height=2,
        jpeg_quality=85,
        effective_interval_seconds=1,
    )

    assert len(outputs) == 2
    assert outputs[0][1]["frameCount"] == 100
    assert outputs[1][1]["frameCount"] == 1
    assert outputs[1][1]["sheetIndex"] == 1


def test_waveform_quantizes_pcm_to_uint8_and_writes_compact_json(
    tmp_path: Path,
) -> None:
    wav_path = tmp_path / "waveform.wav"
    samples = np.array(
        [0, 32767, -32768, 16384] * 5,
        dtype="<i2",
    )

    with wave.open(str(wav_path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(20)
        wav_file.writeframes(samples.tobytes())

    payload = build_waveform_payload(
        wav_path,
        requested_bins_per_second=20,
        maximum_bins=100_000,
    )
    output_path = write_compact_json(payload, tmp_path / "waveform.json")
    serialized = output_path.read_text(encoding="utf-8")

    assert payload["encoding"] == "uint8"
    assert payload["scale"] == 255
    assert payload["binCount"] == 20
    assert min(payload["peaks"]) == 0
    assert max(payload["peaks"]) == 255
    assert " " not in serialized
    assert json.loads(serialized) == payload
