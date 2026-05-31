from app.pipelines.chaptering.errors import TerminalChapteringPipelineError
from app.schemas.chaptering.result import ChapteringTranscript
from app.schemas.jobs.chaptering_message import ChapteringJobMessage


def validate_transcript(
    transcript: ChapteringTranscript,
    message: ChapteringJobMessage,
) -> None:
    """Reject empty, stale, unsorted, or out-of-range transcript inputs."""
    if transcript.version != message.transcript_version:
        raise TerminalChapteringPipelineError(
            "Transcript version does not match chaptering message",
            error_code="TRANSCRIPT_VERSION_MISMATCH",
        )

    if not transcript.segments:
        raise TerminalChapteringPipelineError(
            "Transcript has no timestamped segments",
            error_code="TRANSCRIPT_EMPTY",
        )

    has_text = False
    previous_start = -1.0

    for segment in transcript.segments:
        if segment.start_time >= segment.end_time:
            raise TerminalChapteringPipelineError(
                "Transcript segment startTime must be before endTime",
                error_code="TRANSCRIPT_INVALID_TIMESTAMPS",
            )

        if segment.start_time < previous_start:
            raise TerminalChapteringPipelineError(
                "Transcript segments must be sorted by timestamp",
                error_code="TRANSCRIPT_UNSORTED",
            )

        if (
            transcript.media_duration is not None
            and segment.end_time > transcript.media_duration + 1.0
        ):
            raise TerminalChapteringPipelineError(
                "Transcript segment exceeds media duration",
                error_code="TRANSCRIPT_OUT_OF_RANGE",
            )

        has_text = has_text or bool(segment.text.strip())
        previous_start = segment.start_time

    if not has_text:
        raise TerminalChapteringPipelineError(
            "Transcript text is empty",
            error_code="TRANSCRIPT_EMPTY",
        )
