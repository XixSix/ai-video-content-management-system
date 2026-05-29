from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChapteringJobOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    transcript_id: UUID | None = Field(default=None, alias="transcriptId")
    transcript_version: int | None = Field(default=None, alias="transcriptVersion")
    min_chapter_duration: float = Field(default=180, alias="minChapterDuration")
    target_chapter_duration: float = Field(default=300, alias="targetChapterDuration")
    max_chapters: int = Field(default=5, alias="maxChapters")
    use_llm: bool = Field(default=False, alias="useLlm")
    use_embeddings: bool = Field(default=False, alias="useEmbeddings")


class ChapteringOutputSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: UUID
    chapter_index: int = Field(alias="chapterIndex")
    start_time: float = Field(alias="startTime")
    end_time: float = Field(alias="endTime")
    title: str
    summary: str | None = None
    transcript_version: int = Field(alias="transcriptVersion")
    source: Literal["RULE_BASED", "LLM", "USER_EDITED"] = "RULE_BASED"
    score: float | None = None
    boundary_score: float | None = Field(default=None, alias="boundaryScore")
    pause_score: float | None = Field(default=None, alias="pauseScore")
    discourse_marker_score: float | None = Field(
        default=None, alias="discourseMarkerScore"
    )
    semantic_shift_score: float | None = Field(default=None, alias="semanticShiftScore")
    duration_score: float | None = Field(default=None, alias="durationScore")


class ChapteringCompletedOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["chaptering.completed"] = "chaptering.completed"
    version: Literal[1] = 1
    transcript_id: UUID = Field(alias="transcriptId")
    transcript_version: int = Field(alias="transcriptVersion")
    model: str
    chapter_count: int = Field(alias="chapterCount")
    chapters: list[ChapteringOutputSummary]
    options: ChapteringJobOptions
