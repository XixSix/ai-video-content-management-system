from concurrent import futures

import grpc

from app.core.config import Settings
from app.grpc.chaptering_servicer import ChapteringServicer
from app.grpc.short_clip_servicer import ShortClipServicer
from app.grpc.transcription_servicer import TranscriptionServicer
from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import (
    build_transcription_workflow,
    build_chaptering_workflow,
    build_short_clip_workflow,
)

ensure_proto_generated_on_path()

from transcription.v1 import transcription_pb2_grpc  # type: ignore # noqa: E402
from chaptering.v1 import chaptering_pb2_grpc  # type: ignore # noqa: E402
from short_clip.v1 import short_clip_pb2_grpc  # type: ignore # noqa: E402


def create_server(settings: Settings) -> grpc.Server:
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=settings.ai_service_max_workers)
    )
    transcription_pb2_grpc.add_TranscriptionServiceServicer_to_server(
        TranscriptionServicer(build_transcription_workflow()),
        server,
    )
    chaptering_pb2_grpc.add_ChapteringServiceServicer_to_server(
        ChapteringServicer(build_chaptering_workflow()),
        server,
    )
    short_clip_pb2_grpc.add_ShortClipServiceServicer_to_server(
        ShortClipServicer(build_short_clip_workflow()),
        server,
    )
    return server
