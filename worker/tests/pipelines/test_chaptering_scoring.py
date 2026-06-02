import math

import pytest

from app.pipelines.chaptering.scoring import (
    cosine_similarity,
    semantic_shift_score,
)
from app.pipelines.chaptering.transition_markers import (
    starts_with_transition_marker,
    transition_marker_score,
)


def test_cosine_similarity_returns_high_similarity_for_aligned_vectors() -> None:
    similarity = cosine_similarity([1.0, 2.0, 3.0], [2.0, 4.0, 6.0])

    assert similarity == pytest.approx(1.0)
    assert semantic_shift_score([1.0, 2.0, 3.0], [2.0, 4.0, 6.0]) == pytest.approx(0.0)


def test_semantic_shift_score_is_high_for_low_similarity_vectors() -> None:
    similarity = cosine_similarity([1.0, 0.0], [0.0, 1.0])

    assert similarity == pytest.approx(0.0)
    assert semantic_shift_score([1.0, 0.0], [0.0, 1.0]) == pytest.approx(1.0)


@pytest.mark.parametrize(
    ("left_embedding", "right_embedding"),
    [
        ([], []),
        ([1.0, 2.0], [1.0]),
        ([0.0, 0.0], [1.0, 2.0]),
        ([1.0, math.nan], [1.0, 2.0]),
        ([1.0, math.inf], [1.0, 2.0]),
    ],
)
def test_semantic_shift_score_fails_safely_for_invalid_vectors(
    left_embedding: list[float],
    right_embedding: list[float],
) -> None:
    assert cosine_similarity(left_embedding, right_embedding) is None
    assert semantic_shift_score(left_embedding, right_embedding) == 0.0


@pytest.mark.parametrize(
    ("text", "expected_score"),
    [
        ("Next topic: pricing", 1.0),
        ("Now let's talk about distribution", 0.9),
        ("Finally, we review the result", 0.75),
        ("Next, check upload status", 0.45),
        ("Now we render the preview", 0.35),
        ("This continues the same idea", 0.0),
    ],
)
def test_transition_marker_score_weights_marker_strength(
    text: str,
    expected_score: float,
) -> None:
    assert transition_marker_score(text) == pytest.approx(expected_score)
    assert starts_with_transition_marker(text) is (expected_score > 0.0)
