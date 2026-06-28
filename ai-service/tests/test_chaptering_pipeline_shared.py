from app.workflows.chaptering.pipelines.shared import _merge_valley_gap_scores
from app.workflows.chaptering.schemas import ChapterGapScore


def test_merge_valley_gap_scores_preserves_all_timeline_gaps() -> None:
    gaps = [_gap(60, valley=0.0), _gap(422.964, valley=0.0), _gap(1216.936)]
    valleys = [_gap(422.964, valley=0.2529)]

    merged = _merge_valley_gap_scores(gaps, valleys)

    assert [gap.time for gap in merged] == [60, 422.964, 1216.936]
    assert merged[0].valley_depth_score == 0.0
    assert merged[1].valley_depth_score == 0.2529
    assert merged[2].valley_depth_score == 0.0


def _gap(time: float, *, valley: float = 0.0) -> ChapterGapScore:
    return ChapterGapScore(
        time=time,
        unit_index=int(time),
        unit_id=f"unit_{int(time):04d}",
        left_adjacent_unit_ids=[f"unit_{int(time) - 1:04d}"],
        right_adjacent_unit_ids=[f"unit_{int(time):04d}"],
        left_text="left context",
        right_text="right context",
        left_unit_ids=["left"],
        right_unit_ids=["right"],
        valley_depth_score=valley,
    )
