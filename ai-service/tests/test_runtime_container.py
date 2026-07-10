from pathlib import Path
from typing import Any

import pytest

import app.runtime.container as runtime_container
from app.core.config import Settings
from app.providers.generate_chapters.noop_embedding import NoopTextEmbeddingProvider
from app.providers.generate_chapters.openai_compatible_boundary_evaluation import (
    OpenAICompatibleChapterBoundaryEvaluationProvider,
)
from app.providers.generate_chapters.openai_compatible_title import (
    OpenAICompatibleChapterTitleProvider,
)
from app.providers.diarization.noop_diarization import NoopDiarization
from app.providers.diarization.pyannote_community import PyannoteCommunityDiarization
from app.providers.generate_short_clips.openai_compatible_candidate import (
    OpenAICompatibleGenerateShortClipsCandidateProvider,
)
from app.providers.generate_short_clips.noop_candidate import (
    NoopGenerateShortClipsCandidateProvider,
)
from app.providers.source_separation.demucs import DemucsSourceSeparator
from app.providers.source_separation.noop_demucs import NoopDemucsSourceSeparator
from app.runtime.container import _build_diarizer, _build_source_separator


def test_build_source_separator_uses_noop_by_default() -> None:
    separator = _build_source_separator(Settings(_env_file=None))

    assert isinstance(separator, NoopDemucsSourceSeparator)


def test_build_source_separator_uses_demucs_from_settings() -> None:
    settings = Settings(
        _env_file=None,
        SOURCE_SEPARATION_PROVIDER="demucs",
        DEMUCS_MODEL="htdemucs_ft",
        DEMUCS_DEVICE="cuda",
        DEMUCS_OUTPUT_DIR=Path("/tmp/custom-demucs"),
        DEMUCS_JOBS=2,
        DEMUCS_SHIFTS=1,
        DEMUCS_OVERLAP=0.4,
    )

    separator = _build_source_separator(settings)

    assert isinstance(separator, DemucsSourceSeparator)
    assert separator.model_name == "htdemucs_ft"


def test_build_diarizer_uses_noop_by_default() -> None:
    diarizer = _build_diarizer(Settings(_env_file=None))

    assert isinstance(diarizer, NoopDiarization)


def test_build_diarizer_uses_pyannote_from_settings() -> None:
    settings = Settings(
        _env_file=None,
        DIARIZATION_PROVIDER="pyannote",
        PYANNOTE_AUTH_TOKEN="hf_token",
        PYANNOTE_DIARIZATION_MODEL="pyannote/custom",
        DIARIZATION_DEVICE="cuda",
    )

    diarizer = _build_diarizer(settings)

    assert isinstance(diarizer, PyannoteCommunityDiarization)
    assert diarizer.model_name == "pyannote/custom"


def test_build_generate_chapters_embedding_provider_uses_noop_by_default() -> None:
    provider = runtime_container.build_generate_chapters_embedding_provider(
        Settings(_env_file=None)
    )

    assert isinstance(provider, NoopTextEmbeddingProvider)


def test_build_generate_chapters_embedding_provider_forwards_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}
    sentinel = NoopTextEmbeddingProvider()

    def build_provider(**kwargs: Any) -> NoopTextEmbeddingProvider:
        captured.update(kwargs)
        return sentinel

    monkeypatch.setattr(
        runtime_container,
        "SentenceTransformerTextEmbeddingProvider",
        build_provider,
    )
    settings = Settings(
        _env_file=None,
        GENERATE_CHAPTERS_EMBEDDING_PROVIDER="sentence-transformers",
        GENERATE_CHAPTERS_EMBEDDING_MODEL_NAME="Qwen/custom-embedding",
        GENERATE_CHAPTERS_EMBEDDING_DEVICE="cuda",
        GENERATE_CHAPTERS_EMBEDDING_BATCH_SIZE=16,
        GENERATE_CHAPTERS_EMBEDDING_MAX_SEQUENCE_LENGTH=4096,
        GENERATE_CHAPTERS_EMBEDDING_CACHE_PATH=Path("/tmp/qwen-cache"),
        GENERATE_CHAPTERS_EMBEDDING_LOCAL_FILES_ONLY=True,
    )

    provider = runtime_container.build_generate_chapters_embedding_provider(settings)

    assert provider is sentinel
    assert captured == {
        "model_name": "Qwen/custom-embedding",
        "device": "cuda",
        "batch_size": 16,
        "max_sequence_length": 4096,
        "cache_path": Path("/tmp/qwen-cache"),
        "local_files_only": True,
    }


def test_build_generate_short_clips_candidate_provider_uses_noop() -> None:
    provider = runtime_container.build_generate_short_clips_candidate_provider(
        Settings(
            _env_file=None, GENERATE_SHORT_CLIPS_MODEL_NAME="generate-short-clips-test"
        )
    )

    assert isinstance(provider, NoopGenerateShortClipsCandidateProvider)
    assert provider.model_name == "generate-short-clips-test"


def test_build_generate_short_clips_candidate_provider_uses_openai_compatible() -> None:
    provider = runtime_container.build_generate_short_clips_candidate_provider(
        Settings(
            _env_file=None,
            GENERATE_SHORT_CLIPS_CANDIDATE_PROVIDER="openai-compatible",
        ),
        llm_client=_FakeChatClient(),
    )

    assert isinstance(provider, OpenAICompatibleGenerateShortClipsCandidateProvider)
    assert provider.model_name == "fake-llm"


def test_build_generate_chapters_llm_providers_use_openai_compatible() -> None:
    settings = Settings(
        _env_file=None,
        GENERATE_CHAPTERS_BOUNDARY_EVALUATION_PROVIDER="openai-compatible",
        GENERATE_CHAPTERS_TITLE_PROVIDER="openai-compatible",
    )
    llm_client = _FakeChatClient()

    boundary_provider = (
        runtime_container.build_generate_chapters_boundary_evaluation_provider(
            settings,
            llm_client=llm_client,
        )
    )
    title_provider = runtime_container.build_generate_chapters_title_provider(
        settings,
        llm_client=llm_client,
    )

    assert isinstance(
        boundary_provider,
        OpenAICompatibleChapterBoundaryEvaluationProvider,
    )
    assert isinstance(title_provider, OpenAICompatibleChapterTitleProvider)


class _FakeChatClient:
    @property
    def model_name(self) -> str:
        return "fake-llm"

    def complete_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
    ) -> object:
        _ = system_prompt, user_payload
        return {}
