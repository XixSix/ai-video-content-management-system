from pathlib import Path

from app.proto_path import ensure_proto_generated_on_path
from app.schemas.transcribe.input import TranscribeOptions
from app.schemas.transcribe.result import (
    TRANSCRIPT_SOURCE_IMPORTED,
    TranscriptResult,
    TranscriptSegmentResult,
    count_words,
)

ensure_proto_generated_on_path()

from transcribe.v1 import transcribe_pb2  # type: ignore # noqa: E402


def build_transcribe_request(
    *,
    request_id: str,
    audio_path: Path,
    options: TranscribeOptions,
) -> transcribe_pb2.TranscribeRequest:  # type: ignore
    diarization_options = transcribe_pb2.DiarizationOptions(  # type: ignore
        enabled=options.diarization.enabled,
    )
    if options.diarization.num_speakers is not None:
        diarization_options.num_speakers = options.diarization.num_speakers
    if options.diarization.min_speakers is not None:
        diarization_options.min_speakers = options.diarization.min_speakers
    if options.diarization.max_speakers is not None:
        diarization_options.max_speakers = options.diarization.max_speakers

    return transcribe_pb2.TranscribeRequest(  # type: ignore
        job_id=request_id,
        audio=transcribe_pb2.AudioSource(local_path=str(audio_path)),  # type: ignore
        options=transcribe_pb2.TranscribeOptions(  # type: ignore
            language=options.language,
            vad=transcribe_pb2.VADOptions(  # type: ignore
                enabled=options.vad.enabled,
                sensitivity=options.vad.sensitivity,
            ),
            diarization=diarization_options,
            source_separation=transcribe_pb2.SourceSeparationOptions(  # type: ignore
                enabled=options.source_separation.enabled,
                mode=options.source_separation.mode,
            ),
            word_timestamps=transcribe_pb2.WordTimestampsOptions(  # type: ignore
                enabled=options.word_timestamps.enabled,
            ),
        ),
    )


def map_transcribe_response(
    *,
    request_id: str,
    response: transcribe_pb2.TranscribeResponse,  # type: ignore
) -> TranscriptResult:
    if response.job_id != request_id:
        raise ValueError("ai-service response job_id does not match request")

    if response.status == transcribe_pb2.TRANSCRIBE_STATUS_FAILED:  # type: ignore
        if response.HasField("error"):
            error_code = transcribe_pb2.TranscribeErrorCode.Name(response.error.code)  # type: ignore
            raise ValueError(f"{error_code}: {response.error.message}")

        raise ValueError("ai-service transcription failed without error details")

    if response.status != transcribe_pb2.TRANSCRIBE_STATUS_COMPLETED:  # type: ignore
        raise ValueError("ai-service response did not complete transcription")

    segments = [
        TranscriptSegmentResult(
            start_time=segment.start_seconds,
            end_time=segment.end_seconds,
            text=segment.text,
            confidence=segment.confidence if segment.HasField("confidence") else None,
            speaker_label=segment.speaker if segment.HasField("speaker") else None,
        )
        for segment in response.segments
        if segment.text.strip()
    ]

    if not segments:
        raise ValueError("ai-service response did not include transcript segments")

    full_text = " ".join(segment.text for segment in segments)
    model = response.asr_model.strip() or "ai-service-unknown"
    language = response.language.strip() or "auto"

    return TranscriptResult(
        language=language,
        source=TRANSCRIPT_SOURCE_IMPORTED,
        model=model,
        full_text=full_text,
        segments=segments,
        word_count=count_words(full_text),
    )
