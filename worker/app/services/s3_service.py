import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

# from app.core.logger import logger
import os


class S3Service:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            region_name=settings.S3_REGION,
        )
        self.bucket = settings.S3_BUCKET

    def download(self, s3_key: str) -> str:
        """Download file from S3 to local path
        :return: dest_path
        """
        dest_path = os.path.join(settings.TMP_DIR, os.path.basename(s3_key))

        self.client.download_file(self.bucket, s3_key, dest_path)
        # logger.info(f"Download done: {dest_path}")

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
            # logger.error(f"Upload failed: {e}")
            raise e
            return None


s3_service = S3Service()

result = s3_service.upload_file(
    "/home/dva205/Documents/nodejs/ai-video-content-management-system/worker/app/storage/result/transcript.txt",
    "result/test",
)
