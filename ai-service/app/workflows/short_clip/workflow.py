from logging import getLogger

from app.provider_contracts.short_clip_candidate import ShortClipCandidateProviderPort
from app.schemas.short_clip import (
    ClipCandidate,
    ShortClipGenerationRequest,
    ShortClipGenerationResult,
    ShortClipSource,
    ShortClipTranscriptSegment,
)
from app.workflows.short_clip.schemas import (
    ClipCandidateProposal,
    ShortClipCandidateInput,
)

logger = getLogger(__name__)


class ShortClipWorkflow:
    def __init__(
        self,
        *,
        candidate_provider: ShortClipCandidateProviderPort,
        fallback_candidate_provider: ShortClipCandidateProviderPort | None = None,
    ) -> None:
        self._candidate_provider = candidate_provider
        self._fallback_candidate_provider = fallback_candidate_provider

    def execute(
        self,
        request: ShortClipGenerationRequest,
    ) -> ShortClipGenerationResult:
        """Generate and validate short clip candidates from transcript context.

        The provider proposes segment-id boundaries only. The workflow owns
        deterministic repair: mapping ids to transcript segments, deriving
        timestamps and text excerpts, clamping scores, de-duplicating ranges,
        and dropping invalid proposals.
        """
        provider_input = ShortClipCandidateInput(
            language=request.language,
            media_duration_seconds=request.media_duration_seconds,
            segments=request.segments,
            chapters=request.chapters,
            preferences=request.preferences,
        )
        candidates, provider = self._generate_repaired_candidates(
            request=request,
            provider_input=provider_input,
        )

        return ShortClipGenerationResult(
            request_id=request.request_id,
            language=request.language,
            model=provider.model_name,
            source=_provider_source(provider.source),
            candidates=candidates,
        )

    def _generate_repaired_candidates(
        self,
        *,
        request: ShortClipGenerationRequest,
        provider_input: ShortClipCandidateInput,
    ) -> tuple[list[ClipCandidate], ShortClipCandidateProviderPort]:
        """Return repaired candidates, falling back when LLM output is unusable."""
        try:
            proposals = self._candidate_provider.generate_candidates(provider_input)
            candidates = _repair_candidates(request=request, proposals=proposals)
        except Exception:
            if self._fallback_candidate_provider is None:
                raise

            logger.exception("Short clip candidate provider failed")
            return self._generate_with_fallback(request, provider_input)

        if candidates or self._fallback_candidate_provider is None:
            return candidates, self._candidate_provider

        logger.warning("Short clip candidate provider returned no valid candidates")
        return self._generate_with_fallback(request, provider_input)

    def _generate_with_fallback(
        self,
        request: ShortClipGenerationRequest,
        provider_input: ShortClipCandidateInput,
    ) -> tuple[list[ClipCandidate], ShortClipCandidateProviderPort]:
        fallback = self._fallback_candidate_provider
        if fallback is None:
            return [], self._candidate_provider

        proposals = fallback.generate_candidates(provider_input)
        return _repair_candidates(request=request, proposals=proposals), fallback


def _repair_candidates(
    *,
    request: ShortClipGenerationRequest,
    proposals: list[ClipCandidateProposal],
) -> list[ClipCandidate]:
    segments_by_id = {segment.segment_id: segment for segment in request.segments}
    segment_index_by_id = {
        segment.segment_id: index for index, segment in enumerate(request.segments)
    }
    candidates: list[ClipCandidate] = []
    selected_ranges: set[tuple[str, str]] = set()

    for proposal in proposals:
        start_segment_id = proposal.start_segment_id.strip()
        end_segment_id = proposal.end_segment_id.strip()
        candidate_range = (start_segment_id, end_segment_id)
        if candidate_range in selected_ranges:
            continue

        start_index = segment_index_by_id.get(start_segment_id)
        end_index = segment_index_by_id.get(end_segment_id)
        if start_index is None or end_index is None or start_index > end_index:
            continue

        window_segments = request.segments[start_index : end_index + 1]
        if not window_segments:
            continue

        start_segment = segments_by_id[start_segment_id]
        end_segment = segments_by_id[end_segment_id]
        duration = end_segment.end_seconds - start_segment.start_seconds
        if (
            duration < request.preferences.min_duration_seconds
            or duration > request.preferences.max_duration_seconds
        ):
            continue

        text = _join_segment_text(window_segments)
        if not text:
            continue

        candidates.append(
            ClipCandidate(
                start_segment_id=start_segment_id,
                end_segment_id=end_segment_id,
                source_segment_ids=[segment.segment_id for segment in window_segments],
                start_seconds=start_segment.start_seconds,
                end_seconds=end_segment.end_seconds,
                duration_seconds=duration,
                title=_candidate_title(proposal.title, text),
                reason=(
                    proposal.reason or "Short clip candidate from transcript."
                ).strip(),
                score=_clamp_score(proposal.score),
                text=text,
            )
        )
        selected_ranges.add(candidate_range)

    return _rank_candidates(candidates, request.preferences.clip_count)


def _rank_candidates(
    candidates: list[ClipCandidate],
    clip_count: int,
) -> list[ClipCandidate]:
    return sorted(
        candidates,
        key=lambda candidate: (
            -candidate.score,
            candidate.start_seconds,
            candidate.end_seconds,
        ),
    )[:clip_count]


def _join_segment_text(segments: list[ShortClipTranscriptSegment]) -> str:
    return " ".join(
        segment.text.strip() for segment in segments if segment.text.strip()
    )


def _candidate_title(title: str | None, text: str) -> str:
    cleaned_title = (title or "").strip()
    if cleaned_title:
        return cleaned_title[:80]

    return " ".join(text.split()[:8])[:80] or "Generated short clip"


def _clamp_score(score: float | None) -> float:
    if score is None:
        return 0.0

    return round(min(max(float(score), 0.0), 10.0), 2)


def _provider_source(source: str) -> ShortClipSource:
    if source == "LLM":
        return "LLM"

    return "NOOP"
