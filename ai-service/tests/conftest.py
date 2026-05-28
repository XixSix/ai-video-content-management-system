from pathlib import Path
import sys

AI_SERVICE_DIR = Path(__file__).resolve().parents[1]
GENERATED_PROTO_DIR = AI_SERVICE_DIR / "proto" / "generated"

for path in [AI_SERVICE_DIR, GENERATED_PROTO_DIR]:
    path_value = str(path)
    if path_value not in sys.path:
        sys.path.insert(0, path_value)
