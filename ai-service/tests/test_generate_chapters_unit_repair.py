from app.workflows.generate_chapters.schemas import ChapterUnit, UnitRepairConfig
from app.workflows.generate_chapters.unit_repair import repair_micro_units


def test_repair_micro_units_merges_acknowledgement_backward() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 8, "main topic has enough context"),
            _unit(2, 8, 8.5, "OK."),
            _unit(3, 9, 16, "next topic has enough context"),
        ],
        pause_boundary_seconds=1.0,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "main topic has enough context OK.",
        "next topic has enough context",
    ]
    assert units[0].segment_ids == ["seg-1", "seg-2"]


def test_repair_micro_units_preserves_clean_text_when_merging() -> None:
    units = repair_micro_units(
        [
            _unit(
                1,
                0,
                8,
                "raw topic has enough context",
                clean_text="edited topic has enough context",
            ),
            _unit(2, 8, 8.5, "OK.", clean_text="okay."),
        ],
        pause_boundary_seconds=1.0,
        config=_repair_config(),
    )

    assert units[0].text == "raw topic has enough context OK."
    assert units[0].clean_text == "edited topic has enough context okay."


def test_repair_micro_units_merges_leading_fragment_forward() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 8, "previous topic has enough context."),
            _unit(2, 8.5, 8.9, "At"),
            _unit(3, 8.9, 16, "number nine this topic starts"),
        ],
        pause_boundary_seconds=1.0,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "previous topic has enough context.",
        "At number nine this topic starts",
    ]
    assert units[1].start_time == 8.5
    assert units[1].segment_ids == ["seg-2", "seg-3"]


def test_repair_micro_units_treats_unicode_sentence_end_as_terminal() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 8, "previous topic has enough context。"),
            _unit(2, 8.5, 9.0, "OK。"),
            _unit(3, 9.0, 16, "next topic has enough context"),
        ],
        pause_boundary_seconds=1.0,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "previous topic has enough context。 OK。",
        "next topic has enough context",
    ]


def test_repair_micro_units_counts_numeric_tokens_consistently() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 8, "previous topic has enough context."),
            _unit(2, 8.5, 13.5, "step 1 item 2 value 3 done"),
            _unit(3, 13.5, 20, "next topic has enough context"),
        ],
        pause_boundary_seconds=1.0,
        config=UnitRepairConfig(
            short_duration_seconds=4.0,
            min_words=7,
            fragment_max_words=2,
            sparse_duration_seconds=6.0,
            continuation_gap_seconds=0.05,
        ),
    )

    assert [unit.text for unit in units] == [
        "previous topic has enough context.",
        "step 1 item 2 value 3 done",
        "next topic has enough context",
    ]


def test_repair_micro_units_merges_lowercase_continuation_backward() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 9.4, "previous sentence starts but does not finish"),
            _unit(2, 9.4, 11.8, "this one completes it"),
            _unit(3, 21.6, 30, "next topic starts after a long gap."),
        ],
        pause_boundary_seconds=1.0,
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
            _unit(3, 11.5, 19, "the next section explains the downsides."),
        ],
        pause_boundary_seconds=1.0,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "previous section has enough context.",
        "Let's talk downsides. Nope. the next section explains the downsides.",
    ]
    assert units[1].start_time == 10.1
    assert units[1].segment_ids == ["seg-2", "seg-3"]


def test_repair_micro_units_skips_merge_across_pause_gap() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 8, "one two three four five"),
            _unit(2, 9.5, 10, "OK."),
            _unit(3, 11.5, 16, "six seven eight nine ten"),
        ],
        pause_boundary_seconds=1.0,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "one two three four five",
        "OK.",
        "six seven eight nine ten",
    ]


def test_repair_micro_units_does_not_merge_transition_opener_backward() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 8, "previous topic has enough context."),
            _unit(2, 8, 8.3, "Now"),
            _unit(3, 10, 16, "next topic is separated by a pause"),
        ],
        pause_boundary_seconds=1.0,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "previous topic has enough context.",
        "Now",
        "next topic is separated by a pause",
    ]


def test_repair_micro_units_does_not_merge_backchannel_forward() -> None:
    units = repair_micro_units(
        [
            _unit(1, 0, 8, "previous topic has enough context."),
            _unit(2, 9.5, 10, "OK."),
            _unit(3, 10, 16, "next topic is adjacent"),
        ],
        pause_boundary_seconds=1.0,
        config=_repair_config(),
    )

    assert [unit.text for unit in units] == [
        "previous topic has enough context.",
        "OK.",
        "next topic is adjacent",
    ]


def _repair_config() -> UnitRepairConfig:
    return UnitRepairConfig(
        short_duration_seconds=4.0,
        min_words=8,
        fragment_max_words=2,
        sparse_duration_seconds=6.0,
        continuation_gap_seconds=0.05,
    )


def _unit(
    index: int,
    start: float,
    end: float,
    text: str,
    *,
    clean_text: str | None = None,
) -> ChapterUnit:
    return ChapterUnit(
        unit_id=f"unit_{index:04d}",
        start_time=start,
        end_time=end,
        text=text,
        clean_text=clean_text or text,
        segment_ids=[f"seg-{index}"],
    )
