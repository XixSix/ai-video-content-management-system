from app.core.celery_app import celery_app
from app.core.config import settings


@celery_app.task(
    name=settings.transcript_task_name,
    queue=settings.transcript_queue_name,
    bind=True,
    max_retries=settings.task_max_retries,
    default_retry_delay=settings.task_default_retry_delay_seconds,
)
def handle_transcript_job(
    self,
    jobId: str,
    mediaId: str,
    userId: str,
    s3Key: str,
    taskName: str,
):
    return {
        "jobId": jobId,
        "mediaId": mediaId,
        "userId": userId,
        "s3Key": s3Key,
        "taskName": taskName,
    }
