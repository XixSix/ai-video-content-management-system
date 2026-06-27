from types import ModuleType, SimpleNamespace

from app.provider_contracts.audio_decoder import AudioWaveform
from app.providers.diarization.pyannote_community import PyannoteCommunityDiarization


def test_pyannote_returns_empty_analysis_for_empty_audio() -> None:
    diarizer = PyannoteCommunityDiarization(
        model_name="pyannote/model",
        auth_token="token",
        device="cpu",
        pipeline=_FakePipeline([]),
    )

    analysis = diarizer.analyze_offline_audio(
        AudioWaveform(
            source_name="audio",
            sample_rate=16_000,
            channels=1,
            samples=(),
        )
    )

    assert analysis.speech_regions == []
    assert analysis.turns == []


def test_pyannote_maps_output_to_speech_regions_and_turns() -> None:
    diarizer = PyannoteCommunityDiarization(
        model_name="pyannote/model",
        auth_token="token",
        device="cpu",
        pipeline=_FakePipeline([(0.1, 0.3), (-1.0, 0.05), (0.8, 9.0)]),
    )

    analysis = diarizer.analyze_offline_audio(
        AudioWaveform(
            source_name="audio",
            sample_rate=10,
            channels=1,
            samples=tuple(0.0 for _ in range(10)),
        )
    )

    assert [(r.start_sample, r.end_sample) for r in analysis.speech_regions] == [
        (1, 3),
        (8, 10),
    ]
    assert [(t.start_sample, t.end_sample) for t in analysis.turns] == [
        (1, 3),
        (8, 10),
    ]


def test_pyannote_missing_token_returns_empty_analysis() -> None:
    diarizer = PyannoteCommunityDiarization(
        model_name="pyannote/model",
        auth_token="",
        device="cpu",
    )

    analysis = diarizer.analyze_offline_audio(_audio())

    assert analysis.speech_regions == []
    assert analysis.turns == []


def test_pyannote_warm_up_loads_pipeline_once(monkeypatch) -> None:
    load_calls: list[tuple[str, str]] = []
    PyannoteCommunityDiarization._pipeline_cache.clear()

    class FakePipelineFactory:
        @classmethod
        def from_pretrained(cls, model_name: str, token: str | None = None, **kwargs):
            _ = kwargs
            load_calls.append((model_name, token or ""))
            return _FakePipeline([])

    fake_pyannote = ModuleType("pyannote")
    fake_audio = ModuleType("pyannote.audio")
    fake_audio.Pipeline = FakePipelineFactory
    monkeypatch.setitem(__import__("sys").modules, "pyannote", fake_pyannote)
    monkeypatch.setitem(__import__("sys").modules, "pyannote.audio", fake_audio)

    first = PyannoteCommunityDiarization(
        model_name="pyannote/model",
        auth_token="token",
        device="",
    )
    second = PyannoteCommunityDiarization(
        model_name="pyannote/model",
        auth_token="token",
        device="",
    )

    first.warm_up()
    second.warm_up()

    assert load_calls == [("pyannote/model", "token")]


def _audio() -> AudioWaveform:
    return AudioWaveform(
        source_name="audio",
        sample_rate=16_000,
        channels=1,
        samples=(0.0, 0.1),
    )


class _FakePipeline:
    def __init__(self, turns: list[tuple[float, float]]) -> None:
        self._turns = turns

    def __call__(self, waveform_input):
        _ = waveform_input
        return _FakeOutput(self._turns)


class _FakeOutput:
    def __init__(self, turns: list[tuple[float, float]]) -> None:
        self.speaker_diarization = _FakeDiarization(turns)


class _FakeDiarization:
    def __init__(self, turns: list[tuple[float, float]]) -> None:
        self._turns = turns

    def itertracks(self, yield_label: bool = False):
        _ = yield_label
        for start, end in self._turns:
            yield SimpleNamespace(start=start, end=end), None, "speaker"
