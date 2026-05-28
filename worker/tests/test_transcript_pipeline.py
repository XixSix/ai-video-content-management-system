from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from uuid import UUID

import pytest

from app.db.transcript_repository import PersistedTranscriptSummary
from app.pipelines.transcript import pipeline as transcript_pipeline
from app.schemas.jobs.transcript_message import TranscriptJobMessage
from app.schemas.transcript.output import TranscriptJobOptions
from app.schemas.transcript.result import TranscriptResult, TranscriptSegmentResult
from app.services.ffmpeg_service import AudioMetadata, AudioSanityError, AudioSanityResult
from app.services.s3_service import S3SourceObjectNotFoundError

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _message() -> TranscriptJobMessage:
    return TranscriptJobMessage.model_validate(
        {
            "jobId": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "s3Key": "uploads/video.mp4",
            "taskName": "transcribe",
        }
    )


def _options() -> TranscriptJobOptions:
    return TranscriptJobOptions.model_validate(
        {
            "language": "vi",
            "generateSrt": True,
            "generateVtt": True,
            "burnTranscript": False,
            "useVad": True,
            "sourceSeparation": False,
            "useDiarization": False,
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
        language="vi",
        source="IMPORTED",
        model="ai-service-mock-transcriber-v1",
        full_text="Xin chao the gioi",
        segments=[
            TranscriptSegmentResult(
                start_time=0.0,
                end_time=1.0,
                text="Xin chao",
                confidence=1.0,
            ),
            TranscriptSegmentResult(
                start_time=1.0,
                end_time=2.0,
                text="the gioi",
                confidence=1.0,
            ),
        ],
        word_count=4,
    )


def _summary() -> PersistedTranscriptSummary:
    return PersistedTranscriptSummary(
        id=TRANSCRIPT_ID,
        media_id=MEDIA_ID,
        job_id=JOB_ID,
        language="vi",
        source="IMPORTED",
        model="ai-service-mock-transcriber-v1",
        full_text="Xin chao the gioi",
        segment_count=2,
        word_count=4,
    )


def test_run_transcript_pipeline_stores_audio_and_returns_completed_output(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    calls: dict[str, object] = {
        "downloaded": 0,
        "extracted": 0,
        "called_ai_service": 0,
        "saved": 0,
    }
    storage_dir = tmp_path / "storage"

    monkeypatch.setattr(transcript_pipeline, "get_db_session", _session)
    monkeypatch.setattr(transcript_pipeline.settings, "storage_dir", storage_dir)

    def download_file(s3_key: str, destination_path: Path) -> Path:
        calls["downloaded"] += 1
        assert s3_key == "uploads/video.mp4"
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        destination_path.write_bytes(b"video")
        return destination_path

    def extract_audio(source_path: Path, output_path: Path) -> Path:
        calls["extracted"] += 1
        assert source_path == storage_dir / "transcripts" / str(JOB_ID) / "source.mp4"
        assert source_path.read_bytes() == b"video"
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
        options: TranscriptJobOptions,
    ) -> TranscriptResult:
        calls["called_ai_service"] += 1
        assert request_id == str(JOB_ID)
        assert audio_path == storage_dir / "transcripts" / str(JOB_ID) / "audio.wav"
        assert options.language == "vi"
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
        assert result.full_text == "Xin chao the gioi"
        return _summary()

    monkeypatch.setattr(transcript_pipeline.s3_service, "download_file", download_file)
    monkeypatch.setattr(transcript_pipeline.ffmpeg_service, "extract_audio", extract_audio)
    monkeypatch.setattr(transcript_pipeline.ffmpeg_service, "validate_audio", validate_audio)
    monkeypatch.setattr(
        transcript_pipeline.ai_service_client,
        "transcribe",
        transcribe,
    )
    monkeypatch.setattr(transcript_pipeline.transcript_repository, "save_transcript", save_transcript)

    output = transcript_pipeline.run_transcript_pipeline(_message(), options=_options())

    assert calls == {
        "downloaded": 1,
        "extracted": 1,
        "called_ai_service": 1,
        "saved": 1,
    }
    assert (storage_dir / "transcripts" / str(JOB_ID) / "source.mp4").read_bytes() == b"video"
    assert (storage_dir / "transcripts" / str(JOB_ID) / "audio.wav").read_bytes() == b"wav"
    assert output.transcript.id == TRANSCRIPT_ID
    assert output.transcript.segment_count == 2
    assert output.audio.duration_seconds == 12.5
    assert output.audio.sample_rate == 16000
    assert output.audio.silence_ratio == 0.2


def test_run_transcript_pipeline_maps_missing_source_to_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(transcript_pipeline.settings, "storage_dir", tmp_path / "storage")

    def raise_not_found(s3_key: str, destination_path: Path) -> Path:
        raise S3SourceObjectNotFoundError("not found")

    monkeypatch.setattr(transcript_pipeline.s3_service, "download_file", raise_not_found)

    with pytest.raises(transcript_pipeline.TerminalTranscriptPipelineError) as error:
        transcript_pipeline.run_transcript_pipeline(_message(), options=_options())

    assert error.value.error_code == "SOURCE_OBJECT_NOT_FOUND"


def test_run_transcript_pipeline_maps_audio_sanity_to_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(transcript_pipeline.settings, "storage_dir", tmp_path / "storage")

    def download_file(s3_key: str, destination_path: Path) -> Path:
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        destination_path.write_bytes(b"video")
        return destination_path

    def extract_audio(source_path: Path, output_path: Path) -> Path:
        output_path.write_bytes(b"wav")
        return output_path

    def raise_audio_error(audio_path: Path) -> AudioSanityResult:
        raise AudioSanityError("AUDIO_NO_SPEECH_DETECTED", "Audio is mostly silence")

    monkeypatch.setattr(transcript_pipeline.s3_service, "download_file", download_file)
    monkeypatch.setattr(transcript_pipeline.ffmpeg_service, "extract_audio", extract_audio)
    monkeypatch.setattr(transcript_pipeline.ffmpeg_service, "validate_audio", raise_audio_error)

    with pytest.raises(transcript_pipeline.TerminalTranscriptPipelineError) as error:
        transcript_pipeline.run_transcript_pipeline(_message(), options=_options())

    assert error.value.error_code == "AUDIO_NO_SPEECH_DETECTED"
