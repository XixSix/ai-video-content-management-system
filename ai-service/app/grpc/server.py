from concurrent import futures
import logging

import grpc

from app.core.config import settings
from app.grpc.transcription_servicer import TranscriptionServicer
from app.proto_path import ensure_proto_generated_on_path

ensure_proto_generated_on_path()

from transcription.v1 import transcription_pb2_grpc  # noqa: E402

logger = logging.getLogger(__name__)


def create_server() -> grpc.Server:
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=settings.ai_service_max_workers)
    )
    transcription_pb2_grpc.add_TranscriptionServiceServicer_to_server(
        TranscriptionServicer(),
        server,
    )
    return server


def serve() -> None:
    logging.basicConfig(level=logging.INFO)
    server = create_server()
    server.add_insecure_port(settings.bind_address)
    server.start()
    logger.info("ai-service gRPC server listening on %s", settings.bind_address)
    server.wait_for_termination()
