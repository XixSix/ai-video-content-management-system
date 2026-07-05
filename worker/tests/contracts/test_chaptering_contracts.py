from uuid import UUID

import pytest
from pydantic import ValidationError

from app.schemas.chaptering.output import (
    ChapteringCompletedOutput,
    ChapteringJobOptions,
    ChapteringOutputSummary,
)
from app.schemas.db.processsing_job import JobStatus
from app.schemas.jobs.chaptering_message import (
    ChapteringJobMessage,
    ChapteringJobResultMessage,
)

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")
CHAPTER_ID = UUID("00000000-0000-4000-8000-000000000005")


def test_chaptering_job_message_is_strict() -> None:
    payload = {
        "jobId": str(JOB_ID),
        "mediaId": str(MEDIA_ID),
        "userId": str(USER_ID),
        "transcriptId": str(TRANSCRIPT_ID),
        "transcriptVersion": 2,
        "taskName": "generate_chapters",
    }

    assert ChapteringJobMessage.model_validate(payload).transcript_id == TRANSCRIPT_ID

    with pytest.raises(ValidationError):
        ChapteringJobMessage.model_validate({**payload, "extra": True})

    with pytest.raises(ValidationError):
        ChapteringJobMessage.model_validate({**payload, "taskName": "wrong"})


def test_chaptering_result_message_has_stable_shape() -> None:
    result = ChapteringJobResultMessage(
        job_id=JOB_ID,
        media_id=MEDIA_ID,
        user_id=USER_ID,
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        status=JobStatus.COMPLETED,
        skipped=False,
    ).model_dump(mode="json", by_alias=True)

    assert result == {
        "type": "chaptering.job.result",
        "version": 1,
        "jobId": str(JOB_ID),
        "mediaId": str(MEDIA_ID),
        "userId": str(USER_ID),
        "transcriptId": str(TRANSCRIPT_ID),
        "transcriptVersion": 2,
        "status": "COMPLETED",
        "skipped": False,
    }


def test_completed_output_shape() -> None:
    output = ChapteringCompletedOutput(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        model="rule-based-chaptering-v1",
        chapter_count=1,
        chapters=[
            ChapteringOutputSummary(
                id=CHAPTER_ID,
                chapter_index=1,
                start_time=0.0,
                end_time=180.0,
                title="Introduction",
                summary="The speaker introduces the main topic.",
                transcript_version=2,
                source="SEGMENTS",
                score=1.0,
                boundary_score=1.0,
                pause_score=0.0,
                discourse_marker_score=0.0,
                semantic_shift_score=0.0,
                duration_score=1.0,
            )
        ],
        options=ChapteringJobOptions(
            transcript_id=TRANSCRIPT_ID,
            transcript_version=2,
            min_chapter_duration=120,
            target_chapter_duration=180,
            max_chapters=3,
        ),
    ).model_dump(mode="json", by_alias=True)

    assert output == {
        "type": "chaptering.completed",
        "version": 1,
        "transcriptId": str(TRANSCRIPT_ID),
        "transcriptVersion": 2,
        "model": "rule-based-chaptering-v1",
        "chapterCount": 1,
        "chapters": [
            {
                "id": str(CHAPTER_ID),
                "chapterIndex": 1,
                "startTime": 0.0,
                "endTime": 180.0,
                "title": "Introduction",
                "summary": "The speaker introduces the main topic.",
                "transcriptVersion": 2,
                "source": "SEGMENTS",
                "score": 1.0,
                "boundaryScore": 1.0,
                "pauseScore": 0.0,
                "discourseMarkerScore": 0.0,
                "semanticShiftScore": 0.0,
                "durationScore": 1.0,
            }
        ],
        "options": {
            "minChapterDuration": 120.0,
            "targetChapterDuration": 180.0,
            "maxChapters": 3,
            "useLlm": True,
            "useEmbeddings": False,
        },
    }
