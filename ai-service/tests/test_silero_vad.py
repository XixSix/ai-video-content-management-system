from app.provider_contracts.audio_decoder import AudioWaveform
from app.providers.vad import silero_vad
from app.providers.vad.silero_vad import SileroVad


def test_detect_speech_regions_returns_empty_for_empty_audio() -> None:
    vad = _vad()

    assert vad.detect_speech_regions(_audio(samples=())) == []


def test_detect_speech_regions_maps_silero_output(
    monkeypatch,
) -> None:
    calls: list[str] = []

    monkeypatch.setattr(
        silero_vad.silero_vad,
        "load_silero_vad",
        lambda onnx=False: "model",
    )

    def fake_get_speech_timestamps(audio, model, **kwargs):
        calls.append("run")
        assert model == "model"
        assert kwargs["sampling_rate"] == 16_000
        assert kwargs["threshold"] == 0.5
        return [
            {"start": 2, "end": 5},
            {"start": -10, "end": 1},
            {"start": 7, "end": 99},
        ]

    monkeypatch.setattr(
        silero_vad.silero_vad,
        "get_speech_timestamps",
        fake_get_speech_timestamps,
    )

    regions = _vad().detect_speech_regions(
        _audio(samples=(0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7))
    )

    assert calls == ["run"]
    assert [(region.start_sample, region.end_sample) for region in regions] == [
        (2, 5),
        (0, 1),
        (7, 8),
    ]


def test_has_speech_wraps_detect_speech_regions(monkeypatch) -> None:
    monkeypatch.setattr(
        silero_vad.silero_vad,
        "load_silero_vad",
        lambda onnx=False: "model",
    )
    monkeypatch.setattr(
        silero_vad.silero_vad,
        "get_speech_timestamps",
        lambda audio, model, **kwargs: [{"start": 0, "end": 1}],
    )

    assert _vad().has_speech(_audio(samples=(0.1, 0.2))) is True


def test_warm_up_loads_model_once(monkeypatch) -> None:
    calls: list[bool] = []
    monkeypatch.setattr(
        silero_vad.silero_vad,
        "load_silero_vad",
        lambda onnx=False: calls.append(onnx) or "model",
    )
    monkeypatch.setattr(
        silero_vad.silero_vad,
        "get_speech_timestamps",
        lambda audio, model, **kwargs: [],
    )
    vad = _vad(use_onnx=True)

    vad.warm_up()
    vad.warm_up()

    assert calls == [True]


def test_rejects_unexpected_sample_rate() -> None:
    vad = _vad()

    try:
        vad.detect_speech_regions(
            AudioWaveform(
                source_name="audio",
                sample_rate=8_000,
                channels=1,
                samples=(0.1, 0.2),
            )
        )
    except ValueError as error:
        assert "16000 Hz" in str(error)
    else:
        raise AssertionError("expected ValueError")


def _vad(*, use_onnx: bool = False) -> SileroVad:
    return SileroVad(
        sample_rate=16_000,
        threshold=0.5,
        min_speech_duration_ms=250,
        min_silence_duration_ms=100,
        speech_pad_ms=30,
        use_onnx=use_onnx,
    )


def _audio(*, samples: tuple[float, ...]) -> AudioWaveform:
    return AudioWaveform(
        source_name="audio",
        sample_rate=16_000,
        channels=1,
        samples=samples,
    )
