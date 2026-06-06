import logging


from app.core.config import get_settings
from app.core.lifecycle import create_stop_event, register_signal_handlers
from app.core.logging import configure_logging
from app.grpc.server import create_server

logger = logging.getLogger(__name__)


def main() -> None:
    configure_logging()
    settings = get_settings()
    server = create_server(settings)
    stop_event = create_stop_event()
    register_signal_handlers(server, stop_event)

    server.add_insecure_port(settings.bind_address)
    server.start()
    logger.info("ai-service gRPC server listening on %s", settings.bind_address)
    stop_event.wait()


if __name__ == "__main__":
    main()
