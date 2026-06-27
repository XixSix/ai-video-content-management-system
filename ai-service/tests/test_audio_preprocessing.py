import numpy as np

from app.core.config import Settings
from app.provider_contracts.audio_decoder import AudioWaveform
from app.providers.audio.audio_preprocessing import AudioPreprocessor, preprocess_audio


def test_preprocess_audio_converts_pcm16_to_mono_float32() -> None:
    stereo_samples = np.array(
        [
            32767,
            -32768,
            0,
            16384,
        ],
        dtype="<i2",
    )

    audio = preprocess_audio(
        audio_bytes=stereo_samples.tobytes(),
        sample_rate=16_000,
        channels=2,
        encoding="pcm_s16le",
        target_sample_rate=16_000,
        target_loudness=-16.0,
        min_loudness=-70.0,
        min_normalize_seconds=0.4,
        peak_ceiling=0.98,
        wav_pcm_sample_width_bytes=2,
        enable_loudness_normalization=False,
    )

    assert audio.dtype == np.float32
    assert audio.shape == (2,)
    np.testing.assert_allclose(audio, [-0.000015, 0.25], atol=0.001)


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
