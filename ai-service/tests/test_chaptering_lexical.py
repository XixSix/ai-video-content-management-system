import pytest

from app.workflows.chaptering.scores import lexical


def test_lexical_cohesion_prefers_nltk_word_tokenize(monkeypatch) -> None:
    monkeypatch.setattr(lexical, "_PUNKT_AVAILABLE", None)
    monkeypatch.setattr(lexical, "_POS_TAGGER_AVAILABLE", None)
    tokenized_texts: list[str] = []

    def fake_word_tokenize(text: str) -> list[str]:
        tokenized_texts.append(text)
        return text.split()

    def fake_pos_tag(tokens: list[str]) -> list[tuple[str, str]]:
        return [(token, "NN") for token in tokens]

    monkeypatch.setattr(lexical, "word_tokenize", fake_word_tokenize)
    monkeypatch.setattr(lexical.nltk, "pos_tag", fake_pos_tag)

    score = lexical.lexical_cohesion_score("video upload", "video chapter")

    assert score == pytest.approx(0.5)
    assert tokenized_texts == ["video upload", "video chapter"]


def test_lexical_cohesion_uses_nltk_pos_tags_for_content_words(monkeypatch) -> None:
    monkeypatch.setattr(lexical, "_PUNKT_AVAILABLE", False)
    monkeypatch.setattr(lexical, "_POS_TAGGER_AVAILABLE", None)

    def fake_pos_tag(tokens: list[str]) -> list[tuple[str, str]]:
        tags = {
            "the": "DT",
            "platform": "NN",
            "uploads": "VBZ",
            "quickly": "RB",
            "a": "DT",
            "camera": "NN",
            "slowly": "RB",
        }
        return [(token, tags[token]) for token in tokens]

    monkeypatch.setattr(lexical.nltk, "pos_tag", fake_pos_tag)

    score = lexical.lexical_cohesion_score(
        "The platform uploads quickly.",
        "A camera uploads slowly.",
    )

    assert score == pytest.approx(0.5)


def test_lexical_cohesion_falls_back_when_nltk_tagger_data_is_missing(
    monkeypatch,
) -> None:
    monkeypatch.setattr(lexical, "_PUNKT_AVAILABLE", False)
    monkeypatch.setattr(lexical, "_POS_TAGGER_AVAILABLE", None)

    def missing_pos_tagger(tokens: list[str]) -> list[tuple[str, str]]:
        raise LookupError

    monkeypatch.setattr(lexical.nltk, "pos_tag", missing_pos_tagger)

    score = lexical.lexical_cohesion_score(
        "The platform uploads quickly.",
        "A camera uploads slowly.",
    )

    assert score == pytest.approx(0.25)
