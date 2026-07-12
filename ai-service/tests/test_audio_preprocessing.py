from app.core.config import Settings
from app.provider_contracts.audio_decoder import AudioWaveform
from app.providers.audio.audio_preprocessing import AudioPreprocessor


def test_audio_preprocessing_preprocesses_waveform_with_settings_peak_ceiling() -> None:
    settings = Settings(
        _env_file=None,
        audio_target_sample_rate=16_000,
        audio_peak_ceiling=0.5,
    )
    preprocessor = AudioPreprocessor(
        settings=settings,
        enable_loudness_normalization=False,
    )

    audio = preprocessor.preprocess(
        audio=AudioWaveform(
            source_name="audio.wav",
            sample_rate=16_000,
            channels=1,
            samples=(1.0, 0.5),
        ),
    )

    assert audio.sample_rate == 16_000
    assert audio.channels == 1
    assert max(abs(sample) for sample in audio.samples) <= 0.5001
