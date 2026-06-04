import re
from collections import Counter

from nltk.tag import pos_tag
from nltk.tokenize import word_tokenize

from app.workflows.chaptering.scores.common import clamp_score
from app.workflows.chaptering.scores.scoring import cosine_similarity

CONTENT_POS_PREFIXES = ("NN", "VB", "JJ")
TOKEN_RE = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?")


def lexical_cohesion_score(left_text: str, right_text: str) -> float:
    """Return cosine similarity over English content words."""
    left_counts = _content_word_counts(left_text)
    right_counts = _content_word_counts(right_text)
    if not left_counts or not right_counts:
        return 0.0

    vocabulary = sorted(left_counts.keys() | right_counts.keys())
    similarity = cosine_similarity(
        [left_counts[token] for token in vocabulary],
        [right_counts[token] for token in vocabulary],
    )
    if similarity is None:
        return 0.0

    return clamp_score(similarity)


def lexical_shift_score(left_text: str, right_text: str) -> float:
    """Return lexical distance from content-word cohesion."""
    return clamp_score(1.0 - lexical_cohesion_score(left_text, right_text))


def _content_word_counts(text: str) -> Counter[str]:
    raw_tokens = word_tokenize(text)
    if not raw_tokens:
        return Counter()

    tagged_tokens = pos_tag(raw_tokens)
    content_words: list[str] = []
    for token, tag in tagged_tokens:
        normalized_token = token.lower()
        if tag.startswith(CONTENT_POS_PREFIXES) and TOKEN_RE.fullmatch(
            normalized_token
        ):
            content_words.append(normalized_token)

    return Counter(content_words)
