from pathlib import Path
import sys


def ensure_proto_generated_on_path() -> None:
    ai_service_dir = Path(__file__).resolve().parents[1]
    generated_dir = ai_service_dir / "proto" / "generated"
    generated_path = str(generated_dir)

    if generated_path not in sys.path:
        sys.path.insert(0, generated_path)
