from dataclasses import dataclass
from typing import Any

from app.db import publish_repository
from app.db.client import get_db_session
from app.errors import TerminalPipelineError
from app.errors.policies import raise_terminal
from app.schemas.db.processsing_job import ProcessingJobRow
from app.schemas.publish.input import PublishJobInput
from app.schemas.publish.output import PublishJobOutput
from app.services.publish_provider import (
    PublishProviderInput,
    RetryablePublishProviderError,
    TerminalPublishProviderError,
    ensure_fresh_youtube_account,
    get_publish_provider,
)


class TerminalPublishPipelineError(TerminalPipelineError):
    pass


@dataclass(frozen=True)
class PublishPipelineResult:
    output: PublishJobOutput
    skipped: bool = False


def run_publish_pipeline(
    job: ProcessingJobRow,
    *,
    job_input: PublishJobInput,
) -> PublishPipelineResult:
    """Resolve the publish target and delegate the upload to a platform provider."""
    with get_db_session() as session:
        task = publish_repository.find_publish_task(
            session,
            str(job_input.publish_task_id),
        )

        if task is None:
            raise TerminalPublishPipelineError(
                "Publish task was not found",
                error_code="PUBLISH_TASK_NOT_FOUND",
            )

        if task.status == "CANCELED":
            raise TerminalPublishPipelineError(
                "Publish task was canceled",
                error_code="PUBLISH_TASK_CANCELED",
            )

        _guard_publish_task(job, task)
        account = _guard_platform_account(session, task)

        if task.platform_post_id and task.platform_post_url:
            return PublishPipelineResult(
                output=PublishJobOutput(
                    publish_task_id=job_input.publish_task_id,
                ),
                skipped=True,
            )

        source = publish_repository.find_publish_source(
            session,
            task,
            export_asset_id=str(job_input.export_asset_id)
            if job_input.export_asset_id
            else None,
        )

        if source is None:
            raise TerminalPublishPipelineError(
                "Publish target was not found",
                error_code="PUBLISH_TARGET_NOT_FOUND",
            )

        account = ensure_fresh_youtube_account(session, account)
        publish_repository.mark_publish_task_publishing(
            session,
            str(job_input.publish_task_id),
            str(job.id),
        )

    try:
        result = get_publish_provider(task.platform).publish(
            PublishProviderInput(task=task, account=account, source=source)
        )
    except RetryablePublishProviderError:
        raise
    except TerminalPublishProviderError as error:
        raise_terminal(
            error,
            TerminalPublishPipelineError,
            error_code="PUBLISH_PROVIDER_TERMINAL",
        )

    with get_db_session() as session:
        publish_repository.mark_publish_task_published(
            session,
            str(job_input.publish_task_id),
            platform_post_id=result.platform_post_id,
            platform_post_url=result.platform_post_url,
        )

    return PublishPipelineResult(
        output=PublishJobOutput(publish_task_id=job_input.publish_task_id),
        skipped=False,
    )


def _guard_publish_task(
    job: ProcessingJobRow,
    task: publish_repository.PublishTaskRow,
) -> None:
    if str(task.user_id) != str(job.user_id):
        raise TerminalPublishPipelineError(
            "Processing job user does not match publish task",
            error_code="PUBLISH_TASK_USER_MISMATCH",
        )

    if task.platform_account_id is None:
        raise TerminalPublishPipelineError(
            "Publish task platform account is required",
            error_code="PUBLISH_TASK_PLATFORM_ACCOUNT_MISMATCH",
        )

    if task.media_id is not None and str(task.media_id) != str(job.media_id):
        raise TerminalPublishPipelineError(
            "Processing job media does not match publish task",
            error_code="PUBLISH_TASK_MEDIA_MISMATCH",
        )

    if task.project_id is not None and (
        job.project_id is None or str(task.project_id) != str(job.project_id)
    ):
        raise TerminalPublishPipelineError(
            "Processing job project does not match publish task",
            error_code="PUBLISH_TASK_PROJECT_MISMATCH",
        )


def _guard_platform_account(
    session: Any,
    task: publish_repository.PublishTaskRow,
) -> publish_repository.PlatformAccountRow:
    if task.platform_account_id is None:
        raise TerminalPublishPipelineError(
            "Publish task platform account is required",
            error_code="PUBLISH_TASK_PLATFORM_ACCOUNT_MISMATCH",
        )

    account = publish_repository.find_platform_account(
        session,
        str(task.platform_account_id),
    )

    if account is None:
        raise TerminalPublishPipelineError(
            "Platform account was not found",
            error_code="PUBLISH_PLATFORM_ACCOUNT_NOT_FOUND",
        )

    if account.platform != task.platform or account.status != "CONNECTED":
        raise TerminalPublishPipelineError(
            "Platform account cannot publish this task",
            error_code="PUBLISH_PLATFORM_ACCOUNT_UNAVAILABLE",
        )

    return account
