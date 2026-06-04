import math
import re
from collections import Counter

import nltk
from nltk.tokenize import TreebankWordTokenizer, word_tokenize

from app.workflows.chaptering.scores.common import clamp_score

CONTENT_POS_PREFIXES = ("NN", "VB", "JJ")
TOKEN_RE = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?")

_FALLBACK_TOKENIZER = TreebankWordTokenizer()
_PUNKT_AVAILABLE: bool | None = None
_POS_TAGGER_AVAILABLE: bool | None = None


def lexical_cohesion_score(left_text: str, right_text: str) -> float:
    """Return cosine similarity over English content words."""
    left_counts = _content_word_counts(left_text)
    right_counts = _content_word_counts(right_text)
    if not left_counts or not right_counts:
        return 0.0

    shared_tokens = left_counts.keys() & right_counts.keys()
    dot_product = sum(
        left_counts[token] * right_counts[token] for token in shared_tokens
    )
    left_norm = math.sqrt(sum(count * count for count in left_counts.values()))
    right_norm = math.sqrt(sum(count * count for count in right_counts.values()))
    if left_norm <= 0.0 or right_norm <= 0.0:
        return 0.0

    return clamp_score(dot_product / (left_norm * right_norm))


def lexical_shift_score(left_text: str, right_text: str) -> float:
    """Return lexical distance from content-word cohesion."""
    return clamp_score(1.0 - lexical_cohesion_score(left_text, right_text))


def _content_word_counts(text: str) -> Counter[str]:
    tokens = [
        token.lower() for token in _tokenize(text) if TOKEN_RE.fullmatch(token.lower())
    ]
    if not tokens:
        return Counter()

    tagged_tokens = _pos_tag(tokens)
    if tagged_tokens is None:
        return Counter(tokens)

    return Counter(
        token for token, tag in tagged_tokens if tag.startswith(CONTENT_POS_PREFIXES)
    )


def _tokenize(text: str) -> list[str]:
    global _PUNKT_AVAILABLE

    if _PUNKT_AVAILABLE is False:
        return _FALLBACK_TOKENIZER.tokenize(text)

    try:
        tokens = word_tokenize(text)
    except LookupError:
        _PUNKT_AVAILABLE = False
        return _FALLBACK_TOKENIZER.tokenize(text)

    _PUNKT_AVAILABLE = True
    return tokens


def _pos_tag(tokens: list[str]) -> list[tuple[str, str]] | None:
    global _POS_TAGGER_AVAILABLE

    if _POS_TAGGER_AVAILABLE is False:
        return None

    try:
        tagged_tokens = nltk.pos_tag(tokens)
    except LookupError:
        _POS_TAGGER_AVAILABLE = False
        return None

    _POS_TAGGER_AVAILABLE = True
    return tagged_tokens
