import hashlib

NOOP_EMBEDDING_DIMENSION = 8


class NoopTextEmbeddingProvider:
    @property
    def model_name(self) -> str:
        return ""

    @property
    def dimension(self) -> int:
        return NOOP_EMBEDDING_DIMENSION

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_text(text) for text in texts]

    def _embed_text(self, text: str) -> list[float]:
        normalized = " ".join(text.strip().lower().split())
        digest = hashlib.sha256(normalized.encode("utf-8")).digest()

        return [
            round(
                (int.from_bytes(digest[index * 4 : index * 4 + 4], "big") / 2**31)
                - 1.0,
                6,
            )
            for index in range(self.dimension)
        ]
