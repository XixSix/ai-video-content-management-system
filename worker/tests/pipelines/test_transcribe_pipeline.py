from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from uuid import UUID

import pytest

from app.db.transcript_repository import (
    PersistedTranscriptSummary,
    TranscribeMediaSource,
)
from app.pipelines.transcribe import pipeline as transcribe_pipeline
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.transcribe.audio import AudioMetadata, AudioSanityResult
from app.schemas.transcribe.input import TranscribeOptions
from app.schemas.transcribe.result import TranscriptResult, TranscriptSegmentResult
from app.services.ffmpeg_service import FFmpegServiceError
from app.services.s3_service import S3ServiceError

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _job() -> ProcessingJobRow:
    return ProcessingJobRow.model_validate(
        {
            "id": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "jobType": JobType.TRANSCRIBE,
            "status": JobStatus.QUEUED,
            "progress": 0,
            "currentStep": None,
            "errorMessage": None,
            "queueName": "transcribe_queue",
            "taskName": "transcribe",
            "externalTaskId": None,
            "attemptCount": 0,
            "input": None,
            "output": None,
            "createdAt": "2026-05-27T00:00:00Z",
            "updatedAt": "2026-05-27T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def _source() -> TranscribeMediaSource:
    return TranscribeMediaSource(
        id=MEDIA_ID,
        user_id=USER_ID,
        workspace_id=UUID("00000000-0000-4000-8000-000000000005"),
        media_type="VIDEO",
        status="UPLOADED",
        s3_bucket="vidpilot-media",
        s3_key="uploads/video.mp4",
        s3_region="us-east-1",
        mime_type="video/mp4",
    )


def _options() -> TranscribeOptions:
    return TranscribeOptions.model_validate(
        {
            "language": "en",
            "generateSrt": True,
            "generateVtt": True,
            "burnTranscript": False,
            "vad": {"enabled": True, "sensitivity": "medium"},
            "sourceSeparation": {"enabled": False, "mode": "vocals_only"},
            "diarization": {"enabled": False},
            "wordTimestamps": {"enabled": True},
        }
    )


def _audio(audio_path: Path) -> AudioSanityResult:
    return AudioSanityResult(
        metadata=AudioMetadata(
            path=audio_path,
            duration_seconds=12.5,
            sample_rate=16000,
            channels=1,
            codec_name="pcm_s16le",
        ),
        silence_ratio=0.2,
    )


def _transcript_result() -> TranscriptResult:
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
                confidence=1.0,
            ),
            TranscriptSegmentResult(
                start_time=1.0,
                end_time=2.0,
                text="world",
                confidence=1.0,
            ),
        ],
        word_count=2,
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


def test_run_transcribe_pipeline_stores_audio_and_returns_completed_output(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    calls: dict[str, object] = {
        "presigned": 0,
        "extracted": 0,
        "called_ai_service": 0,
        "saved": 0,
    }
    storage_dir = tmp_path / "storage"

    monkeypatch.setattr(transcribe_pipeline, "get_db_session", _session)
    monkeypatch.setattr(transcribe_pipeline.settings, "storage_dir", storage_dir)

    def create_presigned_get_url(
        object_key: str, *, bucket: str, expires_in_seconds: int
    ) -> str:
        calls["presigned"] += 1
        assert object_key == "uploads/video.mp4"
        assert bucket == "vidpilot-media"
        assert (
            expires_in_seconds
            == transcribe_pipeline.settings.ffmpeg_timeout_seconds + 300
        )
        return "http://minio:9000/vidpilot-media/uploads/video.mp4?signature=test"

    def extract_audio(source: str, output_path: Path) -> Path:
        calls["extracted"] += 1
        assert (
            source
            == "http://minio:9000/vidpilot-media/uploads/video.mp4?signature=test"
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(b"wav")
        return output_path

    def validate_audio(audio_path: Path) -> AudioSanityResult:
        assert audio_path == storage_dir / "transcripts" / str(JOB_ID) / "audio.wav"
        assert audio_path.read_bytes() == b"wav"
        return _audio(audio_path)

    def transcribe(
        *,
        request_id: str,
        audio_path: Path,
        options: TranscribeOptions,
    ) -> TranscriptResult:
        calls["called_ai_service"] += 1
        assert request_id == str(JOB_ID)
        assert audio_path == storage_dir / "transcripts" / str(JOB_ID) / "audio.wav"
        assert options.language == "en"
        return _transcript_result()

    def save_transcript(
        session: object,
        *,
        job_id: str,
        media_id: str,
        result: TranscriptResult,
    ) -> PersistedTranscriptSummary:
        calls["saved"] += 1
        assert job_id == str(JOB_ID)
        assert media_id == str(MEDIA_ID)
        assert result.full_text == "Hello world"
        return _summary()

    monkeypatch.setattr(
        transcribe_pipeline.s3_service,
        "create_presigned_get_url",
        create_presigned_get_url,
    )
    monkeypatch.setattr(
        transcribe_pipeline.ffmpeg_service, "extract_audio", extract_audio
    )
    monkeypatch.setattr(
        transcribe_pipeline.ffmpeg_service, "validate_audio", validate_audio
    )
    monkeypatch.setattr(
        transcribe_pipeline.ai_service_client,
        "transcribe",
        transcribe,
    )
    monkeypatch.setattr(
        transcribe_pipeline.transcript_repository, "save_transcript", save_transcript
    )
    monkeypatch.setattr(
        transcribe_pipeline.transcript_repository,
        "load_transcribe_media_source",
        lambda session, media_id: _source(),
    )

    output = transcribe_pipeline.run_transcribe_pipeline(_job(), options=_options())

    assert calls == {
        "presigned": 1,
        "extracted": 1,
        "called_ai_service": 1,
        "saved": 1,
    }
    assert not (storage_dir / "transcripts" / str(JOB_ID) / "source.mp4").exists()
    assert (
        storage_dir / "transcripts" / str(JOB_ID) / "audio.wav"
    ).read_bytes() == b"wav"
    assert output.transcript_id == TRANSCRIPT_ID
    assert output.segment_count == 2
    assert output.word_count == 2


def test_run_transcribe_pipeline_maps_missing_source_to_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        transcribe_pipeline.settings, "storage_dir", tmp_path / "storage"
    )

    monkeypatch.setattr(transcribe_pipeline, "get_db_session", _session)
    monkeypatch.setattr(
        transcribe_pipeline.transcript_repository,
        "load_transcribe_media_source",
        lambda session, media_id: _source(),
    )

    def raise_not_found(
        object_key: str, *, bucket: str, expires_in_seconds: int
    ) -> str:
        raise S3ServiceError("not found", error_code="SOURCE_OBJECT_NOT_FOUND")

    monkeypatch.setattr(
        transcribe_pipeline.s3_service,
        "create_presigned_get_url",
        raise_not_found,
    )

    with pytest.raises(transcribe_pipeline.TerminalTranscribePipelineError) as error:
        transcribe_pipeline.run_transcribe_pipeline(_job(), options=_options())

    assert error.value.error_code == "SOURCE_OBJECT_NOT_FOUND"


def test_run_transcribe_pipeline_maps_audio_sanity_to_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        transcribe_pipeline.settings, "storage_dir", tmp_path / "storage"
    )

    monkeypatch.setattr(transcribe_pipeline, "get_db_session", _session)
    monkeypatch.setattr(
        transcribe_pipeline.transcript_repository,
        "load_transcribe_media_source",
        lambda session, media_id: _source(),
    )

    def create_presigned_get_url(
        object_key: str, *, bucket: str, expires_in_seconds: int
    ) -> str:
        return "http://minio:9000/vidpilot-media/uploads/video.mp4?signature=test"

    def extract_audio(source: str, output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(b"wav")
        return output_path

    def raise_audio_error(audio_path: Path) -> AudioSanityResult:
        raise FFmpegServiceError(
            "Audio is mostly silence",
            error_code="AUDIO_NO_SPEECH_DETECTED",
        )

    monkeypatch.setattr(
        transcribe_pipeline.s3_service,
        "create_presigned_get_url",
        create_presigned_get_url,
    )
    monkeypatch.setattr(
        transcribe_pipeline.ffmpeg_service, "extract_audio", extract_audio
    )
    monkeypatch.setattr(
        transcribe_pipeline.ffmpeg_service, "validate_audio", raise_audio_error
    )

    with pytest.raises(transcribe_pipeline.TerminalTranscribePipelineError) as error:
        transcribe_pipeline.run_transcribe_pipeline(_job(), options=_options())

    assert error.value.error_code == "AUDIO_NO_SPEECH_DETECTED"
