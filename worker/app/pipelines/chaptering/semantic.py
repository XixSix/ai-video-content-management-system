from typing import Protocol

from app.pipelines.chaptering.schemas import ChapterBoundaryContextWindow
from app.pipelines.chaptering.scoring import semantic_shift_score
from app.schemas.chaptering.embedding import ChapteringEmbeddingResult


class EmbeddingClient(Protocol):
    def embed_texts(
        self,
        *,
        request_id: str,
        texts: list[str],
    ) -> ChapteringEmbeddingResult:
        """Return embeddings for texts in their original request order."""


def score_context_windows(
    windows: list[ChapterBoundaryContextWindow],
    *,
    embedding_client: EmbeddingClient,
    request_id_prefix: str,
) -> dict[float, float]:
    """Embed chapter context windows and return semantic shift by boundary time.

    Each candidate window is embedded as ``[left_text, right_text]`` so the
    resulting vectors can be compared with cosine similarity. Invalid or
    incomplete embedding responses fail safely to ``0.0`` semantic shift, which
    prevents model/provider issues from creating artificially strong chapter
    boundaries.

    Notes:
        This step only computes the embedding signal. It does not rank
        candidates, blend rule-based hints, or call an LLM.
    """
    scores: dict[float, float] = {}

    for window in windows:
        result = embedding_client.embed_texts(
            request_id=_window_request_id(request_id_prefix, window),
            texts=[window.left_text, window.right_text],
        )
        scores[window.candidate_time] = _semantic_shift_from_result(result)

    return scores


def _semantic_shift_from_result(result: ChapteringEmbeddingResult) -> float:
    """Return the semantic shift from a two-text embedding response."""
    if len(result.embeddings) < 2:
        return 0.0

    left_embedding = result.embeddings[0].values
    right_embedding = result.embeddings[1].values
    return semantic_shift_score(left_embedding, right_embedding)


def _window_request_id(
    request_id_prefix: str,
    window: ChapterBoundaryContextWindow,
) -> str:
    """Build a stable request id for one candidate context window."""
    candidate_time = f"{window.candidate_time:g}"
    return f"{request_id_prefix}:boundary:{candidate_time}"
