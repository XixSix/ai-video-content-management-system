import re

from nltk.stem import PorterStemmer, WordNetLemmatizer

def collapse_whitespace(text: str) -> str:
    """Collapse repeated whitespace and trim both ends."""
    return re.sub(r"\s+", " ", text).strip()


def remove_whitespace(text: str) -> str:
    """Remove all whitespace characters from text."""
    return re.sub(r"\s+", "", text)


def lowercase_collapse_whitespace(text: str) -> str:
    """Lowercase text after collapsing repeated whitespace."""
    return collapse_whitespace(text).lower()


def content_char_count(text: str) -> int:
    """Return character count after removing all whitespace."""
    return len(remove_whitespace(text))


def stem_token(token: str) -> str:
    """Return a Porter stem for a normalized token."""
    return PorterStemmer().stem(token.strip().lower())


def lemmatize_token(token: str, *, pos_tag: str | None = None) -> str:
    """Return a WordNet lemma, falling back when WordNet data is unavailable."""
    normalized_token = token.strip().lower()
    if not normalized_token:
        return ""

    try:
        return WordNetLemmatizer().lemmatize(
            normalized_token,
            _wordnet_pos(pos_tag),
        )
    except LookupError:
        return normalized_token


def _wordnet_pos(pos_tag: str | None) -> str:
    if not pos_tag:
        return "n"

    if pos_tag.startswith("J"):
        return "a"

    if pos_tag.startswith("V"):
        return "v"

    if pos_tag.startswith("R"):
        return "r"

    return "n"
