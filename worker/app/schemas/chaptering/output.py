from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.chaptering.result import ChapterSource


class ChapteringJobOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    min_chapter_duration: float = Field(
        default=180,
        validation_alias="minChapterDuration",
        serialization_alias="minChapterDuration",
    )
    target_chapter_duration: float = Field(
        default=300,
        validation_alias="targetChapterDuration",
        serialization_alias="targetChapterDuration",
    )
    max_chapters: int = Field(
        default=5, validation_alias="maxChapters", serialization_alias="maxChapters"
    )
    use_llm: bool = Field(
        default=True, validation_alias="useLlm", serialization_alias="useLlm"
    )
    use_embeddings: bool = Field(
        default=False,
        validation_alias="useEmbeddings",
        serialization_alias="useEmbeddings",
    )


class ChapteringOutputSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: UUID
    chapter_index: int = Field(
        validation_alias="chapterIndex", serialization_alias="chapterIndex"
    )
    start_time: float = Field(
        validation_alias="startTime", serialization_alias="startTime"
    )
    end_time: float = Field(validation_alias="endTime", serialization_alias="endTime")
    title: str
    summary: str | None = None
    transcript_version: int = Field(
        validation_alias="transcriptVersion",
        serialization_alias="transcriptVersion",
    )
    source: ChapterSource = "SEGMENTS"
    score: float | None = None
    boundary_score: float | None = Field(
        default=None,
        validation_alias="boundaryScore",
        serialization_alias="boundaryScore",
    )
    pause_score: float | None = Field(
        default=None, validation_alias="pauseScore", serialization_alias="pauseScore"
    )
    discourse_marker_score: float | None = Field(
        default=None,
        validation_alias="discourseMarkerScore",
        serialization_alias="discourseMarkerScore",
    )
    semantic_shift_score: float | None = Field(
        default=None,
        validation_alias="semanticShiftScore",
        serialization_alias="semanticShiftScore",
    )
    duration_score: float | None = Field(
        default=None,
        validation_alias="durationScore",
        serialization_alias="durationScore",
    )


class ChapteringCompletedOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["chaptering.completed"] = "chaptering.completed"
    version: Literal[1] = 1
    transcript_id: UUID = Field(
        validation_alias="transcriptId", serialization_alias="transcriptId"
    )
    transcript_version: int = Field(
        validation_alias="transcriptVersion",
        serialization_alias="transcriptVersion",
    )
    model: str
    chapter_count: int = Field(
        validation_alias="chapterCount", serialization_alias="chapterCount"
    )
    chapters: list[ChapteringOutputSummary]
    options: ChapteringJobOptions
