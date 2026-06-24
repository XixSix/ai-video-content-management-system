import json
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from app.core.config import settings
from app.db import render_export_repository
from app.db.client import get_db_session
from app.schemas.jobs.render_export_message import RenderExportJobMessage
from app.schemas.render_export.output import (
    RenderExportAssetSummary,
    RenderExportCompletedOutput,
)
from app.services.renderer_service import RendererServiceError, renderer_service
from app.services.s3_service import S3SourceObjectNotFoundError, s3_service


class TerminalRenderExportPipelineError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


GEOMETRY_DEFAULTS = {
    "captions": {
        "xPercent": 50,
        "yPercent": 82,
        "widthPercent": 76,
        "heightPercent": 15,
    },
    "overlay": {
        "xPercent": 50,
        "yPercent": 50,
        "widthPercent": 70,
        "heightPercent": 40,
    },
    "text": {
        "xPercent": 50,
        "yPercent": 50,
        "widthPercent": 46,
        "heightPercent": 18,
    },
}


def run_render_export_pipeline(
    message: RenderExportJobMessage,
) -> RenderExportCompletedOutput:
    """Render the saved editor snapshot into an exported project video asset."""
    settings.tmp_dir.mkdir(parents=True, exist_ok=True)

    with get_db_session() as session:
        project = render_export_repository.find_project_render_source(
            session,
            project_id=str(message.project_id),
        )
        captions = render_export_repository.find_latest_caption_source(
            session,
            media_id=str(message.media_id),
        )

    if project is None:
        raise TerminalRenderExportPipelineError(
            "Project, source media, or editor snapshot was not found",
            error_code="RENDER_SOURCE_NOT_FOUND",
        )

    _guard_project_message(project, message)

    with TemporaryDirectory(
        prefix=f"render-export-{message.job_id}-",
        dir=settings.tmp_dir,
    ) as temporary_directory:
        workspace = Path(temporary_directory)
        document_path = workspace / "render-document.json"
        output_path = workspace / "export.mp4"

        try:
            source_url = s3_service.create_presigned_get_url(
                project.media.s3_key,
                bucket=project.media.s3_bucket,
                expires_in_seconds=settings.renderer_timeout_seconds + 300,
            )
            media_url_by_id = _presign_project_media(project)
            document = build_render_document(
                project,
                source_url=source_url,
                media_url_by_id=media_url_by_id,
                captions=captions,
            )
            document_path.write_text(json.dumps(document), encoding="utf-8")
            renderer_service.render_document(document_path, output_path)
        except S3SourceObjectNotFoundError as error:
            raise TerminalRenderExportPipelineError(
                "Source media was not found",
                error_code=error.error_code,
            ) from error
        except (OSError, ValueError, RendererServiceError) as error:
            raise TerminalRenderExportPipelineError(
                str(error),
                error_code="RENDER_EXPORT_FAILED",
            ) from error

        object_key = _output_object_key(message)
        s3_service.upload_file(output_path, object_key, content_type="video/mp4")

        transcript_version = captions.transcript_version if captions else None
        metadata = {
            "renderer": "remotion",
            "snapshotId": str(project.snapshot.id),
            "snapshotVersion": project.snapshot.version,
            "width": document["width"],
            "height": document["height"],
            "fps": document["fps"],
            "durationInFrames": document["durationInFrames"],
            "captionTranscriptId": str(captions.transcript_id) if captions else None,
        }

        with get_db_session() as session:
            asset = render_export_repository.upsert_export_asset(
                session,
                user_id=str(message.user_id),
                media_id=str(message.media_id),
                project_id=str(message.project_id),
                job_id=str(message.job_id),
                transcript_version=transcript_version,
                s3_bucket=settings.s3_bucket,
                s3_key=object_key,
                s3_region=settings.s3_region,
                mime_type="video/mp4",
                file_size_bytes=output_path.stat().st_size,
                metadata=metadata,
            )

    return RenderExportCompletedOutput(
        asset=RenderExportAssetSummary(
            id=asset.id,
            asset_type=asset.asset_type,
            s3_bucket=asset.s3_bucket,
            s3_key=asset.s3_key,
            metadata=asset.metadata,
        ),
        summary={
            "assetId": str(asset.id),
            "snapshotVersion": project.snapshot.version,
            "durationInFrames": document["durationInFrames"],
        },
    )


def build_render_document(
    project: render_export_repository.RenderExportProject,
    *,
    source_url: str,
    media_url_by_id: dict[str, str] | None = None,
    captions: render_export_repository.TranscriptCaptionSource | None = None,
) -> dict[str, Any]:
    """Map a persisted editor snapshot into the renderer JSON document."""
    snapshot = project.snapshot.document
    fps = 30
    width, height = _dimensions_for_aspect_ratio(
        _get(snapshot, "settings", "aspectRatio") or project.aspect_ratio
    )
    duration_seconds = _resolve_duration_seconds(project, snapshot)
    duration_in_frames = max(1, _seconds_to_frames(duration_seconds, fps))
    layer_by_id = {
        layer["id"]: layer
        for layer in snapshot.get("layers", [])
        if isinstance(layer, dict) and layer.get("visible", True)
    }
    project_media_by_id = {
        str(project_media.media.id): project_media
        for project_media in project.project_media
    }
    media_urls = media_url_by_id or {}
    text_layers: list[dict[str, Any]] = []
    caption_layers: list[dict[str, Any]] = []
    overlay_media_layers: list[dict[str, Any]] = []
    audio_layers: list[dict[str, Any]] = []
    source_duration_frames = duration_in_frames
    source_start_frame = 0

    for track in snapshot.get("timelineTracks", []):
        if not isinstance(track, dict):
            continue

        track_id = track.get("id")

        for segment in track.get("segments", []):
            if not isinstance(segment, dict):
                continue

            if track_id == "SOURCE":
                source_start_frame = _seconds_to_frames(
                    segment.get("startTime", 0), fps
                )
                source_duration_frames = _seconds_to_frames(
                    segment.get("durationSeconds", duration_seconds),
                    fps,
                )
                continue

            layer_id = segment.get("layerId")
            start_frame = _seconds_to_frames(segment.get("startTime", 0), fps)
            duration_frames = max(
                1,
                _seconds_to_frames(segment.get("durationSeconds", 1), fps),
            )

            if track_id == "OVERLAY_MEDIA":
                media_id = _segment_media_id(segment, layer_by_id)
                project_media = project_media_by_id.get(media_id) if media_id else None

                if not project_media:
                    raise ValueError(
                        f"Overlay segment {segment.get('id', 'unknown')} references missing project media"
                    )

                media_type = project_media.media.media_type

                if media_type not in {"VIDEO", "IMAGE"}:
                    raise ValueError(
                        f"Overlay segment {segment.get('id', 'unknown')} references unsupported media type {media_type}"
                    )

                geometry = _geometry(segment, "overlay")
                overlay_media_layers.append(
                    {
                        "id": str(segment.get("id", media_id)),
                        "src": _media_url(media_id, media_urls),
                        "mediaType": media_type,
                        "startFrame": start_frame,
                        "durationInFrames": duration_frames,
                        "fit": "contain",
                        "muted": True,
                        **geometry,
                        "style": {},
                    }
                )
                continue

            if track_id == "AUDIO":
                media_id = _segment_media_id(segment, layer_by_id)
                project_media = project_media_by_id.get(media_id) if media_id else None

                if not project_media:
                    raise ValueError(
                        f"Audio segment {segment.get('id', 'unknown')} references missing project media"
                    )

                if project_media.media.media_type != "AUDIO":
                    raise ValueError(
                        f"Audio segment {segment.get('id', 'unknown')} references unsupported media type {project_media.media.media_type}"
                    )

                audio_layers.append(
                    {
                        "id": str(segment.get("id", media_id)),
                        "src": _media_url(media_id, media_urls),
                        "startFrame": start_frame,
                        "durationInFrames": duration_frames,
                        "volume": 1,
                        "muted": False,
                    }
                )
                continue

            if not isinstance(layer_id, str):
                continue

            layer = layer_by_id.get(layer_id)

            if not layer:
                continue

            if layer.get("kind") == "text":
                geometry = _geometry(layer, "text")
                text_layers.append(
                    {
                        "id": f"{segment.get('id', layer_id)}-{layer_id}",
                        "text": layer.get("content", ""),
                        "startFrame": start_frame,
                        "durationInFrames": max(1, duration_frames),
                        **geometry,
                        "style": _text_style(layer.get("style")),
                    }
                )

            if layer.get("kind") == "captions" and captions and captions.captions:
                geometry = _geometry(layer, "captions")
                caption_layers.append(
                    {
                        "id": f"{segment.get('id', layer_id)}-{layer_id}",
                        "startFrame": start_frame,
                        "durationInFrames": max(1, duration_frames),
                        **geometry,
                        "captions": captions.captions,
                        "style": _caption_style(layer.get("style")),
                    }
                )

    return {
        "version": 1,
        "width": width,
        "height": height,
        "fps": fps,
        "durationInFrames": duration_in_frames,
        "backgroundColor": "#000000",
        "sourceVideo": {
            "src": source_url,
            "startFrame": source_start_frame,
            "durationInFrames": max(1, source_duration_frames),
            "fit": "cover",
            "muted": False,
        },
        "overlayMediaLayers": overlay_media_layers,
        "audioLayers": audio_layers,
        "textLayers": text_layers,
        "captionLayers": caption_layers,
    }


def _presign_project_media(
    project: render_export_repository.RenderExportProject,
) -> dict[str, str]:
    return {
        str(project_media.media.id): s3_service.create_presigned_get_url(
            project_media.media.s3_key,
            bucket=project_media.media.s3_bucket,
            expires_in_seconds=settings.renderer_timeout_seconds + 300,
        )
        for project_media in project.project_media
    }


def _guard_project_message(
    project: render_export_repository.RenderExportProject,
    message: RenderExportJobMessage,
) -> None:
    if str(project.id) != str(message.project_id):
        raise TerminalRenderExportPipelineError("Message projectId mismatch")

    if str(project.workspace_id) != str(message.workspace_id):
        raise TerminalRenderExportPipelineError("Message workspaceId mismatch")

    if str(project.media.id) != str(message.media_id):
        raise TerminalRenderExportPipelineError("Message mediaId mismatch")

    if str(project.user_id) != str(message.user_id):
        raise TerminalRenderExportPipelineError("Message userId mismatch")


def _resolve_duration_seconds(
    project: render_export_repository.RenderExportProject,
    snapshot: dict[str, Any],
) -> float:
    max_end = 0.0

    for track in snapshot.get("timelineTracks", []):
        if not isinstance(track, dict):
            continue

        for segment in track.get("segments", []):
            if not isinstance(segment, dict):
                continue

            start = _number(segment.get("startTime"), 0)
            duration = _number(segment.get("durationSeconds"), 0)
            max_end = max(max_end, start + duration)

    return max(max_end, project.duration or 0, project.media.duration or 0, 1)


def _dimensions_for_aspect_ratio(aspect_ratio: Any) -> tuple[int, int]:
    match aspect_ratio:
        case "1:1":
            return 1080, 1080
        case "4:5":
            return 1080, 1350
        case "16:9":
            return 1920, 1080
        case _:
            return 1080, 1920


def _text_style(raw_style: Any) -> dict[str, Any]:
    style = raw_style if isinstance(raw_style, dict) else {}

    return {
        "fontFamily": style.get("fontFamily", "Inter, Arial, sans-serif"),
        "fontSize": _number(style.get("fontSize"), 72),
        "fontWeight": style.get("fontWeight", 700),
        "lineHeight": style.get("lineHeight", 1.1),
        "color": style.get("color", "#ffffff"),
        "textAlign": style.get("textAlign", "center"),
        "textShadow": style.get("textShadow", "0 4px 16px rgba(0, 0, 0, 0.55)"),
        "padding": style.get("padding", "0 8%"),
        "whiteSpace": "pre-wrap",
    }


def _caption_style(raw_style: Any) -> dict[str, Any]:
    style = raw_style if isinstance(raw_style, dict) else {}

    return {
        "fontFamily": style.get("fontFamily", "Inter, Arial, sans-serif"),
        "fontSize": _number(style.get("fontSize"), 64),
        "fontWeight": style.get("fontWeight", 800),
        "lineHeight": style.get("lineHeight", 1.05),
        "color": style.get("color", "#ffffff"),
        "textAlign": style.get("textAlign", "center"),
        "textShadow": style.get("textShadow", "0 4px 16px rgba(0, 0, 0, 0.7)"),
        "padding": style.get("padding", "0 10%"),
    }


def _seconds_to_frames(value: Any, fps: int) -> int:
    return max(0, round(_number(value, 0) * fps))


def _number(value: Any, fallback: float) -> float:
    return float(value) if isinstance(value, int | float) else fallback


def _geometry(source: dict[str, Any], kind: str) -> dict[str, float]:
    defaults = GEOMETRY_DEFAULTS[kind]

    return {
        "xPercent": _number(source.get("xPercent"), defaults["xPercent"]),
        "yPercent": _number(source.get("yPercent"), defaults["yPercent"]),
        "widthPercent": _number(source.get("widthPercent"), defaults["widthPercent"]),
        "heightPercent": _number(
            source.get("heightPercent"), defaults["heightPercent"]
        ),
    }


def _segment_media_id(
    segment: dict[str, Any], layer_by_id: dict[str, Any]
) -> str | None:
    media_id = segment.get("mediaId")

    if isinstance(media_id, str):
        return media_id

    layer_id = segment.get("layerId")

    if not isinstance(layer_id, str):
        return None

    layer = layer_by_id.get(layer_id)

    if not isinstance(layer, dict):
        return None

    layer_media_id = layer.get("mediaId")

    return layer_media_id if isinstance(layer_media_id, str) else None


def _media_url(media_id: str, media_url_by_id: dict[str, str]) -> str:
    media_url = media_url_by_id.get(media_id)

    if not media_url:
        raise ValueError(f"Render document media URL is missing for media {media_id}")

    return media_url


def _get(source: dict[str, Any], *path: str) -> Any:
    current: Any = source

    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)

    return current


def _output_object_key(message: RenderExportJobMessage) -> str:
    return (
        f"generated/workspaces/{message.workspace_id}/projects/{message.project_id}"
        f"/exports/{message.job_id}/export.mp4"
    )
