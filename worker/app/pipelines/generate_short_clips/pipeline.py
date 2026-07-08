import logging
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import UUID

from app.core.config import settings
from app.db import short_clip_repository
from app.db.client import get_db_session
from app.schemas.db.processsing_job import ProcessingJobRow
from app.schemas.short_clip.input import GenerateShortClipsOptions
from app.schemas.short_clip.output import GenerateShortClipsJobOutput
from app.schemas.short_clip.result import ShortClipCandidateResult
from app.services.ai_service import AIServiceTerminalError, ai_service_client
from app.services.ffmpeg_service import FFmpegServiceError, ffmpeg_service
from app.services.s3_service import (
    S3ServiceError,
    S3SourceObjectNotFoundError,
    s3_service,
)


logger = logging.getLogger(__name__)


class TerminalGenerateShortClipsPipelineError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


DraftClipCandidate = ShortClipCandidateResult


def run_generate_short_clips_pipeline(
    job: ProcessingJobRow,
    *,
    transcript_id: str,
    transcript_version: int,
    options: GenerateShortClipsOptions,
) -> GenerateShortClipsJobOutput:
    job_id = str(job.id)
    settings.tmp_dir.mkdir(parents=True, exist_ok=True)

    try:
        with get_db_session() as session:
            source = short_clip_repository.load_short_clip_source(
                session,
                media_id=str(job.media_id),
                transcript_id=transcript_id,
                transcript_version=transcript_version,
            )
    except short_clip_repository.TranscriptVersionMismatchError as error:
        raise TerminalGenerateShortClipsPipelineError(
            str(error),
            error_code="TRANSCRIPT_VERSION_MISMATCH",
        ) from error

    if source is None:
        raise TerminalGenerateShortClipsPipelineError(
            "Media or transcript source was not found",
            error_code="SHORT_CLIP_SOURCE_NOT_FOUND",
        )

    _validate_source(
        source,
        job,
        transcript_version=transcript_version,
    )
    drafts = generate_clip_candidates(job_id, source, options)

    if not drafts:
        raise TerminalGenerateShortClipsPipelineError(
            "No valid short clip candidates could be generated",
            error_code="SHORT_CLIP_CANDIDATES_EMPTY",
        )

    try:
        with get_db_session() as session:
            persisted_candidates = short_clip_repository.save_clip_candidates(
                session,
                job_id=str(job.id),
                media_id=str(job.media_id),
                user_id=str(job.user_id),
                transcript_id=transcript_id,
                transcript_version=transcript_version,
                project_id=source.project_id,
                candidates=drafts,
                options=options,
            )
            selected_candidate = max(
                persisted_candidates,
                key=lambda candidate: candidate.score or 0.0,
            )
            short_clip = (
                short_clip_repository.create_or_update_short_clip_for_candidate(
                    session,
                    candidate=selected_candidate,
                    aspect_ratio=options.aspect_ratio,
                )
            )
    except short_clip_repository.TranscriptVersionMismatchError as error:
        raise TerminalGenerateShortClipsPipelineError(
            str(error),
            error_code="TRANSCRIPT_VERSION_MISMATCH",
        ) from error

    with TemporaryDirectory(
        prefix=f"short-clip-{job.id}-",
        dir=settings.tmp_dir,
    ) as temporary_directory:
        workspace = Path(temporary_directory)
        source_path = workspace / _source_filename(source.media.s3_key)
        output_path = workspace / "short-clip.mp4"
        subtitle_path = workspace / "short-clip.srt"

        try:
            s3_service.download_file(
                source.media.s3_key,
                source_path,
                bucket=source.media.s3_bucket,
            )
            subtitle_path.write_text(
                build_srt_for_candidate(source.segments, selected_candidate.start_time),
                encoding="utf-8",
            )
            ffmpeg_service.render_short_clip(
                source_path,
                output_path,
                start_time=selected_candidate.start_time,
                duration=selected_candidate.duration,
                aspect_ratio=options.aspect_ratio,
                subtitle_path=subtitle_path if options.burn_subtitle else None,
            )
        except S3SourceObjectNotFoundError as error:
            _mark_short_clip_failed(short_clip.id)
            raise TerminalGenerateShortClipsPipelineError(
                "Source media object was not found",
                error_code=error.error_code,
            ) from error
        except (OSError, S3ServiceError, FFmpegServiceError) as error:
            _mark_short_clip_failed(short_clip.id)
            raise TerminalGenerateShortClipsPipelineError(
                str(error),
                error_code="SHORT_CLIP_RENDER_FAILED",
            ) from error

        video_key = _output_key(job, short_clip.id, "mp4")
        subtitle_key = _output_key(job, short_clip.id, "srt")
        s3_service.upload_file(
            output_path,
            video_key,
            content_type="video/mp4",
            bucket=source.media.s3_bucket,
        )
        s3_service.upload_file(
            subtitle_path,
            subtitle_key,
            content_type="text/plain",
            bucket=source.media.s3_bucket,
        )

        with get_db_session() as session:
            video_asset = short_clip_repository.upsert_short_clip_asset(
                session,
                user_id=str(job.user_id),
                media_id=str(job.media_id),
                project_id=str(source.project_id) if source.project_id else None,
                transcript_id=transcript_id,
                chapter_id=str(selected_candidate.chapter_id)
                if selected_candidate.chapter_id
                else None,
                short_clip_id=str(short_clip.id),
                job_id=str(job.id),
                asset_type="SHORT_CLIP_VIDEO",
                transcript_version=transcript_version,
                s3_bucket=source.media.s3_bucket,
                s3_key=video_key,
                s3_region=source.media.s3_region,
                mime_type="video/mp4",
                file_size_bytes=output_path.stat().st_size,
                metadata={
                    "aspectRatio": options.aspect_ratio,
                    "burnSubtitle": options.burn_subtitle,
                    "candidateId": str(selected_candidate.id),
                },
            )
            subtitle_asset = short_clip_repository.upsert_short_clip_asset(
                session,
                user_id=str(job.user_id),
                media_id=str(job.media_id),
                project_id=str(source.project_id) if source.project_id else None,
                transcript_id=transcript_id,
                chapter_id=str(selected_candidate.chapter_id)
                if selected_candidate.chapter_id
                else None,
                short_clip_id=str(short_clip.id),
                job_id=str(job.id),
                asset_type="SHORT_CLIP_SUBTITLE",
                transcript_version=transcript_version,
                s3_bucket=source.media.s3_bucket,
                s3_key=subtitle_key,
                s3_region=source.media.s3_region,
                mime_type="text/plain",
                file_size_bytes=subtitle_path.stat().st_size,
                metadata={"format": "srt", "candidateId": str(selected_candidate.id)},
            )
            short_clip_repository.mark_short_clip_ready(session, str(short_clip.id))

    candidate_ids = [candidate.id for candidate in persisted_candidates]
    short_clip_ids = [short_clip.id]
    asset_ids = [video_asset.id, subtitle_asset.id]

    return GenerateShortClipsJobOutput(
        transcript_id=UUID(transcript_id),
        transcript_version=transcript_version,
        candidate_count=len(candidate_ids),
        short_clip_count=len(short_clip_ids),
        asset_count=len(asset_ids),
        candidate_ids=candidate_ids,
        short_clip_ids=short_clip_ids,
        asset_ids=asset_ids,
    )


def build_fake_clip_candidates(
    source: short_clip_repository.ShortClipSource,
    options: GenerateShortClipsOptions,
) -> list[DraftClipCandidate]:
    """Build deterministic candidate windows from ordered transcript segments."""
    segments = source.segments
    candidates: list[DraftClipCandidate] = []

    for start_index, start_segment in enumerate(segments):
        window_segments: list[short_clip_repository.ShortClipTranscriptSegment] = []

        for segment in segments[start_index:]:
            window_segments.append(segment)
            duration = window_segments[-1].end_time - window_segments[0].start_time

            if duration < options.min_duration:
                continue

            if duration > options.max_duration:
                break

            candidates.append(_draft_from_segments(window_segments, options))
            break

        if len(candidates) >= options.clip_count:
            break

    if not candidates and segments:
        candidates.append(_draft_from_segments(segments[:1], options))

    return candidates[: options.clip_count]


def generate_clip_candidates(
    job_id: str,
    source: short_clip_repository.ShortClipSource,
    options: GenerateShortClipsOptions,
) -> list[DraftClipCandidate]:
    """Generate candidates through ai-service with a deterministic local fallback."""
    try:
        return ai_service_client.generate_short_clip_candidates(
            request_id=job_id,
            source=source,
            options=options,
        )
    except AIServiceTerminalError:
        raise
    except Exception:
        logger.exception(
            "ai-service short clip generation failed; using deterministic fallback "
            "job_id=%s",
            job_id,
        )
        return build_fake_clip_candidates(source, options)


def build_srt_for_candidate(
    segments: list[short_clip_repository.ShortClipTranscriptSegment],
    start_time: float,
) -> str:
    lines: list[str] = []
    index = 1

    for segment in segments:
        if segment.end_time <= start_time:
            continue

        relative_start = max(0.0, segment.start_time - start_time)
        relative_end = max(relative_start + 0.1, segment.end_time - start_time)
        lines.extend(
            [
                str(index),
                f"{_srt_time(relative_start)} --> {_srt_time(relative_end)}",
                segment.text.strip(),
                "",
            ]
        )
        index += 1

    return "\n".join(lines).strip() + "\n"


def _validate_source(
    source: short_clip_repository.ShortClipSource,
    job: ProcessingJobRow,
    *,
    transcript_version: int,
) -> None:
    if str(source.media.user_id) != str(job.user_id):
        raise TerminalGenerateShortClipsPipelineError(
            "Source media user does not match processing job",
            error_code="SHORT_CLIP_MEDIA_USER_MISMATCH",
        )

    if str(source.media.id) != str(job.media_id):
        raise TerminalGenerateShortClipsPipelineError(
            "Source media does not match processing job",
            error_code="SHORT_CLIP_MEDIA_MISMATCH",
        )

    if str(source.transcript.media_id) != str(job.media_id):
        raise TerminalGenerateShortClipsPipelineError(
            "Transcript media does not match processing job",
            error_code="SHORT_CLIP_TRANSCRIPT_MEDIA_MISMATCH",
        )

    if source.transcript.version != transcript_version:
        raise TerminalGenerateShortClipsPipelineError(
            "Transcript version does not match generate short clips job",
            error_code="TRANSCRIPT_VERSION_MISMATCH",
        )

    if source.media.duration is None or source.media.duration <= 0:
        raise TerminalGenerateShortClipsPipelineError(
            "Media duration is required for short clip generation",
            error_code="MEDIA_DURATION_INVALID",
        )

    if not source.segments:
        raise TerminalGenerateShortClipsPipelineError(
            "Transcript has no timestamped segments",
            error_code="TRANSCRIPT_EMPTY",
        )

    previous_start = -1.0
    for index, segment in enumerate(source.segments):
        if segment.start_time >= segment.end_time:
            raise TerminalGenerateShortClipsPipelineError(
                f"Transcript segment {index} has invalid timestamps",
                error_code="TRANSCRIPT_SEGMENT_INVALID",
            )
        if segment.start_time < previous_start:
            raise TerminalGenerateShortClipsPipelineError(
                "Transcript segments are not sorted",
                error_code="TRANSCRIPT_SEGMENTS_UNSORTED",
            )
        if not segment.text.strip():
            raise TerminalGenerateShortClipsPipelineError(
                f"Transcript segment {index} text is empty",
                error_code="TRANSCRIPT_SEGMENT_EMPTY",
            )
        previous_start = segment.start_time


def _draft_from_segments(
    segments: list[short_clip_repository.ShortClipTranscriptSegment],
    options: GenerateShortClipsOptions,
) -> DraftClipCandidate:
    text = " ".join(segment.text.strip() for segment in segments).strip()
    title = _title_from_text(text)
    duration = segments[-1].end_time - segments[0].start_time
    duration_score = max(
        0.0,
        1.0
        - abs(duration - ((options.min_duration + options.max_duration) / 2))
        / max(options.max_duration, 1.0),
    )
    text_score = min(len(text.split()) / 80, 1.0)
    score = round(6.0 + (duration_score * 2.0) + (text_score * 2.0), 2)

    return DraftClipCandidate(
        start_segment_id=segments[0].id,
        end_segment_id=segments[-1].id,
        source_segment_ids=[segment.id for segment in segments],
        start_time=segments[0].start_time,
        end_time=segments[-1].end_time,
        duration=duration,
        title=title,
        reason="Deterministic MVP candidate built from timestamped transcript segments.",
        score=min(score, 10.0),
        text=text,
        provider="deterministic-fake",
        model="deterministic-short-clip-v1",
    )


def _title_from_text(text: str) -> str:
    words = text.split()
    if not words:
        return "Generated short clip"
    title = " ".join(words[:8])
    return title[:80]


def _source_filename(s3_key: str) -> str:
    filename = Path(s3_key).name
    return filename or "source.mp4"


def _output_key(job: ProcessingJobRow, short_clip_id: UUID, extension: str) -> str:
    return f"generated/short-clips/{job.media_id}/{job.id}/{short_clip_id}.{extension}"


def _mark_short_clip_failed(short_clip_id: UUID) -> None:
    with get_db_session() as session:
        short_clip_repository.mark_short_clip_failed(session, str(short_clip_id))


def _srt_time(seconds: float) -> str:
    milliseconds = int(round(max(seconds, 0.0) * 1000))
    hours = milliseconds // 3_600_000
    milliseconds %= 3_600_000
    minutes = milliseconds // 60_000
    milliseconds %= 60_000
    whole_seconds = milliseconds // 1000
    milliseconds %= 1000
    return f"{hours:02}:{minutes:02}:{whole_seconds:02},{milliseconds:03}"
