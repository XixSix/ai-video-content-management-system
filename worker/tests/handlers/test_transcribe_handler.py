from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from uuid import UUID

import pytest

from app.handlers import transcribe_handler
from app.pipelines.transcribe import pipeline as transcribe_pipeline
from app.db.transcript_repository import (
    PersistedTranscriptSummary,
    TranscribeMediaSource,
)
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.transcribe_message import TranscribeJobMessage
from app.schemas.transcribe.audio import AudioMetadata, AudioSanityResult
from app.schemas.transcribe.result import TranscriptResult, TranscriptSegmentResult
from app.services.ffmpeg_service import AudioSanityError
from app.services.s3_service import S3ServiceError, S3SourceObjectNotFoundError

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _message() -> TranscribeJobMessage:
    return TranscribeJobMessage.model_validate(
        {
            "version": 1,
            "jobId": str(JOB_ID),
            "jobType": JobType.TRANSCRIBE,
            "taskName": "transcribe",
        }
    )


def _job(status: JobStatus = JobStatus.PENDING) -> ProcessingJobRow:
    return ProcessingJobRow.model_validate(
        {
            "id": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "jobType": JobType.TRANSCRIBE,
            "status": status,
            "progress": 0,
            "currentStep": None,
            "errorMessage": None,
            "queueName": None,
            "taskName": "transcribe",
            "externalTaskId": None,
            "attemptCount": 0,
            "input": {
                "options": {
                    "language": "en",
                    "vad": {"enabled": True, "sensitivity": "medium"},
                    "sourceSeparation": {"enabled": False, "mode": "vocals_only"},
                    "diarization": {"enabled": False},
                    "wordTimestamps": {"enabled": True},
                },
            },
            "output": None,
            "createdAt": "2026-05-27T00:00:00Z",
            "updatedAt": "2026-05-27T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def _summary() -> PersistedTranscriptSummary:
    return PersistedTranscriptSummary(
        id=TRANSCRIPT_ID,
        media_id=MEDIA_ID,
        job_id=JOB_ID,
        language="en",
        source="IMPORTED",
        model="ai-service-mock-transcriber-v1",
        full_text="Hello world",
        segment_count=2,
        word_count=2,
    )


def _audio(tmp_path: Path) -> AudioSanityResult:
    return AudioSanityResult(
        metadata=AudioMetadata(
            path=tmp_path / "audio.wav",
            duration_seconds=10.0,
            sample_rate=16000,
            channels=1,
            codec_name="pcm_s16le",
        ),
        silence_ratio=0.1,
    )


def _patch_common(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> dict[str, object]:
    calls: dict[str, object] = {
        "completed_output": None,
        "downloaded": 0,
        "extracted": 0,
        "steps": [],
        "saved": 0,
        "called_ai_service": 0,
    }

    monkeypatch.setattr(transcribe_handler, "get_db_session", _session)
    monkeypatch.setattr(transcribe_pipeline, "get_db_session", _session)
    monkeypatch.setattr(
        transcribe_handler.settings, "storage_dir", tmp_path / "storage"
    )
    monkeypatch.setattr(
        transcribe_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        transcribe_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, **kwargs: _job(JobStatus.QUEUED),
    )

    def mark_completed(
        session: object, job_id: str, *, output: dict[str, object]
    ) -> None:
        calls["completed_output"] = output

    def mark_step(
        session: object,
        job_id: str,
        *,
        status: JobStatus,
        progress: int,
        current_step: str,
    ) -> None:
        calls["steps"].append((status, progress, current_step))

    def download_file(s3_key: str, destination_path: Path, *, bucket: str) -> Path:
        calls["downloaded"] += 1
        assert bucket == "vidpilot-media"
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        destination_path.write_bytes(b"video")
        return destination_path

    def extract_audio(source_path: Path, output_path: Path) -> Path:
        calls["extracted"] += 1
        output_path.write_bytes(b"wav")
        return output_path

    def save_transcript(
        session: object, *, job_id: str, media_id: str, result: object
    ) -> PersistedTranscriptSummary:
        calls["saved"] += 1
        return _summary()

    def transcribe(
        *,
        request_id: str,
        audio_path: Path,
        options: object,
    ) -> TranscriptResult:
        calls["called_ai_service"] += 1
        assert request_id == str(JOB_ID)
        assert (
            audio_path
            == tmp_path / "storage" / "transcripts" / str(JOB_ID) / "audio.wav"
        )
        return TranscriptResult(
            language="en",
            source="IMPORTED",
            model="ai-service-mock-transcriber-v1",
            full_text="Hello world",
            segments=[
                TranscriptSegmentResult(
                    start_time=0.0,
                    end_time=1.0,
                    text="Hello",
                ),
                TranscriptSegmentResult(
                    start_time=1.0,
                    end_time=2.0,
                    text="world",
                ),
            ],
            word_count=2,
        )

    monkeypatch.setattr(
        transcribe_handler.jobs_repository, "mark_job_completed", mark_completed
    )
    monkeypatch.setattr(transcribe_handler.jobs_repository, "mark_job_step", mark_step)
    monkeypatch.setattr(
        transcribe_handler.transcript_repository,
        "find_transcript_by_job_id",
        lambda session, job_id: None,
    )
    monkeypatch.setattr(
        transcribe_pipeline.transcript_repository,
        "find_transcript_by_job_id",
        lambda session, job_id: None,
    )
    monkeypatch.setattr(
        transcribe_pipeline.transcript_repository,
        "load_transcribe_media_source",
        lambda session, media_id: TranscribeMediaSource(
            id=MEDIA_ID,
            user_id=USER_ID,
            workspace_id=UUID("00000000-0000-4000-8000-000000000005"),
            media_type="VIDEO",
            status="UPLOADED",
            s3_bucket="vidpilot-media",
            s3_key="uploads/video.mp4",
            s3_region="us-east-1",
            mime_type="video/mp4",
        ),
    )
    monkeypatch.setattr(
        transcribe_pipeline.transcript_repository, "save_transcript", save_transcript
    )
    monkeypatch.setattr(transcribe_pipeline.s3_service, "download_file", download_file)
    monkeypatch.setattr(
        transcribe_pipeline.ffmpeg_service, "extract_audio", extract_audio
    )
    monkeypatch.setattr(
        transcribe_pipeline.ffmpeg_service,
        "validate_audio",
        lambda audio_path: _audio(tmp_path),
    )
    monkeypatch.setattr(transcribe_pipeline.ai_service_client, "transcribe", transcribe)

    return calls


def test_process_transcribe_job_happy_path_returns_contract(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    calls = _patch_common(monkeypatch, tmp_path)

    result = transcribe_handler.process_transcribe_job(_message())

    assert result == {
        "type": "transcript.job.result",
        "version": 1,
        "jobId": str(JOB_ID),
        "mediaId": str(MEDIA_ID),
        "userId": str(USER_ID),
        "status": "COMPLETED",
        "skipped": False,
    }
    assert calls["downloaded"] == 1
    assert calls["extracted"] == 1
    assert calls["called_ai_service"] == 1
    assert calls["saved"] == 1
    assert calls["steps"] == [
        (JobStatus.TRANSCRIBING, 50, "Transcribing media"),
    ]
    assert calls["completed_output"]["type"] == "transcribe.job.output"
    assert calls["completed_output"]["transcriptId"] == str(TRANSCRIPT_ID)
    assert calls["completed_output"]["segmentCount"] == 2
    assert calls["completed_output"]["wordCount"] == 2
    assert "mock" not in calls["completed_output"]
    storage_workspace = tmp_path / "storage" / "transcripts" / str(JOB_ID)
    assert (storage_workspace / "source.mp4").read_bytes() == b"video"
    assert (storage_workspace / "audio.wav").read_bytes() == b"wav"


def test_process_transcribe_job_checks_existing_before_download(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    calls = _patch_common(monkeypatch, tmp_path)
    monkeypatch.setattr(
        transcribe_handler.transcript_repository,
        "find_transcript_by_job_id",
        lambda session, job_id: _summary(),
    )

    result = transcribe_handler.process_transcribe_job(_message())

    assert result["skipped"] is True
    assert "transcriptId" not in result
    assert "segmentCount" not in result
    assert "wordCount" not in result
    assert calls["downloaded"] == 0
    assert calls["extracted"] == 0
    assert calls["saved"] == 0
    assert calls["steps"] == []


def test_process_transcribe_job_skips_non_pending_with_result_contract(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    _patch_common(monkeypatch, tmp_path)
    monkeypatch.setattr(
        transcribe_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(JobStatus.TRANSCRIBING),
    )
    monkeypatch.setattr(
        transcribe_handler.transcript_repository,
        "find_transcript_by_job_id",
        lambda session, job_id: None,
    )

    result = transcribe_handler.process_transcribe_job(_message())

    assert result["type"] == "transcript.job.result"
    assert result["status"] == "TRANSCRIBING"
    assert result["skipped"] is True
    assert "transcriptId" not in result
    assert "segmentCount" not in result
    assert "wordCount" not in result


def test_source_not_found_is_terminal(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _patch_common(monkeypatch, tmp_path)

    def raise_not_found(s3_key: str, destination_path: Path, *, bucket: str) -> Path:
        raise S3SourceObjectNotFoundError("not found")

    monkeypatch.setattr(
        transcribe_pipeline.s3_service, "download_file", raise_not_found
    )

    with pytest.raises(transcribe_pipeline.TerminalTranscribePipelineError) as error:
        transcribe_handler.process_transcribe_job(_message())

    assert error.value.error_code == "SOURCE_OBJECT_NOT_FOUND"


def test_s3_transient_failure_bubbles_for_retry(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _patch_common(monkeypatch, tmp_path)

    def raise_retryable(s3_key: str, destination_path: Path, *, bucket: str) -> Path:
        raise S3ServiceError("temporary")

    monkeypatch.setattr(
        transcribe_pipeline.s3_service, "download_file", raise_retryable
    )

    with pytest.raises(S3ServiceError):
        transcribe_handler.process_transcribe_job(_message())


def test_audio_sanity_failure_is_terminal(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _patch_common(monkeypatch, tmp_path)

    def raise_audio_error(audio_path: Path) -> AudioSanityResult:
        raise AudioSanityError("AUDIO_NO_SPEECH_DETECTED", "Audio is mostly silence")

    monkeypatch.setattr(
        transcribe_pipeline.ffmpeg_service, "validate_audio", raise_audio_error
    )

    with pytest.raises(transcribe_pipeline.TerminalTranscribePipelineError) as error:
        transcribe_handler.process_transcribe_job(_message())

    assert error.value.error_code == "AUDIO_NO_SPEECH_DETECTED"
