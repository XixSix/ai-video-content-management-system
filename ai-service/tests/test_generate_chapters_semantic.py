from app.providers.generate_chapters.noop_embedding import NoopTextEmbeddingProvider
from app.workflows.generate_chapters.schemas import ChapterContextWindow
from app.workflows.generate_chapters.semantic import score_context_windows


def test_noop_embedding_provider_returns_no_vectors() -> None:
    provider = NoopTextEmbeddingProvider()

    assert provider.dimension == 0
    assert provider.embed_texts(["left", "right"]) == []


def test_score_context_windows_embeds_all_pairs_in_one_batch() -> None:
    provider = _RecordingEmbeddingProvider(
        embeddings=[
            [1.0, 0.0],
            [1.0, 0.0],
            [1.0, 0.0],
            [0.0, 1.0],
        ]
    )

    scores = score_context_windows(_windows(), embedding=provider)

    assert provider.inputs == [["left one", "right one", "left two", "right two"]]
    assert scores == {10: 0.0, 20: 1.0}


def test_score_context_windows_skips_only_invalid_pairs() -> None:
    provider = _RecordingEmbeddingProvider(
        embeddings=[
            [1.0, 0.0],
            [1.0, 0.0],
            [],
            [0.0, 1.0],
        ]
    )

    scores = score_context_windows(_windows(), embedding=provider)

    assert scores == {10: 0.0}


def test_score_context_windows_falls_back_when_provider_fails() -> None:
    scores = score_context_windows(
        _windows(),
        embedding=_FailingEmbeddingProvider(),
    )

    assert scores == {}


def test_score_context_windows_rejects_incomplete_batch() -> None:
    provider = _RecordingEmbeddingProvider(
        embeddings=[[1.0, 0.0], [1.0, 0.0]],
    )

    scores = score_context_windows(_windows(), embedding=provider)

    assert scores == {}


def _windows() -> list[ChapterContextWindow]:
    return [
        ChapterContextWindow(
            candidate_time=10,
            left_text="left one",
            right_text="right one",
            left_unit_ids=["unit-1"],
            right_unit_ids=["unit-2"],
        ),
        ChapterContextWindow(
            candidate_time=20,
            left_text="left two",
            right_text="right two",
            left_unit_ids=["unit-2"],
            right_unit_ids=["unit-3"],
        ),
    ]


class _RecordingEmbeddingProvider:
    def __init__(self, *, embeddings: list[list[float]]) -> None:
        self._embeddings = embeddings
        self.inputs: list[list[str]] = []

    @property
    def model_name(self) -> str:
        return "test-embedding"

    @property
    def dimension(self) -> int:
        return 2

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        self.inputs.append(texts)
        return self._embeddings


class _FailingEmbeddingProvider:
    @property
    def model_name(self) -> str:
        return "failing-embedding"

    @property
    def dimension(self) -> int:
        return 2

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        _ = texts
        raise RuntimeError("embedding failed")
