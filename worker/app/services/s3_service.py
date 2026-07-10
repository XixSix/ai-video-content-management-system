from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings
from app.errors import ServiceError


class S3ServiceError(ServiceError):
    pass


class S3Service:
    def __init__(
        self,
        *,
        bucket: str = settings.s3_bucket,
        endpoint_url: str = settings.s3_endpoint,
        public_endpoint_url: str = settings.s3_public_endpoint,
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
        self.presign_client = boto3.client(
            "s3",
            endpoint_url=public_endpoint_url or endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region_name,
        )

    def download_file(
        self,
        object_key: str,
        destination_path: Path,
        *,
        bucket: str | None = None,
    ) -> Path:
        """Download an object to disk and map missing sources to terminal errors."""
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        source_bucket = bucket or self.bucket

        try:
            self.client.download_file(source_bucket, object_key, str(destination_path))
        except ClientError as error:
            if _is_not_found_error(error):
                raise S3ServiceError(
                    f"s3://{source_bucket}/{object_key} was not found",
                    error_code="SOURCE_OBJECT_NOT_FOUND",
                ) from error

            raise S3ServiceError(
                f"Failed to download s3://{source_bucket}/{object_key}",
                error_code="S3_DOWNLOAD_FAILED",
            ) from error
        except BotoCoreError as error:
            raise S3ServiceError(
                f"Failed to download s3://{source_bucket}/{object_key}",
                error_code="S3_DOWNLOAD_FAILED",
            ) from error

        return destination_path

    def download_to_tmp(
        self, object_key: str, *, tmp_dir: Path = settings.tmp_dir
    ) -> Path:
        """Download an object into the worker temporary directory."""
        filename = Path(object_key).name

        if not filename:
            raise S3ServiceError(
                "Object key does not contain a filename",
                error_code="S3_OBJECT_KEY_INVALID",
            )

        return self.download_file(object_key, tmp_dir / filename)

    def upload_file(
        self,
        source_path: Path,
        object_key: str,
        *,
        content_type: str | None = None,
        bucket: str | None = None,
    ) -> str:
        """Upload a local file and return the stored object key."""
        extra_args = {"ContentType": content_type} if content_type else None
        destination_bucket = bucket or self.bucket

        try:
            if extra_args:
                self.client.upload_file(
                    str(source_path),
                    destination_bucket,
                    object_key,
                    ExtraArgs=extra_args,
                )
            else:
                self.client.upload_file(
                    str(source_path), destination_bucket, object_key
                )
        except (BotoCoreError, ClientError) as error:
            raise S3ServiceError(
                f"Failed to upload {source_path} to s3://{destination_bucket}/{object_key}",
                error_code="S3_UPLOAD_FAILED",
            ) from error

        return object_key

    def object_exists(self, object_key: str, *, bucket: str | None = None) -> bool:
        """Return whether an object key exists in the configured bucket."""
        target_bucket = bucket or self.bucket

        try:
            self.client.head_object(Bucket=target_bucket, Key=object_key)
            return True
        except ClientError as error:
            status_code = error.response.get("ResponseMetadata", {}).get(
                "HTTPStatusCode"
            )

            if status_code == 404:
                return False

            raise S3ServiceError(
                f"Failed to check s3://{target_bucket}/{object_key}",
                error_code="S3_OBJECT_CHECK_FAILED",
            ) from error
        except BotoCoreError as error:
            raise S3ServiceError(
                f"Failed to check s3://{target_bucket}/{object_key}",
                error_code="S3_OBJECT_CHECK_FAILED",
            ) from error

    def create_presigned_get_url(
        self,
        object_key: str,
        *,
        bucket: str | None = None,
        expires_in_seconds: int = 3600,
    ) -> str:
        """Create a temporary HTTP URL for reading an object."""
        target_bucket = bucket or self.bucket

        if not self.object_exists(object_key, bucket=target_bucket):
            raise S3ServiceError(
                f"s3://{target_bucket}/{object_key} was not found",
                error_code="SOURCE_OBJECT_NOT_FOUND",
            )

        try:
            url = self.presign_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": target_bucket, "Key": object_key},
                ExpiresIn=expires_in_seconds,
            )
        except ClientError as error:
            if _is_not_found_error(error):
                raise S3ServiceError(
                    f"s3://{target_bucket}/{object_key} was not found",
                    error_code="SOURCE_OBJECT_NOT_FOUND",
                ) from error

            raise S3ServiceError(
                f"Failed to create download URL for s3://{target_bucket}/{object_key}",
                error_code="S3_PRESIGN_FAILED",
            ) from error
        except BotoCoreError as error:
            raise S3ServiceError(
                f"Failed to create download URL for s3://{target_bucket}/{object_key}",
                error_code="S3_PRESIGN_FAILED",
            ) from error

        return url


def _is_not_found_error(error: ClientError) -> bool:
    """Return whether an S3 client error represents a missing object."""
    error_payload = error.response.get("Error", {})
    error_code = str(error_payload.get("Code", ""))
    status_code = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")

    return status_code == 404 or error_code in {"404", "NoSuchKey", "NotFound"}


s3_service = S3Service()
