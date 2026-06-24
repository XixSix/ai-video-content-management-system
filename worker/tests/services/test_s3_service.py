from pathlib import Path

import pytest
from botocore.exceptions import ClientError, EndpointConnectionError

from app.services.s3_service import (
    S3Service,
    S3ServiceError,
    S3SourceObjectNotFoundError,
)


class FakeClient:
    def __init__(self, error: Exception | None) -> None:
        self.error = error
        self.presigned_calls: list[tuple[str, dict[str, object], int]] = []

    def download_file(
        self, bucket: str, object_key: str, destination_path: str
    ) -> None:
        raise self.error

    def head_object(self, *, Bucket: str, Key: str) -> None:  # noqa: N803
        if self.error:
            raise self.error

    def generate_presigned_url(
        self,
        client_method: str,
        *,
        Params: dict[str, object],  # noqa: N803
        ExpiresIn: int,  # noqa: N803
    ) -> str:
        self.presigned_calls.append((client_method, Params, ExpiresIn))
        return (
            f"http://localhost:9000/{Params['Bucket']}/{Params['Key']}?signature=test"
        )


def _service_with_error(error: Exception | None) -> S3Service:
    service = S3Service.__new__(S3Service)
    service.bucket = "vidpilot-media"
    service.client = FakeClient(error)
    service.presign_client = service.client
    return service


def test_download_file_maps_not_found_to_terminal_error(tmp_path: Path) -> None:
    error = ClientError(
        {
            "Error": {"Code": "NoSuchKey", "Message": "not found"},
            "ResponseMetadata": {"HTTPStatusCode": 404},
        },
        "GetObject",
    )
    service = _service_with_error(error)

    with pytest.raises(S3SourceObjectNotFoundError) as raised:
        service.download_file("missing.mp4", tmp_path / "source.mp4")

    assert raised.value.error_code == "SOURCE_OBJECT_NOT_FOUND"


def test_download_file_keeps_transient_errors_retryable(tmp_path: Path) -> None:
    service = _service_with_error(
        EndpointConnectionError(endpoint_url="http://minio:9000")
    )

    with pytest.raises(S3ServiceError):
        service.download_file("video.mp4", tmp_path / "source.mp4")


def test_create_presigned_get_url_returns_http_url() -> None:
    service = _service_with_error(None)

    url = service.create_presigned_get_url(
        "media/source.mp4",
        bucket="vidpilot-media",
        expires_in_seconds=3900,
    )

    assert url == "http://localhost:9000/vidpilot-media/media/source.mp4?signature=test"
    assert service.presign_client.presigned_calls == [
        (
            "get_object",
            {"Bucket": "vidpilot-media", "Key": "media/source.mp4"},
            3900,
        )
    ]


def test_create_presigned_get_url_maps_missing_sources() -> None:
    error = ClientError(
        {
            "Error": {"Code": "NoSuchKey", "Message": "not found"},
            "ResponseMetadata": {"HTTPStatusCode": 404},
        },
        "HeadObject",
    )
    service = _service_with_error(error)

    with pytest.raises(S3SourceObjectNotFoundError):
        service.create_presigned_get_url("missing.mp4")
