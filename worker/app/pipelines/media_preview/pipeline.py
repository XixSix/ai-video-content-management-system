from pathlib import Path

from PIL import UnidentifiedImageError

from app.core.config import settings
from app.db import media_preview_repository
from app.db.client import get_db_session
from app.errors import TerminalPipelineError
from app.errors.policies import (
    raise_if_retryable,
    raise_terminal,
)
from app.pipelines.media_preview.algorithms import (
    build_sprite_timestamps,
    build_thumbnail_timestamps,
    build_waveform_payload,
    compose_sprite_sheets,
    save_thumbnail,
    select_best_thumbnail,
    write_compact_json,
)
from app.schemas.db.processsing_job import JobType, ProcessingJobRow
from app.schemas.media_preview.output import (
    MediaPreviewArtifact,
    MediaPreviewJobOutput,
    MediaPreviewPipelineOutput,
)
from app.services.ffmpeg_service import (
    FFmpegServiceError,
    ffmpeg_service,
)
from app.services.s3_service import S3ServiceError, s3_service


class TerminalMediaPreviewPipelineError(TerminalPipelineError):
    pass


MEDIA_PREVIEW_TERMINAL_S3_CODES = {"SOURCE_OBJECT_NOT_FOUND"}
MEDIA_PREVIEW_TERMINAL_FFMPEG_CODES = {
    "FFMPEG_BINARY_NOT_FOUND",
    "FFMPEG_COMMAND_FAILED",
    "FFMPEG_INVALID_PROBE_JSON",
    "FFMPEG_OUTPUT_EMPTY",
    "FFMPEG_SPRITE_FRAME_COUNT_MISMATCH",
    "MEDIA_INVALID_DURATION",
    "MEDIA_STREAMS_NOT_FOUND",
}


def run_media_preview_pipeline(
    job: ProcessingJobRow,
) -> MediaPreviewJobOutput:
    """Run media preview processing, upload artifacts to S3, persist to DB, and
    return a completed output struct."""
    job_id = str(job.id)

    with get_db_session() as session:
        source = media_preview_repository.load_media_preview_source(
            session,
            str(job.media_id),
        )

    source = _validate_source(job, source)
    workspace = _workspace_for_job(job_id)
    workspace.mkdir(parents=True, exist_ok=True)
    source_suffix = Path(source.s3_key).suffix or ".source"
    source_path = workspace / f"source{source_suffix}"

    try:
        s3_service.download_file(
            source.s3_key,
            source_path,
            bucket=source.s3_bucket,
        )
        probe = ffmpeg_service.probe_media(source_path)

        if job.job_type == JobType.GENERATE_THUMBNAIL:
            if not probe.has_video:
                raise TerminalMediaPreviewPipelineError(
                    "Source media has no video stream",
                    error_code="VIDEO_STREAM_NOT_FOUND",
                )
            pipeline_output = _generate_thumbnail(
                job, source, source_path, probe.duration_seconds, workspace
            )

        elif job.job_type == JobType.GENERATE_THUMBNAIL_SPRITE:
            if not probe.has_video:
                raise TerminalMediaPreviewPipelineError(
                    "Source media has no video stream",
                    error_code="VIDEO_STREAM_NOT_FOUND",
                )
            pipeline_output = _generate_sprite(
                job, source, source_path, probe.duration_seconds, workspace
            )

        else:
            if not probe.has_audio:
                raise TerminalMediaPreviewPipelineError(
                    "Source media has no audio stream",
                    error_code="AUDIO_STREAM_NOT_FOUND",
                )
            pipeline_output = _generate_waveform(
                job,
                source,
                source_path,
                probe.duration_seconds,
                workspace,
            )
    except S3ServiceError as error:
        raise_if_retryable(error, terminal_codes=MEDIA_PREVIEW_TERMINAL_S3_CODES)
        raise_terminal(
            error,
            TerminalMediaPreviewPipelineError,
            message="Source media was not found",
        )
    except FFmpegServiceError as error:
        raise_if_retryable(
            error,
            terminal_codes=MEDIA_PREVIEW_TERMINAL_FFMPEG_CODES,
        )

        if error.error_code == "FFMPEG_BINARY_NOT_FOUND":
            raise_terminal(
                error,
                TerminalMediaPreviewPipelineError,
                error_code="FFMPEG_NOT_AVAILABLE",
            )

        raise_terminal(
            error,
            TerminalMediaPreviewPipelineError,
            error_code="INVALID_MEDIA",
        )
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise TerminalMediaPreviewPipelineError(
            str(error),
            error_code="INVALID_PREVIEW_OUTPUT",
        ) from error

    for artifact in pipeline_output.artifacts:
        s3_service.upload_file(
            artifact.local_path,
            artifact.object_key,
            content_type=artifact.mime_type,
            bucket=source.s3_bucket,
        )

    with get_db_session() as session:
        persisted = [
            media_preview_repository.upsert_asset(
                session,
                user_id=str(job.user_id),
                media_id=str(job.media_id),
                job_id=job_id,
                asset_type=artifact.asset_type,
                s3_bucket=source.s3_bucket,
                s3_key=artifact.object_key,
                s3_region=source.s3_region,
                mime_type=artifact.mime_type,
                file_size_bytes=artifact.local_path.stat().st_size,
                metadata=artifact.metadata,
            )
            for artifact in pipeline_output.artifacts
        ]

    asset_ids = [asset.id for asset in persisted]
    return MediaPreviewJobOutput(
        asset_count=len(asset_ids),
        asset_ids=asset_ids,
    )


def _generate_thumbnail(
    job: ProcessingJobRow,
    source: media_preview_repository.MediaPreviewSource,
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
    object_key = f"{_output_prefix(job, source)}/thumbnail.jpg"
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
    job: ProcessingJobRow,
    source: media_preview_repository.MediaPreviewSource,
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
            object_key=f"{_output_prefix(job, source)}/{sheet_path.name}",
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
    job: ProcessingJobRow,
    source: media_preview_repository.MediaPreviewSource,
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
                object_key=f"{_output_prefix(job, source)}/waveform.json",
                mime_type="application/json",
                metadata=metadata,
            )
        ],
        summary={
            "binCount": payload["binCount"],
            "actualBinsPerSecond": payload["actualBinsPerSecond"],
        },
    )


def _validate_source(
    job: ProcessingJobRow,
    source: media_preview_repository.MediaPreviewSource | None,
) -> media_preview_repository.MediaPreviewSource:
    if source is None:
        raise TerminalMediaPreviewPipelineError(
            "Source media was not found",
            error_code="MEDIA_PREVIEW_SOURCE_NOT_FOUND",
        )

    if str(source.user_id) != str(job.user_id):
        raise TerminalMediaPreviewPipelineError(
            "Source media user does not match processing job",
            error_code="MEDIA_PREVIEW_USER_MISMATCH",
        )

    if source.status != "UPLOADED":
        raise TerminalMediaPreviewPipelineError(
            "Source media is not uploaded",
            error_code="MEDIA_PREVIEW_MEDIA_NOT_UPLOADED",
        )

    if job.job_type in {
        JobType.GENERATE_THUMBNAIL,
        JobType.GENERATE_THUMBNAIL_SPRITE,
    } and source.media_type not in {"VIDEO", "IMAGE"}:
        raise TerminalMediaPreviewPipelineError(
            "Source media type does not support thumbnail previews",
            error_code="MEDIA_PREVIEW_MEDIA_TYPE_UNSUPPORTED",
        )

    if job.job_type == JobType.GENERATE_WAVEFORM_PEAK and source.media_type not in {
        "VIDEO",
        "AUDIO",
    }:
        raise TerminalMediaPreviewPipelineError(
            "Source media type does not support waveform previews",
            error_code="MEDIA_PREVIEW_MEDIA_TYPE_UNSUPPORTED",
        )

    return source


def _workspace_for_job(job_id: str) -> Path:
    return settings.storage_dir / "media-previews" / job_id


def _output_prefix(
    job: ProcessingJobRow,
    source: media_preview_repository.MediaPreviewSource,
) -> str:
    return (
        f"generated/workspaces/{source.workspace_id}/media/{job.media_id}"
        f"/previews/{job.id}"
    )
