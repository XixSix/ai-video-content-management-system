from celery import Celery
from kombu import Queue

from .config import settings

celery_app = Celery(
    main="worker",
    broker=str(settings.rabbitmq_url),
    backend=None,
    include=[
        "app.consumers.transcript_consumer",
        "app.consumers.chaptering_consumer",
        "app.consumers.media_preview_consumer",
        "app.consumers.render_export_consumer",
    ],
)

celery_app.conf.update(
    task_queues=(
        Queue(
            settings.transcript_queue_name,
            routing_key=settings.transcript_queue_name,
            durable=True,
        ),
        Queue(
            settings.chaptering_queue_name,
            routing_key=settings.chaptering_queue_name,
            durable=True,
        ),
        Queue(
            settings.media_previews_queue_name,
            routing_key=settings.media_previews_queue_name,
            durable=True,
        ),
        Queue(
            settings.render_exports_queue_name,
            routing_key=settings.render_exports_queue_name,
            durable=True,
        ),
    ),
    task_default_queue=settings.transcript_queue_name,
    task_default_routing_key=settings.transcript_queue_name,
    task_routes={
        settings.transcript_task_name: {
            "queue": settings.transcript_queue_name,
            "routing_key": settings.transcript_queue_name,
        },
        settings.chaptering_task_name: {
            "queue": settings.chaptering_queue_name,
            "routing_key": settings.chaptering_queue_name,
        },
        settings.media_preview_task_name: {
            "queue": settings.media_previews_queue_name,
            "routing_key": settings.media_previews_queue_name,
        },
        settings.render_export_task_name: {
            "queue": settings.render_exports_queue_name,
            "routing_key": settings.render_exports_queue_name,
        },
    },
    task_protocol=2,
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_ignore_result=True,
    task_store_errors_even_if_ignored=False,
    task_acks_late=True,
    task_acks_on_failure_or_timeout=True,
    task_reject_on_worker_lost=True,
    task_default_retry_delay=settings.task_default_retry_delay_seconds,
    task_soft_time_limit=settings.task_soft_time_limit_seconds,
    task_time_limit=settings.task_time_limit_seconds,
    broker_connection_retry_on_startup=True,
    broker_heartbeat=settings.broker_heartbeat_seconds,
    worker_concurrency=settings.worker_concurrency,
    worker_prefetch_multiplier=settings.worker_prefetch_multiplier,
    worker_max_tasks_per_child=settings.worker_max_tasks_per_child,
    worker_cancel_long_running_tasks_on_connection_loss=True,
    enable_utc=True,
    timezone="UTC",
)
