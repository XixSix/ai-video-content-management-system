from pathlib import Path


class NoopAudioNormalizer:
    def normalize(self, local_path: Path) -> Path:
        return local_path
