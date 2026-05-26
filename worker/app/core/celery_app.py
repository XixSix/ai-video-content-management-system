from celery import Celery
from kombu import Exchange, Queue

from .config import settings

transcript_exchange = Exchange("transcript", type="direct")

celery_app = Celery(
    main="worker",
    broker=str(settings.broker_url),
    backend=None,
    include=["app.consumers.transcript_consumer"],
)

celery_app.conf.update(
    task_queues=(
        Queue(
            "transcript_queue",
            transcript_exchange,
            routing_key="transcript_queue",
        ),
    ),
    task_default_queue="transcript_queue",
    task_default_exchange="transcript",
    task_default_exchange_type="direct",
    task_default_routing_key="transcript_queue",
    task_serializer="json",
    accept_content=["json"],
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    enable_utc=True,
)
