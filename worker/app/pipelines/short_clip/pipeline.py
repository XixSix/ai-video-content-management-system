from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import UUID

from app.core.config import settings
from app.db import short_clip_repository
from app.db.client import get_db_session
from app.schemas.jobs.short_clip_message import (
    ShortClipJobMessage,
    ShortClipJobPreferences,
)
from app.schemas.short_clip.output import (
    ShortClipAssetSummary,
    ShortClipCandidateSummary,
    ShortClipCompletedOutput,
    ShortClipSummary,
)
from app.services.ffmpeg_service import FFmpegServiceError, ffmpeg_service
from app.services.s3_service import (
    S3ServiceError,
    S3SourceObjectNotFoundError,
    s3_service,
)


class TerminalShortClipPipelineError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


@dataclass(frozen=True)
class DraftClipCandidate:
    start_segment_id: UUID
    end_segment_id: UUID
    source_segment_ids: list[UUID]
    start_time: float
    end_time: float
    duration: float
    title: str
    reason: str
    score: float
    text: str


def run_short_clip_pipeline(
    message: ShortClipJobMessage,
) -> ShortClipCompletedOutput:
    settings.tmp_dir.mkdir(parents=True, exist_ok=True)
    preferences = message.preferences

    with get_db_session() as session:
        source = short_clip_repository.load_short_clip_source(
            session,
            media_id=str(message.media_id),
            transcript_id=str(message.transcript_id),
        )

    if source is None:
        raise TerminalShortClipPipelineError(
            "Media or transcript source was not found",
            error_code="SHORT_CLIP_SOURCE_NOT_FOUND",
        )

    _validate_source(source, message)
    drafts = build_fake_clip_candidates(source, preferences)

    if not drafts:
        raise TerminalShortClipPipelineError(
            "No valid short clip candidates could be generated",
            error_code="SHORT_CLIP_CANDIDATES_EMPTY",
        )

    with get_db_session() as session:
        persisted_candidates = short_clip_repository.save_clip_candidates(
            session,
            job_id=str(message.job_id),
            media_id=str(message.media_id),
            user_id=str(message.user_id),
            transcript_id=str(message.transcript_id),
            transcript_version=message.transcript_version,
            project_id=source.project_id,
            candidates=drafts,
            preferences=preferences,
        )
        selected_candidate = max(
            persisted_candidates,
            key=lambda candidate: candidate.score or 0.0,
        )
        short_clip = short_clip_repository.create_or_update_short_clip_for_candidate(
            session,
            candidate=selected_candidate,
            aspect_ratio=preferences.aspect_ratio,
        )

    with TemporaryDirectory(
        prefix=f"short-clip-{message.job_id}-",
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
                aspect_ratio=preferences.aspect_ratio,
                subtitle_path=subtitle_path if preferences.burn_subtitle else None,
            )
        except S3SourceObjectNotFoundError as error:
            _mark_short_clip_failed(short_clip.id)
            raise TerminalShortClipPipelineError(
                "Source media object was not found",
                error_code=error.error_code,
            ) from error
        except (OSError, S3ServiceError, FFmpegServiceError) as error:
            _mark_short_clip_failed(short_clip.id)
            raise TerminalShortClipPipelineError(
                str(error),
                error_code="SHORT_CLIP_RENDER_FAILED",
            ) from error

        video_key = _output_key(message, short_clip.id, "mp4")
        subtitle_key = _output_key(message, short_clip.id, "srt")
        s3_service.upload_file(output_path, video_key, content_type="video/mp4")
        s3_service.upload_file(subtitle_path, subtitle_key, content_type="text/plain")

        with get_db_session() as session:
            video_asset = short_clip_repository.upsert_short_clip_asset(
                session,
                user_id=str(message.user_id),
                media_id=str(message.media_id),
                project_id=str(source.project_id) if source.project_id else None,
                transcript_id=str(message.transcript_id),
                chapter_id=str(selected_candidate.chapter_id)
                if selected_candidate.chapter_id
                else None,
                short_clip_id=str(short_clip.id),
                job_id=str(message.job_id),
                asset_type="SHORT_CLIP_VIDEO",
                transcript_version=message.transcript_version,
                s3_bucket=settings.s3_bucket,
                s3_key=video_key,
                s3_region=settings.s3_region,
                mime_type="video/mp4",
                file_size_bytes=output_path.stat().st_size,
                metadata={
                    "aspectRatio": preferences.aspect_ratio,
                    "burnSubtitle": preferences.burn_subtitle,
                    "candidateId": str(selected_candidate.id),
                },
            )
            subtitle_asset = short_clip_repository.upsert_short_clip_asset(
                session,
                user_id=str(message.user_id),
                media_id=str(message.media_id),
                project_id=str(source.project_id) if source.project_id else None,
                transcript_id=str(message.transcript_id),
                chapter_id=str(selected_candidate.chapter_id)
                if selected_candidate.chapter_id
                else None,
                short_clip_id=str(short_clip.id),
                job_id=str(message.job_id),
                asset_type="SHORT_CLIP_SUBTITLE",
                transcript_version=message.transcript_version,
                s3_bucket=settings.s3_bucket,
                s3_key=subtitle_key,
                s3_region=settings.s3_region,
                mime_type="text/plain",
                file_size_bytes=subtitle_path.stat().st_size,
                metadata={"format": "srt", "candidateId": str(selected_candidate.id)},
            )
            short_clip_repository.mark_short_clip_ready(session, str(short_clip.id))

    return ShortClipCompletedOutput(
        transcript_id=message.transcript_id,
        transcript_version=message.transcript_version,
        candidate_ids=[candidate.id for candidate in persisted_candidates],
        short_clip_ids=[short_clip.id],
        asset_ids=[video_asset.id, subtitle_asset.id],
        candidates=[
            ShortClipCandidateSummary(
                id=candidate.id,
                start_time=candidate.start_time,
                end_time=candidate.end_time,
                duration=candidate.duration,
                title=candidate.title,
                score=candidate.score,
            )
            for candidate in persisted_candidates
        ],
        short_clips=[
            ShortClipSummary(
                id=short_clip.id,
                candidate_id=selected_candidate.id,
                status="READY",
            )
        ],
        assets=[
            ShortClipAssetSummary(
                id=video_asset.id,
                asset_type=video_asset.asset_type,
                s3_bucket=video_asset.s3_bucket,
                s3_key=video_asset.s3_key,
            ),
            ShortClipAssetSummary(
                id=subtitle_asset.id,
                asset_type=subtitle_asset.asset_type,
                s3_bucket=subtitle_asset.s3_bucket,
                s3_key=subtitle_asset.s3_key,
            ),
        ],
    )


def build_fake_clip_candidates(
    source: short_clip_repository.ShortClipSource,
    preferences: ShortClipJobPreferences,
) -> list[DraftClipCandidate]:
    """Build deterministic candidate windows from ordered transcript segments."""
    segments = source.segments
    candidates: list[DraftClipCandidate] = []

    for start_index, start_segment in enumerate(segments):
        window_segments: list[short_clip_repository.ShortClipTranscriptSegment] = []

        for segment in segments[start_index:]:
            window_segments.append(segment)
            duration = window_segments[-1].end_time - window_segments[0].start_time

            if duration < preferences.min_duration:
                continue

            if duration > preferences.max_duration:
                break

            candidates.append(_draft_from_segments(window_segments, preferences))
            break

        if len(candidates) >= preferences.clip_count:
            break

    if not candidates and segments:
        candidates.append(_draft_from_segments(segments[:1], preferences))

    return candidates[: preferences.clip_count]


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
    message: ShortClipJobMessage,
) -> None:
    if source.transcript.version != message.transcript_version:
        raise TerminalShortClipPipelineError(
            "Transcript version does not match short clip job",
            error_code="TRANSCRIPT_VERSION_MISMATCH",
        )

    if source.media.duration is None or source.media.duration <= 0:
        raise TerminalShortClipPipelineError(
            "Media duration is required for short clip generation",
            error_code="MEDIA_DURATION_INVALID",
        )

    if not source.segments:
        raise TerminalShortClipPipelineError(
            "Transcript has no timestamped segments",
            error_code="TRANSCRIPT_EMPTY",
        )

    previous_start = -1.0
    for index, segment in enumerate(source.segments):
        if segment.start_time >= segment.end_time:
            raise TerminalShortClipPipelineError(
                f"Transcript segment {index} has invalid timestamps",
                error_code="TRANSCRIPT_SEGMENT_INVALID",
            )
        if segment.start_time < previous_start:
            raise TerminalShortClipPipelineError(
                "Transcript segments are not sorted",
                error_code="TRANSCRIPT_SEGMENTS_UNSORTED",
            )
        if not segment.text.strip():
            raise TerminalShortClipPipelineError(
                f"Transcript segment {index} text is empty",
                error_code="TRANSCRIPT_SEGMENT_EMPTY",
            )
        previous_start = segment.start_time


def _draft_from_segments(
    segments: list[short_clip_repository.ShortClipTranscriptSegment],
    preferences: ShortClipJobPreferences,
) -> DraftClipCandidate:
    text = " ".join(segment.text.strip() for segment in segments).strip()
    title = _title_from_text(text)
    duration = segments[-1].end_time - segments[0].start_time
    duration_score = max(
        0.0,
        1.0
        - abs(duration - ((preferences.min_duration + preferences.max_duration) / 2))
        / max(preferences.max_duration, 1.0),
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


def _output_key(
    message: ShortClipJobMessage, short_clip_id: UUID, extension: str
) -> str:
    return (
        f"generated/short-clips/{message.media_id}/{message.job_id}/"
        f"{short_clip_id}.{extension}"
    )


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
