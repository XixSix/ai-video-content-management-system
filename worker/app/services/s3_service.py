import os

import boto3
from app.core.config import settings
from botocore.exceptions import ClientError


class S3Service:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            region_name=settings.s3_region,
        )
        self.bucket = settings.s3_bucket

    def download(self, s3_key: str) -> str:
        """Download file from S3 to local path
        :return: dest_path
        """
        os.makedirs(settings.tmp_dir, exist_ok=True)
        dest_path = os.path.join(settings.tmp_dir, os.path.basename(s3_key))

        self.client.download_file(self.bucket, s3_key, dest_path)

        return dest_path

    def upload_file(self, local_path: str, s3_key: str) -> str | None:
        """Upload a file to an S3 bucket

        :param local_path: Local storage path
        :param s3_key: S3 object key
        :return: s3_key if file was uploaded, else s3_key
        """

        try:
            self.client.upload_file(local_path, self.bucket, s3_key)

            return s3_key
        except ClientError as e:
            raise e


s3_service = S3Service()
