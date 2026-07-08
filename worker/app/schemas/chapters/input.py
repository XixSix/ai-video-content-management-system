from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EmbeddingOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    enabled: bool = False
    model: str | None = None


class LLMOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    enabled: bool = True
    model: str | None = None


class GenerateChaptersOptions(BaseModel):
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
    max_chapter_duration: float = Field(
        default=600,
        validation_alias="maxChapterDuration",
        serialization_alias="maxChapterDuration",
    )
    max_chapters: int = Field(
        default=5,
        validation_alias="maxChapters",
        serialization_alias="maxChapters",
    )
    embeddings: EmbeddingOptions = Field(default_factory=EmbeddingOptions)
    llm: LLMOptions = Field(default_factory=LLMOptions)


class GenerateChaptersJobInput(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    transcript_id: UUID = Field(
        validation_alias="transcriptId",
        serialization_alias="transcriptId",
    )
    transcript_version: int = Field(
        validation_alias="transcriptVersion",
        serialization_alias="transcriptVersion",
    )
    options: GenerateChaptersOptions = Field(default_factory=GenerateChaptersOptions)
