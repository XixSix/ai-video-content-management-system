from pathlib import Path

import pytest
from botocore.exceptions import ClientError, EndpointConnectionError

from app.services.s3_service import (
    S3Service,
    S3ServiceError,
    S3SourceObjectNotFoundError,
)


class FakeClient:
    def __init__(self, error: Exception) -> None:
        self.error = error

    def download_file(
        self, bucket: str, object_key: str, destination_path: str
    ) -> None:
        raise self.error


def _service_with_error(error: Exception) -> S3Service:
    service = S3Service.__new__(S3Service)
    service.bucket = "avcms-media"
    service.client = FakeClient(error)
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
