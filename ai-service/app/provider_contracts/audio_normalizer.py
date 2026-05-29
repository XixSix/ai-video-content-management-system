from pathlib import Path
from typing import Protocol


class AudioNormalizerPort(Protocol):
    def normalize(self, local_path: Path) -> Path: ...
