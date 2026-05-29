from concurrent import futures

import grpc

from app.core.config import Settings
from app.grpc.transcription_servicer import TranscriptionServicer
from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import build_transcription_workflow

ensure_proto_generated_on_path()

from transcription.v1 import transcription_pb2_grpc  # type: ignore # noqa: E402


def create_server(settings: Settings) -> grpc.Server:
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=settings.ai_service_max_workers)
    )
    transcription_pb2_grpc.add_TranscriptionServiceServicer_to_server(
        TranscriptionServicer(build_transcription_workflow()),
        server,
    )
    return server
