from pydantic import BaseModel


class MediaProbe(BaseModel):
    duration_seconds: float
    has_video: bool
    has_audio: bool
    width: int | None = None
    height: int | None = None
