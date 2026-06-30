from __future__ import annotations

import logging
from pathlib import Path
from collections.abc import Sequence
from threading import Lock
from typing import Any

import numpy as np

from app.schemas.transcript import (
    TranscriptResult,
    TranscriptSegmentResult,
    TranscriptWordResult,
)

logger = logging.getLogger(__name__)


class FasterWhisperAsr:
    def __init__(
        self,
        *,
        default_language: str,
        model_size: str,
        device: str,
        compute_type: str,
        cpu_threads: int,
        num_workers: int,
        download_root: Path | None,
        local_files_only: bool,
    ) -> None:
        self._default_language = default_language
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type
        self._cpu_threads = cpu_threads
        self._num_workers = num_workers
        self._download_root = download_root
        self._local_files_only = local_files_only
        self._model: Any | None = None
        self._lock = Lock()

    @property
    def model_name(self) -> str:
        return self._model_size

    def warm_up(self) -> None:
        self._load_model()

    def transcribe(
        self,
        *,
        local_path: Path,
        language: str | None,
        enable_word_timestamps: bool = False,
    ) -> TranscriptResult:
        return self._transcribe_input(
            audio_input=str(local_path),
            language=language,
            enable_word_timestamps=enable_word_timestamps,
        )

    def transcribe_audio(
        self,
        *,
        samples: Sequence[float],
        sample_rate: int,
        language: str | None,
        enable_word_timestamps: bool = False,
    ) -> TranscriptResult:
        if sample_rate != 16_000:
            raise ValueError("faster-whisper audio samples must be 16000 Hz")

        return self._transcribe_input(
            audio_input=np.asarray(samples, dtype=np.float32),
            language=language,
            enable_word_timestamps=enable_word_timestamps,
        )

    def _transcribe_input(
        self,
        *,
        audio_input: Any,
        language: str | None,
        enable_word_timestamps: bool,
    ) -> TranscriptResult:
        model = self._load_model()
        selected_language = _selected_language(language, self._default_language)
        requested_language = _language_for_faster_whisper(selected_language)
        segments, info = model.transcribe(
            audio_input,
            language=requested_language,
            vad_filter=False,
            word_timestamps=enable_word_timestamps,
        )
        segment_results: list[TranscriptSegmentResult] = []
        word_index = 0
        for segment in segments:
            segment_text = segment.text.strip()
            if not segment_text:
                continue

            words: list[TranscriptWordResult] = []
            if enable_word_timestamps:
                for word in getattr(segment, "words", None) or ():
                    word_text = str(getattr(word, "word", "")).strip()
                    start = getattr(word, "start", None)
                    end = getattr(word, "end", None)
                    if not word_text or start is None or end is None:
                        continue

                    word_index += 1
                    probability = getattr(word, "probability", None)
                    words.append(
                        TranscriptWordResult(
                            word_id=f"word-{word_index:06d}",
                            start_seconds=float(start),
                            end_seconds=float(end),
                            text=word_text,
                            confidence=(
                                float(probability) if probability is not None else None
                            ),
                        )
                    )

            segment_results.append(
                TranscriptSegmentResult(
                    segment_id=f"seg-{len(segment_results) + 1:04d}",
                    start_seconds=float(segment.start),
                    end_seconds=float(segment.end),
                    text=segment_text,
                    words=words,
                )
            )
        full_text = " ".join(segment.text for segment in segment_results)
        detected_language = (
            getattr(info, "language", None)
            or selected_language
            or self._default_language
        )

        return TranscriptResult(
            language=detected_language,
            full_text=full_text,
            segments=segment_results,
            asr_model=self.model_name,
        )

    def _load_model(self) -> Any:
        if self._model is not None:
            return self._model

        with self._lock:
            if self._model is not None:
                return self._model

            try:
                from faster_whisper import WhisperModel
            except ImportError as exc:
                raise RuntimeError("faster-whisper is not installed") from exc

            logger.info(
                "loading_faster_whisper model=%s device=%s compute_type=%s",
                self._model_size,
                self._device,
                self._compute_type,
            )
            self._model = WhisperModel(
                self._model_size,
                device=self._device,
                compute_type=self._compute_type,
                cpu_threads=self._cpu_threads,
                num_workers=self._num_workers,
                download_root=str(self._download_root) if self._download_root else None,
                local_files_only=self._local_files_only,
            )
            return self._model


def _selected_language(language: str | None, default_language: str) -> str:
    if language in {None, ""}:
        return default_language

    return language  # type: ignore


def _language_for_faster_whisper(language: str) -> str | None:
    if language in {None, "", "auto"}:
        return None

    return language
