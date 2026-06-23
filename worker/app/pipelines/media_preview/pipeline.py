from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import UnidentifiedImageError

from app.core.config import settings
from app.db import media_preview_repository
from app.db.client import get_db_session
from app.pipelines.media_preview.algorithms import (
    build_sprite_timestamps,
    build_thumbnail_timestamps,
    build_waveform_payload,
    compose_sprite_sheets,
    save_thumbnail,
    select_best_thumbnail,
    write_compact_json,
)
from app.schemas.db.processsing_job import JobType
from app.schemas.jobs.media_preview_message import MediaPreviewJobMessage
from app.schemas.media_preview.output import (
    MediaPreviewArtifact,
    MediaPreviewCompletedOutput,
    MediaPreviewPipelineOutput,
    PersistedAssetSummary,
)
from app.services.ffmpeg_service import (
    FFmpegBinaryNotFoundError,
    FFmpegCommandError,
    ffmpeg_service,
)
from app.services.s3_service import S3SourceObjectNotFoundError, s3_service


class TerminalMediaPreviewPipelineError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


def run_media_preview_pipeline(
    message: MediaPreviewJobMessage,
) -> MediaPreviewCompletedOutput:
    """Run media preview processing, upload artifacts to S3, persist to DB, and
    return a completed output struct."""
    settings.tmp_dir.mkdir(parents=True, exist_ok=True)

    with TemporaryDirectory(
        prefix=f"media-preview-{message.job_id}-",
        dir=settings.tmp_dir,
    ) as temporary_directory:
        workspace = Path(temporary_directory)
        pipeline_output = _run_pipeline(message, workspace)
        return _upload_and_persist(message, pipeline_output)


def _run_pipeline(
    message: MediaPreviewJobMessage,
    workspace: Path,
) -> MediaPreviewPipelineOutput:
    """Download source and run the appropriate generation algorithm."""
    workspace.mkdir(parents=True, exist_ok=True)
    source_suffix = Path(message.s3_key).suffix or ".source"
    source_path = workspace / f"source{source_suffix}"

    try:
        s3_service.download_file(
            message.s3_key,
            source_path,
            bucket=message.s3_bucket,
        )
        probe = ffmpeg_service.probe_media(source_path)

        if message.job_type == JobType.GENERATE_THUMBNAIL:
            if not probe.has_video:
                raise TerminalMediaPreviewPipelineError(
                    "Source media has no video stream",
                    error_code="VIDEO_STREAM_NOT_FOUND",
                )
            return _generate_thumbnail(
                message, source_path, probe.duration_seconds, workspace
            )

        if message.job_type == JobType.GENERATE_THUMBNAIL_SPRITE:
            if not probe.has_video:
                raise TerminalMediaPreviewPipelineError(
                    "Source media has no video stream",
                    error_code="VIDEO_STREAM_NOT_FOUND",
                )
            return _generate_sprite(
                message, source_path, probe.duration_seconds, workspace
            )

        if not probe.has_audio:
            raise TerminalMediaPreviewPipelineError(
                "Source media has no audio stream",
                error_code="AUDIO_STREAM_NOT_FOUND",
            )
        return _generate_waveform(
            message,
            source_path,
            probe.duration_seconds,
            workspace,
        )
    except S3SourceObjectNotFoundError as error:
        raise TerminalMediaPreviewPipelineError(
            "Source media was not found",
            error_code=error.error_code,
        ) from error
    except FFmpegBinaryNotFoundError as error:
        raise TerminalMediaPreviewPipelineError(
            str(error),
            error_code="FFMPEG_NOT_AVAILABLE",
        ) from error
    except FFmpegCommandError as error:
        raise TerminalMediaPreviewPipelineError(
            str(error),
            error_code="INVALID_MEDIA",
        ) from error
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise TerminalMediaPreviewPipelineError(
            str(error),
            error_code="INVALID_PREVIEW_OUTPUT",
        ) from error


def _upload_and_persist(
    message: MediaPreviewJobMessage,
    pipeline_output: MediaPreviewPipelineOutput,
) -> MediaPreviewCompletedOutput:
    """Upload artifacts to S3, persist assets to DB, and return completed output."""
    job_id = str(message.job_id)

    for artifact in pipeline_output.artifacts:
        s3_service.upload_file(
            artifact.local_path,
            artifact.object_key,
            content_type=artifact.mime_type,
        )

    with get_db_session() as session:
        persisted = [
            media_preview_repository.upsert_asset(
                session,
                user_id=str(message.user_id),
                media_id=str(message.media_id),
                job_id=job_id,
                asset_type=artifact.asset_type,
                s3_bucket=settings.s3_bucket,
                s3_key=artifact.object_key,
                s3_region=settings.s3_region,
                mime_type=artifact.mime_type,
                file_size_bytes=artifact.local_path.stat().st_size,
                metadata=artifact.metadata,
            )
            for artifact in pipeline_output.artifacts
        ]

    return MediaPreviewCompletedOutput(
        assets=[
            PersistedAssetSummary(
                id=asset.id,
                asset_type=asset.asset_type,
                s3_bucket=asset.s3_bucket,
                s3_key=asset.s3_key,
                metadata=asset.metadata,
            )
            for asset in persisted
        ],
        summary=pipeline_output.summary,
    )


def _generate_thumbnail(
    message: MediaPreviewJobMessage,
    source_path: Path,
    duration_seconds: float,
    workspace: Path,
) -> MediaPreviewPipelineOutput:
    candidate_dir = workspace / "thumbnail-candidates"
    timestamps = build_thumbnail_timestamps(
        duration_seconds,
        candidate_count=settings.thumbnail_candidate_count,
    )
    candidates: list[tuple[Path, float]] = []

    for index, timestamp in enumerate(timestamps):
        candidate_path = candidate_dir / f"candidate-{index:02d}.jpg"
        ffmpeg_service.extract_frame(
            source_path,
            candidate_path,
            timestamp_seconds=timestamp,
            max_width=settings.thumbnail_max_width,
        )
        candidates.append((candidate_path, timestamp))

    selected = select_best_thumbnail(candidates)
    output_path = workspace / "thumbnail.jpg"
    save_thumbnail(
        selected.path,
        output_path,
        max_width=settings.thumbnail_max_width,
        jpeg_quality=settings.thumbnail_jpeg_quality,
    )
    object_key = f"{_output_prefix(message)}/thumbnail.jpg"
    metadata = {
        "algorithmVersion": 1,
        "selectedTimestampSeconds": round(selected.timestamp_seconds, 6),
        "score": round(selected.score, 6),
        "brightness": round(selected.brightness, 6),
        "contrast": round(selected.contrast, 6),
        "sharpness": round(selected.sharpness, 6),
        "candidateCount": len(candidates),
    }
    return MediaPreviewPipelineOutput(
        artifacts=[
            MediaPreviewArtifact(
                asset_type="THUMBNAIL",
                local_path=output_path,
                object_key=object_key,
                mime_type="image/jpeg",
                metadata=metadata,
            )
        ],
        summary={"selectedTimestampSeconds": metadata["selectedTimestampSeconds"]},
    )


def _generate_sprite(
    message: MediaPreviewJobMessage,
    source_path: Path,
    duration_seconds: float,
    workspace: Path,
) -> MediaPreviewPipelineOutput:
    timestamps, effective_interval = build_sprite_timestamps(
        duration_seconds,
        minimum_frames=settings.sprite_min_frames,
        maximum_frames=settings.sprite_max_frames,
    )
    frames = ffmpeg_service.extract_frames(
        source_path,
        workspace / "sprite-frames" / "frame-%05d.jpg",
        frames_per_second=len(timestamps) / duration_seconds,
        frame_count=len(timestamps),
        width=settings.sprite_frame_width,
        height=settings.sprite_frame_height,
    )
    sheets = compose_sprite_sheets(
        frames,
        timestamps,
        workspace / "sprite-sheets",
        columns=settings.sprite_columns,
        frames_per_sheet=settings.sprite_frames_per_sheet,
        frame_width=settings.sprite_frame_width,
        frame_height=settings.sprite_frame_height,
        jpeg_quality=settings.sprite_jpeg_quality,
        effective_interval_seconds=effective_interval,
    )
    artifacts = [
        MediaPreviewArtifact(
            asset_type="THUMBNAIL_SPRITE",
            local_path=sheet_path,
            object_key=f"{_output_prefix(message)}/{sheet_path.name}",
            mime_type="image/jpeg",
            metadata=metadata,
        )
        for sheet_path, metadata in sheets
    ]
    return MediaPreviewPipelineOutput(
        artifacts=artifacts,
        summary={
            "frameCount": len(timestamps),
            "sheetCount": len(sheets),
            "effectiveIntervalSeconds": round(effective_interval, 6),
        },
    )


def _generate_waveform(
    message: MediaPreviewJobMessage,
    source_path: Path,
    duration_seconds: float,
    workspace: Path,
) -> MediaPreviewPipelineOutput:
    wav_path = ffmpeg_service.extract_pcm_wav(
        source_path,
        workspace / "waveform.wav",
        sample_rate=settings.waveform_sample_rate,
        duration_seconds=duration_seconds,
    )
    payload = build_waveform_payload(
        wav_path,
        requested_bins_per_second=settings.waveform_bins_per_second,
        maximum_bins=settings.waveform_max_bins,
    )
    output_path = write_compact_json(payload, workspace / "waveform.json")
    metadata = {key: value for key, value in payload.items() if key not in {"peaks"}}
    return MediaPreviewPipelineOutput(
        artifacts=[
            MediaPreviewArtifact(
                asset_type="WAVEFORM_PEAKS",
                local_path=output_path,
                object_key=f"{_output_prefix(message)}/waveform.json",
                mime_type="application/json",
                metadata=metadata,
            )
        ],
        summary={
            "binCount": payload["binCount"],
            "actualBinsPerSecond": payload["actualBinsPerSecond"],
        },
    )


def _output_prefix(message: MediaPreviewJobMessage) -> str:
    return (
        f"generated/workspaces/{message.workspace_id}/media/{message.media_id}"
        f"/previews/{message.job_id}"
    )
