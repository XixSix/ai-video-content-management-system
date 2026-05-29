from app.providers.audio.noop_normalizer import NoopAudioNormalizer
from app.providers.source_separation.noop_demucs import NoopDemucsSourceSeparator
from app.providers.vad.noop_vad import NoopVad
from app.workflows.transcription.mock_transcriber import mock_transcriber
from app.workflows.transcription.workflow import TranscriptionWorkflow


def build_transcription_workflow() -> TranscriptionWorkflow:
    return TranscriptionWorkflow(
        normalizer=NoopAudioNormalizer(),
        source_separator=NoopDemucsSourceSeparator(),
        vad=NoopVad(),
        asr=mock_transcriber,
    )
