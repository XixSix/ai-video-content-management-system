from __future__ import annotations

import logging
from pathlib import Path
from threading import Lock
from typing import Any

logger = logging.getLogger(__name__)


class SentenceTransformerTextEmbeddingProvider:
    """Generate normalized text embeddings with a lazy Sentence Transformer.

    The provider delays model construction until embeddings or model metadata
    are requested, serializes model inference for safe reuse by concurrent gRPC
    workers, and returns plain Python vectors for the provider contract.

    Notes:
        Inputs are encoded without a retrieval query prompt because chaptering
        compares left and right transcript contexts symmetrically.
    """

    def __init__(
        self,
        *,
        model_name: str,
        device: str,
        batch_size: int,
        max_sequence_length: int,
        cache_path: Path | None,
        local_files_only: bool,
        model: Any | None = None,
    ) -> None:
        self._model_name = model_name
        self._device = device
        self._batch_size = batch_size
        self._max_sequence_length = max_sequence_length
        self._cache_path = cache_path
        self._local_files_only = local_files_only
        self._model = model
        self._model_lock = Lock()
        self._inference_lock = Lock()

        if self._model is not None:
            self._configure_model(self._model)

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def dimension(self) -> int:
        model = self._load_model()
        dimension = model.get_sentence_embedding_dimension()
        if dimension is None or int(dimension) <= 0:
            raise RuntimeError("sentence-transformer returned an invalid dimension")

        return int(dimension)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Encode texts in one normalized batch using the configured model."""
        if not texts:
            return []

        model = self._load_model()
        with self._inference_lock:
            encoded = model.encode(
                texts,
                batch_size=self._batch_size,
                show_progress_bar=False,
                convert_to_numpy=True,
                normalize_embeddings=True,
            )

        return _to_python_embeddings(encoded, expected_count=len(texts))

    def _load_model(self) -> Any:
        """Load and cache the Sentence Transformer on first use."""
        if self._model is not None:
            return self._model

        with self._model_lock:
            if self._model is not None:
                return self._model

            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                raise RuntimeError("sentence-transformers is not installed") from exc

            logger.info(
                "loading_sentence_transformer model=%s device=%s",
                self._model_name,
                self._device,
            )
            model = SentenceTransformer(
                self._model_name,
                device=self._device,
                cache_folder=str(self._cache_path) if self._cache_path else None,
                local_files_only=self._local_files_only,
            )
            self._configure_model(model)
            self._model = model
            return self._model

    def _configure_model(self, model: Any) -> None:
        """Apply the configured truncation limit to a loaded model."""
        model.max_seq_length = self._max_sequence_length


def _to_python_embeddings(
    encoded: Any,
    *,
    expected_count: int,
) -> list[list[float]]:
    """Convert model output to vectors and validate the batch cardinality."""
    values = encoded.tolist() if hasattr(encoded, "tolist") else encoded
    if not isinstance(values, (list, tuple)) or len(values) != expected_count:
        raise ValueError("sentence-transformer returned an unexpected embedding count")

    embeddings: list[list[float]] = []
    for value in values:
        vector = value.tolist() if hasattr(value, "tolist") else value
        if not isinstance(vector, (list, tuple)):
            raise ValueError(
                "sentence-transformer returned an invalid embedding vector"
            )
        embeddings.append([float(component) for component in vector])

    return embeddings
