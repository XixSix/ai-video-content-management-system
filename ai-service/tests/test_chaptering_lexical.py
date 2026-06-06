import pytest

from app.workflows.chaptering.scores import lexical
from app.workflows.chaptering.scores import normalize


def test_normalize_stems_tokens() -> None:
    assert normalize.stem_token("Running") == "run"


def test_normalize_lemmatize_falls_back_when_wordnet_is_missing(monkeypatch) -> None:
    class MissingWordNetLemmatizer:
        def lemmatize(self, token: str, pos: str) -> str:
            raise LookupError

    monkeypatch.setattr(normalize, "_WORDNET_LEMMATIZER", MissingWordNetLemmatizer())

    assert normalize.lemmatize_token("Running", pos_tag="VBG") == "running"


def test_lexical_cohesion_prefers_nltk_word_tokenize(monkeypatch) -> None:
    tokenized_texts: list[str] = []

    def fake_word_tokenize(text: str) -> list[str]:
        tokenized_texts.append(text)
        return text.split()

    def fake_pos_tag(tokens: list[str]) -> list[tuple[str, str]]:
        return [(token, "NN") for token in tokens]

    monkeypatch.setattr(lexical, "word_tokenize", fake_word_tokenize)
    monkeypatch.setattr(lexical, "pos_tag", fake_pos_tag)

    score = lexical.lexical_cohesion_score("video upload", "video chapter")

    assert score == pytest.approx(0.5)
    assert tokenized_texts == ["video upload", "video chapter"]


def test_lexical_cohesion_uses_nltk_pos_tags_for_content_words(monkeypatch) -> None:
    def fake_word_tokenize(text: str) -> list[str]:
        return text.replace(".", " .").split()

    def fake_pos_tag(tokens: list[str]) -> list[tuple[str, str]]:
        tags = {
            "The": "DT",
            "platform": "NN",
            "uploads": "VBZ",
            "quickly": "RB",
            ".": ".",
            "A": "DT",
            "camera": "NN",
            "slowly": "RB",
        }
        return [(token, tags[token]) for token in tokens]

    monkeypatch.setattr(lexical, "word_tokenize", fake_word_tokenize)
    monkeypatch.setattr(lexical, "pos_tag", fake_pos_tag)

    score = lexical.lexical_cohesion_score(
        "The platform uploads quickly.",
        "A camera uploads slowly.",
    )

    assert score == pytest.approx(0.5)


def test_lexical_cohesion_stems_content_words(monkeypatch) -> None:
    def fake_word_tokenize(text: str) -> list[str]:
        return text.split()

    def fake_pos_tag(tokens: list[str]) -> list[tuple[str, str]]:
        return [(token, "VB") for token in tokens]

    monkeypatch.setattr(lexical, "word_tokenize", fake_word_tokenize)
    monkeypatch.setattr(lexical, "pos_tag", fake_pos_tag)

    score = lexical.lexical_cohesion_score("uploads", "uploading")

    assert score == pytest.approx(1.0)


def test_lexical_cohesion_requires_nltk_tagger_data(
    monkeypatch,
) -> None:
    def fake_word_tokenize(text: str) -> list[str]:
        return text.replace(".", "").split()

    def missing_pos_tagger(tokens: list[str]) -> list[tuple[str, str]]:
        raise LookupError

    monkeypatch.setattr(lexical, "word_tokenize", fake_word_tokenize)
    monkeypatch.setattr(lexical, "pos_tag", missing_pos_tagger)

    with pytest.raises(LookupError):
        lexical.lexical_cohesion_score(
            "The platform uploads quickly.",
            "A camera uploads slowly.",
        )


def test_lexical_cohesion_requires_nltk_tokenizer_data(monkeypatch) -> None:
    def missing_word_tokenize(text: str) -> list[str]:
        raise LookupError

    monkeypatch.setattr(lexical, "word_tokenize", missing_word_tokenize)

    with pytest.raises(LookupError):
        lexical.lexical_cohesion_score("video upload", "video chapter")
