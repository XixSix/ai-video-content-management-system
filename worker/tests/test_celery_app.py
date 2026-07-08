from app.core.celery_app import celery_app
from app.core.config import settings


def test_celery_app_registers_consumers() -> None:
    assert "app.consumers.transcribe_consumer" in celery_app.conf.include
    assert "app.consumers.generate_chapters_consumer" in celery_app.conf.include
    assert "app.consumers.media_preview_consumer" in celery_app.conf.include
    assert "app.consumers.generate_short_clips_consumer" in celery_app.conf.include
    assert "app.consumers.publish_consumer" in celery_app.conf.include


def test_celery_app_declares_generate_chapters_queue_and_route() -> None:
    queue_names = {queue.name for queue in celery_app.conf.task_queues}

    assert settings.transcribe_queue_name in queue_names
    assert celery_app.conf.task_routes[settings.transcribe_task_name] == {
        "queue": settings.transcribe_queue_name,
        "routing_key": settings.transcribe_queue_name,
    }
    assert settings.generate_chapters_queue_name in queue_names
    assert celery_app.conf.task_routes[settings.generate_chapters_task_name] == {
        "queue": settings.generate_chapters_queue_name,
        "routing_key": settings.generate_chapters_queue_name,
    }


def test_celery_app_declares_media_preview_queue_and_route() -> None:
    queue_names = {queue.name for queue in celery_app.conf.task_queues}

    assert settings.media_previews_queue_name in queue_names
    assert celery_app.conf.task_routes[settings.media_preview_task_name] == {
        "queue": settings.media_previews_queue_name,
        "routing_key": settings.media_previews_queue_name,
    }


def test_celery_app_declares_generate_short_clips_queue_and_route() -> None:
    queue_names = {queue.name for queue in celery_app.conf.task_queues}

    assert settings.generate_short_clips_queue_name in queue_names
    assert celery_app.conf.task_routes[settings.generate_short_clips_task_name] == {
        "queue": settings.generate_short_clips_queue_name,
        "routing_key": settings.generate_short_clips_queue_name,
    }


def test_celery_app_declares_publish_queue_and_route() -> None:
    queue_names = {queue.name for queue in celery_app.conf.task_queues}

    assert settings.publish_queue_name in queue_names
    assert celery_app.conf.task_routes[settings.publish_task_name] == {
        "queue": settings.publish_queue_name,
        "routing_key": settings.publish_queue_name,
    }
