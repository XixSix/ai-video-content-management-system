from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings


class S3ServiceError(Exception):
    pass


class S3SourceObjectNotFoundError(S3ServiceError):
    error_code = "SOURCE_OBJECT_NOT_FOUND"


class S3Service:
    def __init__(
        self,
        *,
        bucket: str = settings.s3_bucket,
        endpoint_url: str = settings.s3_endpoint,
        region_name: str = settings.s3_region,
        access_key_id: str = settings.s3_access_key_id,
        secret_access_key: str = settings.s3_secret_access_key,
    ) -> None:
        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region_name,
        )

    def download_file(self, object_key: str, destination_path: Path) -> Path:
        """Download an object to disk and map missing sources to terminal errors."""
        destination_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            self.client.download_file(self.bucket, object_key, str(destination_path))
        except ClientError as error:
            if _is_not_found_error(error):
                raise S3SourceObjectNotFoundError(
                    f"{S3SourceObjectNotFoundError.error_code}: s3://{self.bucket}/{object_key} was not found"
                ) from error

            raise S3ServiceError(f"Failed to download s3://{self.bucket}/{object_key}") from error
        except BotoCoreError as error:
            raise S3ServiceError(f"Failed to download s3://{self.bucket}/{object_key}") from error

        return destination_path

    def download_to_tmp(self, object_key: str, *, tmp_dir: Path = settings.tmp_dir) -> Path:
        """Download an object into the worker temporary directory."""
        filename = Path(object_key).name

        if not filename:
            raise S3ServiceError("Object key does not contain a filename")

        return self.download_file(object_key, tmp_dir / filename)

    def upload_file(self, source_path: Path, object_key: str, *, content_type: str | None = None) -> str:
        """Upload a local file and return the stored object key."""
        extra_args = {"ContentType": content_type} if content_type else None

        try:
            if extra_args:
                self.client.upload_file(str(source_path), self.bucket, object_key, ExtraArgs=extra_args)
            else:
                self.client.upload_file(str(source_path), self.bucket, object_key)
        except (BotoCoreError, ClientError) as error:
            raise S3ServiceError(f"Failed to upload {source_path} to s3://{self.bucket}/{object_key}") from error

        return object_key

    def object_exists(self, object_key: str) -> bool:
        """Return whether an object key exists in the configured bucket."""
        try:
            self.client.head_object(Bucket=self.bucket, Key=object_key)
            return True
        except ClientError as error:
            status_code = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")

            if status_code == 404:
                return False

            raise S3ServiceError(f"Failed to check s3://{self.bucket}/{object_key}") from error
        except BotoCoreError as error:
            raise S3ServiceError(f"Failed to check s3://{self.bucket}/{object_key}") from error


def _is_not_found_error(error: ClientError) -> bool:
    """Return whether an S3 client error represents a missing object."""
    error_payload = error.response.get("Error", {})
    error_code = str(error_payload.get("Code", ""))
    status_code = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")

    return status_code == 404 or error_code in {"404", "NoSuchKey", "NotFound"}


s3_service = S3Service()
