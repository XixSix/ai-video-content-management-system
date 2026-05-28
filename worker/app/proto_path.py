from pathlib import Path
import sys


def ensure_proto_generated_on_path() -> None:
    worker_dir = Path(__file__).resolve().parents[1]
    generated_dir = worker_dir / "proto" / "generated"
    generated_path = str(generated_dir)

    if generated_path not in sys.path:
        sys.path.insert(0, generated_path)
