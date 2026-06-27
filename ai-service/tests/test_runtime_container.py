from pathlib import Path

from app.core.config import Settings
from app.providers.diarization.noop_diarization import NoopDiarization
from app.providers.diarization.pyannote_community import PyannoteCommunityDiarization
from app.providers.source_separation.demucs import DemucsSourceSeparator
from app.providers.source_separation.noop_demucs import NoopDemucsSourceSeparator
from app.runtime.container import _build_diarizer, _build_source_separator


def test_build_source_separator_uses_noop_by_default() -> None:
    separator = _build_source_separator(Settings(_env_file=None))

    assert isinstance(separator, NoopDemucsSourceSeparator)


def test_build_source_separator_uses_demucs_from_settings() -> None:
    settings = Settings(
        _env_file=None,
        SOURCE_SEPARATION_PROVIDER="demucs",
        DEMUCS_MODEL="htdemucs_ft",
        DEMUCS_DEVICE="cuda",
        DEMUCS_OUTPUT_DIR=Path("/tmp/custom-demucs"),
        DEMUCS_JOBS=2,
        DEMUCS_SHIFTS=1,
        DEMUCS_OVERLAP=0.4,
    )

    separator = _build_source_separator(settings)

    assert isinstance(separator, DemucsSourceSeparator)
    assert separator.model_name == "htdemucs_ft"


def test_build_diarizer_uses_noop_by_default() -> None:
    diarizer = _build_diarizer(Settings(_env_file=None))

    assert isinstance(diarizer, NoopDiarization)


def test_build_diarizer_uses_pyannote_from_settings() -> None:
    settings = Settings(
        _env_file=None,
        DIARIZATION_PROVIDER="pyannote",
        PYANNOTE_AUTH_TOKEN="hf_token",
        PYANNOTE_DIARIZATION_MODEL="pyannote/custom",
        DIARIZATION_DEVICE="cuda",
    )

    diarizer = _build_diarizer(settings)

    assert isinstance(diarizer, PyannoteCommunityDiarization)
    assert diarizer.model_name == "pyannote/custom"
