from __future__ import annotations

import subprocess
import sys
import wave
from pathlib import Path
from uuid import uuid4


class SourceSeparationError(RuntimeError):
    pass


class DemucsSourceSeparator:
    def __init__(
        self,
        *,
        model_name: str,
        device: str,
        output_dir: Path,
        jobs: int,
        shifts: int,
        overlap: float,
    ) -> None:
        self._model_name = model_name
        self._device = device
        self._output_dir = output_dir
        self._jobs = jobs
        self._shifts = shifts
        self._overlap = overlap

    @property
    def model_name(self) -> str:
        return self._model_name

    def warm_up(self) -> None:
        """Run Demucs once on a short silence file to validate the CLI setup.

        Notes:
            The CLI provider starts a fresh process per separation request, so
            warm-up does not keep the model resident in the gRPC process. It
            does pre-download model weights and fails fast on bad CLI/device
            configuration.
        """
        warmup_path = self._output_dir / "_warmup" / "warmup.wav"
        self._write_warmup_audio(warmup_path)
        self.separate(warmup_path)

    def separate(self, local_path: Path) -> Path:
        """Separate vocals with the Demucs CLI and return the generated vocal stem.

        The provider runs Demucs in a subprocess so model loading and Torch audio
        state stay outside the gRPC process. Warnings emitted by Demucs are kept
        as stderr context; the call only fails on a non-zero exit code or when
        the expected vocals file is missing.

        Raises:
            SourceSeparationError: If Demucs fails or does not write vocals.wav.
        """
        call_output_dir = self._build_call_output_dir(local_path)
        call_output_dir.mkdir(parents=True, exist_ok=True)

        command = self._build_command(local_path, call_output_dir)
        completed = subprocess.run(
            command,
            capture_output=True,
            check=False,
            text=True,
        )
        if completed.returncode != 0:
            raise SourceSeparationError(
                "Demucs source separation failed: "
                f"exit_code={completed.returncode}; stderr={completed.stderr.strip()}"
            )

        vocals_path = (
            call_output_dir / self._model_name / local_path.stem / "vocals.wav"
        )
        if not vocals_path.is_file():
            raise SourceSeparationError(
                "Demucs source separation did not produce vocals.wav: "
                f"expected_path={vocals_path}; stderr={completed.stderr.strip()}"
            )

        return vocals_path

    def _build_call_output_dir(self, local_path: Path) -> Path:
        suffix = uuid4().hex
        return self._output_dir / f"{local_path.stem}-{suffix}"

    def _write_warmup_audio(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        sample_rate = 16_000
        duration_seconds = 0.5
        sample_count = int(sample_rate * duration_seconds)
        with wave.open(str(path), "wb") as audio_file:
            audio_file.setnchannels(1)
            audio_file.setsampwidth(2)
            audio_file.setframerate(sample_rate)
            audio_file.writeframes(b"\x00\x00" * sample_count)

    def _build_command(self, local_path: Path, output_dir: Path) -> list[str]:
        return [
            sys.executable,
            "-m",
            "demucs",
            "--two-stems=vocals",
            "-n",
            self._model_name,
            "--device",
            self._device,
            "-o",
            str(output_dir),
            "--jobs",
            str(self._jobs),
            "--shifts",
            str(self._shifts),
            "--overlap",
            str(self._overlap),
            str(local_path),
        ]
