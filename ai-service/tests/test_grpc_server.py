from app.core.config import Settings
from app.grpc.server import create_server


def test_server_registers_new_contract_service_paths() -> None:
    server = create_server(Settings(_env_file=None))

    method_paths = {
        path
        for handler in server._state.generic_handlers
        for path in handler._method_handlers
    }

    assert "/transcribe.v1.TranscribeService/Transcribe" in method_paths
    assert (
        "/generate_chapters.v1.GenerateChaptersService/GenerateChapters" in method_paths
    )
    assert (
        "/generate_short_clips.v1.GenerateShortClipsService/GenerateShortClips"
        in method_paths
    )
