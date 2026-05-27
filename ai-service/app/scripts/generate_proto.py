from __future__ import annotations

import argparse
from pathlib import Path

from grpc_tools import protoc


AI_SERVICE_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = AI_SERVICE_DIR.parent
PROTO_ROOT = AI_SERVICE_DIR / "proto"
PROTO_FILE = PROTO_ROOT / "transcription/v1/transcription.proto"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Python gRPC code.")
    parser.add_argument(
        "--target",
        choices=["ai-service", "worker", "all"],
        default="all",
        help="Project to generate code for.",
    )
    args = parser.parse_args()

    targets = _resolve_targets(args.target)
    for name, project_dir in targets.items():
        output_dir = project_dir / "proto/generated"
        _generate_project(name=name, output_dir=output_dir)


def _resolve_targets(target: str) -> dict[str, Path]:
    if target == "ai-service":
        return {"ai-service": AI_SERVICE_DIR}
    if target == "worker":
        return {"worker": REPO_ROOT / "worker"}
    return {
        "ai-service": AI_SERVICE_DIR,
        "worker": REPO_ROOT / "worker",
    }


def _generate_project(*, name: str, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    exit_code = protoc.main(
        [
            "grpc_tools.protoc",
            f"-I{PROTO_ROOT}",
            f"--python_out={output_dir}",
            f"--grpc_python_out={output_dir}",
            str(PROTO_FILE),
        ]
    )
    if exit_code:
        raise SystemExit(exit_code)

    _ensure_package_files(output_dir)
    print(f"Generated {name} gRPC code in {output_dir.relative_to(REPO_ROOT)}")


def _ensure_package_files(output_dir: Path) -> None:
    for package_dir in [
        output_dir / "transcription",
        output_dir / "transcription/v1",
    ]:
        package_dir.mkdir(parents=True, exist_ok=True)
        init_file = package_dir / "__init__.py"
        init_file.touch(exist_ok=True)


if __name__ == "__main__":
    main()
