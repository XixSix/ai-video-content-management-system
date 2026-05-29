from pathlib import Path


class NoopDiarization:
    @property
    def model_name(self) -> str:
        return ""

    def diarize(self, local_path: Path) -> Path:
        return local_path
