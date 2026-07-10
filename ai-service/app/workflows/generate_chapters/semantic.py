import logging

from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.workflows.generate_chapters.schemas import ChapterContextWindow
from app.workflows.generate_chapters.scores.scoring import (
    cosine_similarity,
    semantic_shift_score,
)

logger = logging.getLogger(__name__)


def score_context_windows(
    windows: list[ChapterContextWindow],
    *,
    embedding: TextEmbeddingPort,
) -> dict[float, float]:
    """Embed candidate context windows and return semantic shift by time.

    All left/right texts are flattened into one provider call, then paired back
    to their candidate times for cosine-distance scoring. Provider failures or
    invalid pairs are omitted so lexical scoring remains the fallback instead
    of treating unavailable semantic data as a strong boundary.
    """
    if not windows:
        return {}

    texts = [
        text for window in windows for text in (window.left_text, window.right_text)
    ]
    try:
        embeddings = embedding.embed_texts(texts)
    except Exception:
        logger.exception(
            "Text embedding provider failed model=%s",
            embedding.model_name,
        )
        return {}

    if len(embeddings) != len(texts):
        logger.warning(
            "Ignoring embedding batch with unexpected size model=%s expected=%d actual=%d",
            embedding.model_name,
            len(texts),
            len(embeddings),
        )
        return {}

    scores: dict[float, float] = {}
    for index, window in enumerate(windows):
        offset = index * 2
        score = _semantic_shift_from_embeddings(embeddings[offset : offset + 2])
        if score is None:
            logger.warning(
                "Ignoring invalid embedding pair model=%s candidate_time=%s",
                embedding.model_name,
                window.candidate_time,
            )
            continue
        scores[window.candidate_time] = score

    return scores


def _semantic_shift_from_embeddings(
    embeddings: list[list[float]],
) -> float | None:
    """Return semantic shift for a valid embedding pair."""
    if len(embeddings) != 2:
        return None

    if cosine_similarity(embeddings[0], embeddings[1]) is None:
        return None

    return semantic_shift_score(embeddings[0], embeddings[1])
