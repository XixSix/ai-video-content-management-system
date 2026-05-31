from app.core.config import settings
from app.db import chaptering_repository
from app.db.client import get_db_session
from app.pipelines.chaptering.units import build_chapter_units

media_id = "7ba32cb3-6e10-409b-8a23-f00343224ffc"
transcript_id = "ed9c2fc1-8748-4c05-a6a1-333136c237d0"

with get_db_session() as session:
    transcript = chaptering_repository.load_transcript_for_chaptering(
        session,
        media_id=media_id,
        transcript_id=transcript_id,
    )

if transcript is None:
    raise SystemExit("Transcript not found")

units = build_chapter_units(
    transcript.segments,
    max_unit_duration=settings.chaptering_max_unit_duration_seconds,
    pause_boundary_seconds=settings.chaptering_pause_boundary_seconds,
)

print(f"segments={len(transcript.segments)} units={len(units)}")
for unit in units[:30]:
    print(f"{unit.unit_id} {unit.start_time:.2f}-{unit.end_time:.2f} segments={len(unit.segment_ids)}")
    print(unit.text[:240])
    print()
