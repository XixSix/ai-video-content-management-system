import pytest

from app.pipelines.chaptering.schemas import ChapterBoundaryContextWindow
from app.pipelines.chaptering.semantic import score_context_windows
from app.schemas.chaptering.embedding import (
    ChapteringEmbeddingResult,
    TextEmbeddingResult,
)


class FakeEmbeddingClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, list[str]]] = []

    def embed_texts(
        self,
        *,
        request_id: str,
        texts: list[str],
    ) -> ChapteringEmbeddingResult:
        self.calls.append((request_id, texts))
        if texts == ["same left", "same right"]:
            embeddings = [
                TextEmbeddingResult(index=0, values=[1.0, 2.0]),
                TextEmbeddingResult(index=1, values=[2.0, 4.0]),
            ]
        else:
            embeddings = [
                TextEmbeddingResult(index=0, values=[1.0, 0.0]),
                TextEmbeddingResult(index=1, values=[0.0, 1.0]),
            ]

        return ChapteringEmbeddingResult(
            request_id=request_id,
            model="fake",
            dimension=2,
            embeddings=embeddings,
        )


def _window(
    *,
    candidate_time: float,
    left_text: str,
    right_text: str,
) -> ChapterBoundaryContextWindow:
    return ChapterBoundaryContextWindow(
        candidate_time=candidate_time,
        left_text=left_text,
        right_text=right_text,
        left_unit_ids=["left"],
        right_unit_ids=["right"],
    )


def test_score_context_windows_embeds_left_and_right_texts() -> None:
    client = FakeEmbeddingClient()
    windows = [
        _window(candidate_time=60.0, left_text="same left", right_text="same right"),
        _window(
            candidate_time=120.0,
            left_text="topic one",
            right_text="topic two",
        ),
    ]

    scores = score_context_windows(
        windows,
        embedding_client=client,
        request_id_prefix="chaptering:transcript-1:2",
    )

    assert client.calls == [
        ("chaptering:transcript-1:2:boundary:60", ["same left", "same right"]),
        ("chaptering:transcript-1:2:boundary:120", ["topic one", "topic two"]),
    ]
    assert scores[60.0] == pytest.approx(0.0)
    assert scores[120.0] == pytest.approx(1.0)


def test_score_context_windows_fails_safely_for_incomplete_embedding_response() -> None:
    class IncompleteEmbeddingClient:
        def embed_texts(
            self,
            *,
            request_id: str,
            texts: list[str],
        ) -> ChapteringEmbeddingResult:
            return ChapteringEmbeddingResult(
                request_id=request_id,
                model="fake",
                dimension=2,
                embeddings=[TextEmbeddingResult(index=0, values=[1.0, 2.0])],
            )

    scores = score_context_windows(
        [_window(candidate_time=60.0, left_text="left", right_text="right")],
        embedding_client=IncompleteEmbeddingClient(),
        request_id_prefix="chaptering:transcript-1:2",
    )

    assert scores == {60.0: 0.0}
