from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.workflows.chaptering.schemas import ChapterBoundaryContextWindow
from app.workflows.chaptering.scores.scoring import semantic_shift_score


def score_context_windows(
    windows: list[ChapterBoundaryContextWindow],
    *,
    embedding: TextEmbeddingPort,
) -> dict[float, float]:
    """Embed candidate context windows and return semantic shift by time.

    Each candidate window is embedded as `[left_text, right_text]` and compared
    with cosine distance. Invalid or incomplete embeddings fail safely to `0.0`
    so provider issues do not create artificially strong boundaries.
    """
    scores: dict[float, float] = {}

    for window in windows:
        embeddings = embedding.embed_texts([window.left_text, window.right_text])
        scores[window.candidate_time] = _semantic_shift_from_embeddings(embeddings)

    return scores


def _semantic_shift_from_embeddings(embeddings: list[list[float]]) -> float:
    """Return semantic shift from a two-text embedding response."""
    if len(embeddings) < 2:
        return 0.0

    return semantic_shift_score(embeddings[0], embeddings[1])
