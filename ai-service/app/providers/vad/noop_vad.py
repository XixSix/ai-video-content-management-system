from pathlib import Path


class NoopVad:
    @property
    def model_name(self) -> str:
        return ""

    def apply(self, local_path: Path) -> Path:
        return local_path
