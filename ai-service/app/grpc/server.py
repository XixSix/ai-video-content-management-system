from concurrent import futures

import grpc

from app.core.config import Settings
from app.grpc.generate_chapters_servicer import GenerateChaptersServicer
from app.grpc.generate_short_clips_servicer import GenerateShortClipsServicer
from app.grpc.transcribe_servicer import TranscribeServicer
from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import (
    build_transcribe_workflow,
    build_generate_chapters_workflow,
    build_generate_short_clips_workflow,
)

ensure_proto_generated_on_path()

from transcribe.v1 import transcribe_pb2_grpc  # type: ignore # noqa: E402
from generate_chapters.v1 import generate_chapters_pb2_grpc  # type: ignore # noqa: E402
from generate_short_clips.v1 import generate_short_clips_pb2_grpc  # type: ignore # noqa: E402


def create_server(settings: Settings) -> grpc.Server:
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=settings.ai_service_max_workers)
    )
    transcribe_pb2_grpc.add_TranscribeServiceServicer_to_server(
        TranscribeServicer(build_transcribe_workflow()),
        server,
    )
    generate_chapters_pb2_grpc.add_GenerateChaptersServiceServicer_to_server(
        GenerateChaptersServicer(build_generate_chapters_workflow()),
        server,
    )
    generate_short_clips_pb2_grpc.add_GenerateShortClipsServiceServicer_to_server(
        GenerateShortClipsServicer(build_generate_short_clips_workflow()),
        server,
    )
    return server
