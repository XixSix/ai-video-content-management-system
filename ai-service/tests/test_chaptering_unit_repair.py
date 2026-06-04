from app.workflows.chaptering.schemas import ChapterUnit, UnitRepairConfig
from app.workflows.chaptering.unit_repair import repair_micro_units


def test_repair_micro_units_merges_acknowledgement_backward() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 8, "main topic has enough context"),
            _unit(2, 8.1, 8.5, "OK."),
            _unit(3, 9, 16, "next topic has enough context"),
        ],
        max_unit_duration=30,
        max_unit_words=20,
        max_unit_chars=1200,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "main topic has enough context OK.",
        "next topic has enough context",
    ]
    assert units[0].segment_ids == ["seg-1", "seg-2"]


def test_repair_micro_units_merges_leading_fragment_forward() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 8, "previous topic has enough context."),
            _unit(2, 8.5, 8.9, "At"),
            _unit(3, 9, 16, "number nine this topic starts"),
        ],
        max_unit_duration=30,
        max_unit_words=20,
        max_unit_chars=1200,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "previous topic has enough context.",
        "At number nine this topic starts",
    ]
    assert units[1].start_time == 8.5
    assert units[1].segment_ids == ["seg-2", "seg-3"]


def test_repair_micro_units_merges_lowercase_continuation_backward() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 9.4, "previous sentence starts but does not finish"),
            _unit(2, 9.4, 11.8, "this one completes it"),
            _unit(3, 21.6, 30, "next topic starts after a long gap."),
        ],
        max_unit_duration=20,
        max_unit_words=20,
        max_unit_chars=1200,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "previous sentence starts but does not finish this one completes it",
        "next topic starts after a long gap.",
    ]
    assert units[0].segment_ids == ["seg-1", "seg-2"]


def test_repair_micro_units_merges_transition_marker_forward() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 10, "previous section has enough context."),
            _unit(2, 10.1, 11.5, "Let's talk downsides. Nope."),
            _unit(3, 12.6, 19, "the next section explains the downsides."),
        ],
        max_unit_duration=20,
        max_unit_words=20,
        max_unit_chars=1200,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "previous section has enough context.",
        "Let's talk downsides. Nope. the next section explains the downsides.",
    ]
    assert units[1].start_time == 10.1
    assert units[1].segment_ids == ["seg-2", "seg-3"]


def test_repair_micro_units_skips_merge_when_budget_would_be_exceeded() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 8, "one two three four five"),
            _unit(2, 8.1, 8.5, "OK."),
            _unit(3, 9, 16, "six seven eight nine ten"),
        ],
        max_unit_duration=30,
        max_unit_words=5,
        max_unit_chars=1200,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "one two three four five",
        "OK.",
        "six seven eight nine ten",
    ]


def _repair_config() -> UnitRepairConfig:
    return UnitRepairConfig(
        short_duration_seconds=4.0,
        min_words=8,
        fragment_max_words=2,
        sparse_duration_seconds=6.0,
    )


def _unit(index: int, start: float, end: float, text: str) -> ChapterUnit:
    return ChapterUnit(
        unit_id=f"unit_{index:04d}",
        start_time=start,
        end_time=end,
        text=text,
        clean_text=text,
        segment_ids=[f"seg-{index}"],
    )
