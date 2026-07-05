from app.workflows.short_clip.schemas import (
    ClipCandidateProposal,
    ShortClipCandidateInput,
)


class NoopShortClipCandidateProvider:
    def __init__(self, *, model_name: str = "noop-short-clip-v1") -> None:
        self._model_name = model_name

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def source(self) -> str:
        return "NOOP"

    def generate_candidates(
        self,
        candidate_input: ShortClipCandidateInput,
    ) -> list[ClipCandidateProposal]:
        segments = [
            segment for segment in candidate_input.segments if segment.text.strip()
        ]
        if not segments:
            return []

        proposals: list[ClipCandidateProposal] = []
        selected_ranges: set[tuple[str, str]] = set()

        for start_index, start_segment in enumerate(segments):
            for end_segment in segments[start_index:]:
                duration = end_segment.end_seconds - start_segment.start_seconds
                if duration < candidate_input.preferences.min_duration_seconds:
                    continue
                if duration > candidate_input.preferences.max_duration_seconds:
                    break

                segment_range = (
                    start_segment.segment_id,
                    end_segment.segment_id,
                )
                if segment_range in selected_ranges:
                    break

                proposals.append(
                    ClipCandidateProposal(
                        start_segment_id=start_segment.segment_id,
                        end_segment_id=end_segment.segment_id,
                        title=f"Generated short clip {len(proposals) + 1}",
                        reason="Deterministic local short clip candidate.",
                        score=max(1.0, 7.0 - len(proposals) * 0.5),
                    )
                )
                selected_ranges.add(segment_range)
                break

            if len(proposals) >= candidate_input.preferences.clip_count:
                break

        return proposals
