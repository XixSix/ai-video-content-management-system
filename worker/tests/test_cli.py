from app import cli


def test_run_worker_sets_default_hostname(monkeypatch):
    calls: list[list[str]] = []
    monkeypatch.setattr(cli.celery_app, "worker_main", calls.append)

    cli._run_worker(
        "render_exports_queue",
        default_hostname="render-exports@%h",
        log_level="INFO",
        argv=[],
    )

    assert calls == [
        [
            "worker",
            "--loglevel=info",
            "--queues",
            "render_exports_queue",
            "--hostname",
            "render-exports@%h",
        ]
    ]


def test_run_worker_preserves_explicit_hostname(monkeypatch):
    calls: list[list[str]] = []
    monkeypatch.setattr(cli.celery_app, "worker_main", calls.append)

    cli._run_worker(
        "render_exports_queue",
        default_hostname="render-exports@%h",
        log_level="INFO",
        argv=["--hostname=render-exports-2@%h"],
    )

    assert calls == [
        [
            "worker",
            "--loglevel=info",
            "--queues",
            "render_exports_queue",
            "--hostname=render-exports-2@%h",
        ]
    ]
