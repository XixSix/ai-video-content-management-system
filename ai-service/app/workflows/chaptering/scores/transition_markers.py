from app.workflows.chaptering.scores.normalize import lowercase_collapse_whitespace

TRANSITION_MARKER_SCORES = (
    ("so the next part", 1.0),
    ("next topic", 1.0),
    ("next part", 0.95),
    ("moving on", 0.9),
    ("now let's talk about", 0.9),
    ("let's move on", 0.9),
    ("to conclude", 0.9),
    ("in summary", 0.85),
    ("to summarize", 0.85),
    ("finally", 0.75),
    ("another important point", 0.75),
    ("firstly", 0.55),
    ("first", 0.45),
    ("next", 0.45),
    ("now", 0.35),
)


def transition_marker_score(text: str) -> float:
    """Return weighted transition marker strength for text starts."""
    normalized = lowercase_collapse_whitespace(text)
    matching_scores = [
        score
        for marker, score in TRANSITION_MARKER_SCORES
        if normalized.startswith(marker)
    ]

    return max(matching_scores, default=0.0)
