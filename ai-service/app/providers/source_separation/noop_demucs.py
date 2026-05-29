from pathlib import Path


class NoopDemucsSourceSeparator:
    @property
    def model_name(self) -> str:
        return ""

    def separate(self, local_path: Path) -> Path:
        return local_path
