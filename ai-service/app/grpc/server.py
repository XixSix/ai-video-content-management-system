from concurrent import futures
import logging

import grpc

from app.core.config import Settings, get_settings
from app.core.lifecycle import create_stop_event, register_signal_handlers
from app.core.logging import configure_logging
from app.grpc.transcription_servicer import TranscriptionServicer
from app.proto_path import ensure_proto_generated_on_path

ensure_proto_generated_on_path()

from transcription.v1 import transcription_pb2_grpc  # type: ignore # noqa: E402

logger = logging.getLogger(__name__)


def create_server(settings: Settings) -> grpc.Server:
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=settings.ai_service_max_workers)
    )
    transcription_pb2_grpc.add_TranscriptionServiceServicer_to_server(
        TranscriptionServicer(),
        server,
    )
    return server


def serve() -> None:
    configure_logging()
    settings = get_settings()
    server = create_server(settings)
    stop_event = create_stop_event()
    register_signal_handlers(server, stop_event)

    server.add_insecure_port(settings.bind_address)
    server.start()
    logger.info("ai-service gRPC server listening on %s", settings.bind_address)
    stop_event.wait()
