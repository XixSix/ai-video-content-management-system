from uuid import UUID

import pytest

from app.pipelines.chaptering.errors import TerminalChapteringPipelineError
from app.pipelines.chaptering.validation import validate_transcript
from app.schemas.chaptering.result import (
    ChapteringTranscript,
    ChapteringTranscriptSegment,
)
from app.schemas.jobs.chaptering_message import ChapteringJobMessage

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")
SEGMENT_ID = UUID("00000000-0000-4000-8000-000000000005")


def _message(transcript_version: int = 2) -> ChapteringJobMessage:
    return ChapteringJobMessage.model_validate(
        {
            "jobId": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "transcriptId": str(TRANSCRIPT_ID),
            "transcriptVersion": transcript_version,
            "taskName": "generate_chapters",
        }
    )


def _segment(
    *,
    segment_id: UUID = SEGMENT_ID,
    start_time: float = 0.0,
    end_time: float = 4.0,
    text: str = "Hello everyone.",
) -> ChapteringTranscriptSegment:
    return ChapteringTranscriptSegment(
        id=segment_id,
        start_time=start_time,
        end_time=end_time,
        text=text,
        clean_text=None,
    )


def _transcript(
    *,
    version: int = 2,
    media_duration: float | None = 10.0,
    segments: list[ChapteringTranscriptSegment] | None = None,
) -> ChapteringTranscript:
    return ChapteringTranscript(
        id=TRANSCRIPT_ID,
        media_id=MEDIA_ID,
        language="en",
        version=version,
        media_duration=media_duration,
        segments=segments if segments is not None else [_segment()],
    )


def test_validate_transcript_accepts_valid_timestamped_segments() -> None:
    validate_transcript(_transcript(), _message())


@pytest.mark.parametrize(
    ("transcript", "expected_code"),
    [
        (_transcript(version=1), "TRANSCRIPT_VERSION_MISMATCH"),
        (_transcript(segments=[]), "TRANSCRIPT_EMPTY"),
        (
            _transcript(segments=[_segment(start_time=5.0, end_time=4.0)]),
            "TRANSCRIPT_INVALID_TIMESTAMPS",
        ),
        (
            _transcript(
                segments=[
                    _segment(start_time=5.0, end_time=6.0),
                    _segment(start_time=4.0, end_time=5.0),
                ]
            ),
            "TRANSCRIPT_UNSORTED",
        ),
        (
            _transcript(
                media_duration=5.0,
                segments=[_segment(start_time=0.0, end_time=7.0)],
            ),
            "TRANSCRIPT_OUT_OF_RANGE",
        ),
        (_transcript(segments=[_segment(text="   ")]), "TRANSCRIPT_EMPTY"),
    ],
)
def test_validate_transcript_rejects_invalid_inputs(
    transcript: ChapteringTranscript,
    expected_code: str,
) -> None:
    with pytest.raises(TerminalChapteringPipelineError) as error:
        validate_transcript(transcript, _message())

    assert error.value.error_code == expected_code
