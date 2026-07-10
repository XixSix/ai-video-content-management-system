import subprocess
from pathlib import Path

from app.core.config import settings
from app.errors import ServiceError


class RendererServiceError(ServiceError):
    pass


class RendererService:
    def render_document(self, document_path: Path, output_path: Path) -> Path:
        """Invoke the top-level Remotion renderer CLI for a render document."""
        output_path.parent.mkdir(parents=True, exist_ok=True)

        command = [
            settings.renderer_npm_binary,
            "--prefix",
            str(settings.renderer_dir),
            "run",
            "render:document",
            "--",
            "--input",
            str(document_path),
            "--output",
            str(output_path),
        ]

        try:
            subprocess.run(
                command,
                cwd=settings.renderer_dir,
                check=True,
                capture_output=True,
                text=True,
                timeout=settings.renderer_timeout_seconds,
            )
        except FileNotFoundError as error:
            raise RendererServiceError(
                f"Renderer command was not found: {settings.renderer_npm_binary}",
                error_code="RENDERER_COMMAND_NOT_FOUND",
            ) from error
        except subprocess.TimeoutExpired as error:
            raise RendererServiceError(
                "Renderer command timed out",
                error_code="RENDERER_TIMEOUT",
            ) from error
        except subprocess.CalledProcessError as error:
            stderr = error.stderr.strip()
            stdout = error.stdout.strip()
            details = stderr or stdout or f"exit code {error.returncode}"
            raise RendererServiceError(
                f"Renderer command failed: {details}",
                error_code="RENDERER_COMMAND_FAILED",
            ) from error

        return output_path


renderer_service = RendererService()
