from celery import Celery
from kombu import Queue

from .config import settings

celery_app = Celery(
    main="worker",
    broker=str(settings.rabbitmq_url),
    backend=None,
    include=[
        "app.consumers.transcribe_consumer",
        "app.consumers.generate_chapters_consumer",
        "app.consumers.media_preview_consumer",
        "app.consumers.generate_short_clips_consumer",
        "app.consumers.render_export_consumer",
        "app.consumers.publish_consumer",
    ],
)

celery_app.conf.update(
    task_queues=(
        Queue(
            settings.transcribe_queue_name,
            routing_key=settings.transcribe_queue_name,
            durable=True,
        ),
        Queue(
            settings.generate_chapters_queue_name,
            routing_key=settings.generate_chapters_queue_name,
            durable=True,
        ),
        Queue(
            settings.media_previews_queue_name,
            routing_key=settings.media_previews_queue_name,
            durable=True,
        ),
        Queue(
            settings.generate_short_clips_queue_name,
            routing_key=settings.generate_short_clips_queue_name,
            durable=True,
        ),
        Queue(
            settings.render_exports_queue_name,
            routing_key=settings.render_exports_queue_name,
            durable=True,
        ),
        Queue(
            settings.publish_queue_name,
            routing_key=settings.publish_queue_name,
            durable=True,
        ),
    ),
    task_default_queue=settings.transcribe_queue_name,
    task_default_routing_key=settings.transcribe_queue_name,
    task_routes={
        settings.transcribe_task_name: {
            "queue": settings.transcribe_queue_name,
            "routing_key": settings.transcribe_queue_name,
        },
        settings.generate_chapters_task_name: {
            "queue": settings.generate_chapters_queue_name,
            "routing_key": settings.generate_chapters_queue_name,
        },
        settings.media_preview_task_name: {
            "queue": settings.media_previews_queue_name,
            "routing_key": settings.media_previews_queue_name,
        },
        settings.generate_short_clips_task_name: {
            "queue": settings.generate_short_clips_queue_name,
            "routing_key": settings.generate_short_clips_queue_name,
        },
        settings.render_export_task_name: {
            "queue": settings.render_exports_queue_name,
            "routing_key": settings.render_exports_queue_name,
        },
        settings.publish_task_name: {
            "queue": settings.publish_queue_name,
            "routing_key": settings.publish_queue_name,
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
