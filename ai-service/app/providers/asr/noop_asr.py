from pathlib import Path


class NoopAsr:
    @property
    def model_name(self) -> str:
        return ""

    def transcribe(self, local_path: Path) -> Path:
        return local_path

