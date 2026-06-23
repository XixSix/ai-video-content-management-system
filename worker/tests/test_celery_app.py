from app.core.celery_app import celery_app
from app.core.config import settings


def test_celery_app_registers_consumers() -> None:
    assert "app.consumers.transcript_consumer" in celery_app.conf.include
    assert "app.consumers.chaptering_consumer" in celery_app.conf.include
    assert "app.consumers.media_preview_consumer" in celery_app.conf.include


def test_celery_app_declares_chaptering_queue_and_route() -> None:
    queue_names = {queue.name for queue in celery_app.conf.task_queues}

    assert settings.transcript_queue_name in queue_names
    assert settings.chaptering_queue_name in queue_names
    assert celery_app.conf.task_routes[settings.chaptering_task_name] == {
        "queue": settings.chaptering_queue_name,
        "routing_key": settings.chaptering_queue_name,
    }


def test_celery_app_declares_media_preview_queue_and_route() -> None:
    queue_names = {queue.name for queue in celery_app.conf.task_queues}

    assert settings.media_previews_queue_name in queue_names
    assert celery_app.conf.task_routes[settings.media_preview_task_name] == {
        "queue": settings.media_previews_queue_name,
        "routing_key": settings.media_previews_queue_name,
    }
