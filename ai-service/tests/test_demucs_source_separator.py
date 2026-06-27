from pathlib import Path
import subprocess
import sys

import pytest

from app.providers.source_separation import demucs as demucs_module
from app.providers.source_separation.demucs import (
    DemucsSourceSeparator,
    SourceSeparationError,
)


def test_demucs_source_separator_runs_cli_and_returns_vocals(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    commands: list[list[str]] = []
    source = tmp_path / "input.mp3"
    source.write_bytes(b"audio")
    separator = _separator(tmp_path / "out")

    def fake_run(
        command: list[str],
        *,
        capture_output: bool,
        check: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        commands.append(command)
        assert capture_output is True
        assert check is False
        assert text is True
        output_dir = Path(command[command.index("-o") + 1])
        vocals_path = output_dir / "htdemucs" / "input" / "vocals.wav"
        vocals_path.parent.mkdir(parents=True)
        vocals_path.write_bytes(b"vocals")
        return subprocess.CompletedProcess(command, 0, "", "torchcodec warning")

    monkeypatch.setattr(demucs_module.subprocess, "run", fake_run)
    monkeypatch.setattr(demucs_module, "uuid4", lambda: _Uuid("abc123"))

    vocals_path = separator.separate(source)

    assert (
        vocals_path
        == tmp_path / "out" / "input-abc123" / "htdemucs" / "input" / "vocals.wav"
    )
    assert commands == [
        [
            sys.executable,
            "-m",
            "demucs",
            "--two-stems=vocals",
            "-n",
            "htdemucs",
            "--device",
            "cpu",
            "-o",
            str(tmp_path / "out" / "input-abc123"),
            "--jobs",
            "1",
            "--shifts",
            "0",
            "--overlap",
            "0.25",
            str(source),
        ]
    ]


def test_demucs_source_separator_warm_up_runs_cli_with_silence_file(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    commands: list[list[str]] = []
    separator = _separator(tmp_path / "out")

    def fake_run(
        command: list[str],
        *,
        capture_output: bool,
        check: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        _ = capture_output, check, text
        commands.append(command)
        source_path = Path(command[-1])
        output_dir = Path(command[command.index("-o") + 1])
        vocals_path = output_dir / "htdemucs" / source_path.stem / "vocals.wav"
        vocals_path.parent.mkdir(parents=True)
        vocals_path.write_bytes(b"vocals")
        return subprocess.CompletedProcess(command, 0, "", "")

    monkeypatch.setattr(demucs_module.subprocess, "run", fake_run)
    monkeypatch.setattr(demucs_module, "uuid4", lambda: _Uuid("warmup123"))

    separator.warm_up()

    warmup_path = tmp_path / "out" / "_warmup" / "warmup.wav"
    assert warmup_path.is_file()
    assert commands[0][-1] == str(warmup_path)
    assert commands[0][commands[0].index("-o") + 1] == str(
        tmp_path / "out" / "warmup-warmup123"
    )


def test_demucs_source_separator_raises_when_cli_fails(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = tmp_path / "input.mp3"
    source.write_bytes(b"audio")
    separator = _separator(tmp_path / "out")

    def fake_run(
        command: list[str],
        *,
        capture_output: bool,
        check: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        _ = capture_output, check, text
        return subprocess.CompletedProcess(command, 2, "", "boom")

    monkeypatch.setattr(demucs_module.subprocess, "run", fake_run)
    monkeypatch.setattr(demucs_module, "uuid4", lambda: _Uuid("abc123"))

    with pytest.raises(SourceSeparationError, match="exit_code=2"):
        separator.separate(source)


def test_demucs_source_separator_raises_when_vocals_missing(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = tmp_path / "input.mp3"
    source.write_bytes(b"audio")
    separator = _separator(tmp_path / "out")

    def fake_run(
        command: list[str],
        *,
        capture_output: bool,
        check: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(command, 0, "", "saved somewhere else")

    monkeypatch.setattr(demucs_module.subprocess, "run", fake_run)
    monkeypatch.setattr(demucs_module, "uuid4", lambda: _Uuid("abc123"))

    with pytest.raises(SourceSeparationError, match="did not produce vocals.wav"):
        separator.separate(source)


def _separator(output_dir: Path) -> DemucsSourceSeparator:
    return DemucsSourceSeparator(
        model_name="htdemucs",
        device="cpu",
        output_dir=output_dir,
        jobs=1,
        shifts=0,
        overlap=0.25,
    )


class _Uuid:
    def __init__(self, value: str) -> None:
        self.hex = value
