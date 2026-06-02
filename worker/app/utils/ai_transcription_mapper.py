from pathlib import Path

from app.proto_path import ensure_proto_generated_on_path
from app.schemas.transcript.output import TranscriptJobOptions
from app.schemas.transcript.result import (
    TRANSCRIPT_SOURCE_IMPORTED,
    TranscriptResult,
    TranscriptSegmentResult,
    count_words,
)

ensure_proto_generated_on_path()

from transcription.v1 import transcription_pb2  # type: ignore # noqa: E402


def build_transcribe_request(
    *,
    request_id: str,
    audio_path: Path,
    options: TranscriptJobOptions,
) -> transcription_pb2.TranscribeRequest:  # type: ignore
    return transcription_pb2.TranscribeRequest(  # type: ignore
        request_id=request_id,
        local_path=str(audio_path),
        filename=audio_path.name,
        content_type="audio/wav",
        options=transcription_pb2.TranscriptionOptions(  # type: ignore
            language=options.language,
            enable_vad=options.use_vad,
            enable_diarization=options.use_diarization,
            enable_source_separation=options.source_separation,
        ),
    )


def map_transcribe_response(
    *,
    request_id: str,
    response: transcription_pb2.TranscribeResponse,  # type: ignore
) -> TranscriptResult:
    if response.request_id != request_id:
        raise ValueError("ai-service response request_id does not match request")

    segments = [
        TranscriptSegmentResult(
            start_time=segment.start_seconds,
            end_time=segment.end_seconds,
            text=segment.text,
            confidence=None,
            speaker_label=None,
        )
        for segment in response.segments
        if segment.text.strip()
    ]

    if not segments:
        raise ValueError("ai-service response did not include transcript segments")

    full_text = response.full_text.strip() or " ".join(
        segment.text for segment in segments
    )
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
