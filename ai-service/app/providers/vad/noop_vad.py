from pathlib import Path


class NoopVad:
    @property
    def model_name(self) -> str:
        return ""
    
    def warm_up(self) -> None:
        return None

    def apply(self, local_path: Path) -> Path:
        return local_path
