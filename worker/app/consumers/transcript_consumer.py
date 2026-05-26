from app.core.celery_app import celery_app


@celery_app.task(
    name="transcript_task", queue="transcript_queue", bind=True, max_retries=1
)
def handle_transcript_job(self, **kwargs):
    pass
