class NoopTextEmbeddingProvider:
    @property
    def model_name(self) -> str:
        return ""

    @property
    def dimension(self) -> int:
        return 0

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        _ = texts
        return []
