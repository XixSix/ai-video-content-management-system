from pathlib import Path
from typing import Any

import pytest

from app.providers.chaptering.sentence_transformer_embedding import (
    SentenceTransformerTextEmbeddingProvider,
)


class _FakeSentenceTransformer:
    def __init__(self, embeddings: list[list[float]]) -> None:
        self.embeddings = embeddings
        self.max_seq_length = 0
        self.encode_calls: list[tuple[list[str], dict[str, Any]]] = []

    def encode(self, texts: list[str], **kwargs: Any) -> list[list[float]]:
        self.encode_calls.append((texts, kwargs))
        return self.embeddings

    def get_sentence_embedding_dimension(self) -> int:
        return 3


def test_provider_loads_model_lazily_and_reuses_it(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    model = _FakeSentenceTransformer([[1, 0, 0], [0, 1, 0]])
    constructor_calls: list[tuple[str, dict[str, Any]]] = []

    def build_model(model_name: str, **kwargs: Any) -> _FakeSentenceTransformer:
        constructor_calls.append((model_name, kwargs))
        return model

    monkeypatch.setattr("sentence_transformers.SentenceTransformer", build_model)
    provider = _provider()

    assert constructor_calls == []

    embeddings = provider.embed_texts(["left context", "right context"])
    provider.embed_texts(["left context", "right context"])

    assert embeddings == [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]
    assert constructor_calls == [
        (
            "Qwen/Qwen3-Embedding-0.6B",
            {
                "device": "cuda",
                "cache_folder": "/tmp/qwen-cache",
                "local_files_only": True,
            },
        )
    ]
    assert model.max_seq_length == 2048
    assert len(model.encode_calls) == 2
    assert model.encode_calls[0] == (
        ["left context", "right context"],
        {
            "batch_size": 8,
            "show_progress_bar": False,
            "convert_to_numpy": True,
            "normalize_embeddings": True,
        },
    )
    assert provider.dimension == 3


def test_provider_returns_empty_without_loading_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    constructor_calls: list[str] = []

    def build_model(model_name: str, **kwargs: Any) -> _FakeSentenceTransformer:
        _ = kwargs
        constructor_calls.append(model_name)
        return _FakeSentenceTransformer([])

    monkeypatch.setattr("sentence_transformers.SentenceTransformer", build_model)
    provider = _provider()

    assert provider.embed_texts([]) == []
    assert constructor_calls == []


def test_provider_rejects_unexpected_embedding_count() -> None:
    provider = _provider(model=_FakeSentenceTransformer([[1, 0, 0]]))

    with pytest.raises(ValueError, match="unexpected embedding count"):
        provider.embed_texts(["left context", "right context"])


def _provider(
    *,
    model: _FakeSentenceTransformer | None = None,
) -> SentenceTransformerTextEmbeddingProvider:
    return SentenceTransformerTextEmbeddingProvider(
        model_name="Qwen/Qwen3-Embedding-0.6B",
        device="cuda",
        batch_size=8,
        max_sequence_length=2048,
        cache_path=Path("/tmp/qwen-cache"),
        local_files_only=True,
        model=model,
    )
