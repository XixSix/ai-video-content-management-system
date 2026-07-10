import json
import mimetypes
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Callable, NoReturn, Protocol

from facebook_business.api import FacebookAdsApi
from facebook_business.exceptions import FacebookRequestError
from google.auth.exceptions import RefreshError, TransportError
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload
from requests import RequestException

from app.core.config import settings
from app.db import publish_repository
from app.errors import ServiceError
from app.services.platform_token_crypto import (
    PlatformTokenCryptoError,
    decrypt_platform_token,
    encrypt_platform_token,
)
from app.services.s3_service import s3_service


class PublishProviderError(ServiceError):
    retryable = False


class RetryablePublishProviderError(PublishProviderError):
    retryable = True


class TerminalPublishProviderError(PublishProviderError):
    retryable = False


@dataclass(frozen=True)
class PublishProviderInput:
    task: publish_repository.PublishTaskRow
    account: publish_repository.PlatformAccountRow
    source: publish_repository.PublishSourceRow


@dataclass(frozen=True)
class PublishProviderResult:
    platform_post_id: str
    platform_post_url: str


class PublishProvider(Protocol):
    def publish(self, payload: PublishProviderInput) -> PublishProviderResult: ...


class YouTubePublishProvider:
    def __init__(
        self,
        *,
        service_builder: Callable[..., Any] = build,
        media_upload_factory: Callable[..., Any] = MediaFileUpload,
    ) -> None:
        self.service_builder = service_builder
        self.media_upload_factory = media_upload_factory

    def publish(self, payload: PublishProviderInput) -> PublishProviderResult:
        access_token = _require_decrypted_token(payload.account)
        local_path = _download_publish_source(payload.source)
        mime_type = payload.source.mime_type or _guess_mime_type(local_path)
        title = _task_title(payload.task, payload.source)
        description = _task_description(payload.task)
        tags = _task_tags(payload.task)
        metadata: dict[str, Any] = {
            "snippet": {
                "title": title,
                "description": description,
                "categoryId": "22",
            },
            "status": {
                "privacyStatus": settings.youtube_default_privacy_status,
                "selfDeclaredMadeForKids": False,
            },
        }

        if tags:
            metadata["snippet"]["tags"] = tags

        credentials = Credentials(token=access_token)
        youtube = self.service_builder(
            "youtube",
            "v3",
            credentials=credentials,
            cache_discovery=False,
        )
        media = self.media_upload_factory(
            str(local_path),
            mimetype=mime_type,
            resumable=True,
        )

        try:
            response = (
                youtube.videos()
                .insert(part="snippet,status", body=metadata, media_body=media)
                .execute(num_retries=3)
            )
        except HttpError as error:
            _raise_google_api_error(error, "YouTube publish failed")
        except (OSError, TimeoutError) as error:
            raise RetryablePublishProviderError("YouTube publish failed") from error

        video_id = response.get("id") if isinstance(response, dict) else None

        if not isinstance(video_id, str) or not video_id:
            raise RetryablePublishProviderError(
                "YouTube response did not include video id"
            )

        return PublishProviderResult(
            platform_post_id=video_id,
            platform_post_url=f"https://www.youtube.com/watch?v={video_id}",
        )


class FacebookPageVideoPublishProvider:
    def __init__(
        self,
        *,
        api_factory: Callable[[str], FacebookAdsApi] | None = None,
    ) -> None:
        self.api_factory = api_factory or _build_facebook_api

    def publish(self, payload: PublishProviderInput) -> PublishProviderResult:
        access_token = _require_decrypted_token(payload.account)

        if not payload.account.platform_user_id:
            raise TerminalPublishProviderError("Facebook Page id is missing")

        local_path = _download_publish_source(payload.source)
        api = self.api_factory(access_token)
        params = {
            "title": _task_title(payload.task, payload.source),
            "description": _task_description(payload.task),
        }

        try:
            with local_path.open("rb") as video_file:
                response = api.call(
                    "POST",
                    (payload.account.platform_user_id, "videos"),
                    params=params,
                    files={"source": video_file},
                    api_version=settings.facebook_graph_api_version,
                )
        except FacebookRequestError as error:
            _raise_facebook_api_error(error)
        except RequestException as error:
            raise RetryablePublishProviderError("Facebook publish failed") from error

        response_body = response.json()
        video_id = response_body.get("id") if isinstance(response_body, dict) else None

        if not isinstance(video_id, str) or not video_id:
            raise RetryablePublishProviderError(
                "Facebook publish response did not include video id"
            )

        return PublishProviderResult(
            platform_post_id=video_id,
            platform_post_url=f"https://www.facebook.com/{video_id}",
        )


def get_publish_provider(platform: str) -> PublishProvider:
    if platform == "YOUTUBE":
        return YouTubePublishProvider()

    if platform == "FACEBOOK":
        return FacebookPageVideoPublishProvider()

    raise TerminalPublishProviderError(f"{platform} publishing is not supported")


def ensure_fresh_youtube_account(
    session: Any,
    account: publish_repository.PlatformAccountRow,
) -> publish_repository.PlatformAccountRow:
    if account.platform != "YOUTUBE" or not _expires_soon(account.expires_at):
        return account

    if not account.refresh_token_encrypted:
        raise TerminalPublishProviderError("YouTube account must be reconnected")

    try:
        refresh_token = decrypt_platform_token(account.refresh_token_encrypted)
    except PlatformTokenCryptoError as error:
        raise TerminalPublishProviderError(
            error.error_message,
            error_code=error.error_code,
        ) from error

    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.youtube_client_id,
        client_secret=settings.youtube_client_secret,
    )

    try:
        credentials.refresh(GoogleAuthRequest())
    except TransportError as error:
        raise RetryablePublishProviderError("YouTube token refresh failed") from error
    except RefreshError as error:
        raise TerminalPublishProviderError(
            "YouTube account must be reconnected"
        ) from error

    access_token = credentials.token

    if not isinstance(access_token, str) or not access_token:
        raise TerminalPublishProviderError("YouTube token refresh failed")

    expires_at = _as_utc_datetime(credentials.expiry)
    refresh_token_value = credentials.refresh_token or refresh_token
    publish_repository.update_platform_account_credentials(
        session,
        str(account.id),
        access_token_encrypted=encrypt_platform_token(access_token),
        refresh_token_encrypted=encrypt_platform_token(refresh_token_value),
        expires_at=expires_at,
    )

    return publish_repository.PlatformAccountRow(
        id=account.id,
        workspace_id=account.workspace_id,
        platform=account.platform,
        platform_user_id=account.platform_user_id,
        status="CONNECTED",
        access_token_encrypted=encrypt_platform_token(access_token),
        refresh_token_encrypted=encrypt_platform_token(refresh_token_value),
        expires_at=expires_at,
    )


def _build_facebook_api(access_token: str) -> FacebookAdsApi:
    return FacebookAdsApi.init(
        app_id=settings.facebook_app_id,
        app_secret=settings.facebook_app_secret,
        access_token=access_token,
        api_version=settings.facebook_graph_api_version,
        timeout=1800,
    )


def _require_decrypted_token(account: publish_repository.PlatformAccountRow) -> str:
    if not account.access_token_encrypted:
        raise TerminalPublishProviderError("Platform account token is missing")

    if account.status != "CONNECTED":
        raise TerminalPublishProviderError("Platform account must be reconnected")

    if account.platform == "FACEBOOK" and _expires_soon(account.expires_at):
        raise TerminalPublishProviderError("Facebook account must be reconnected")

    try:
        return decrypt_platform_token(account.access_token_encrypted)
    except PlatformTokenCryptoError as error:
        raise TerminalPublishProviderError(
            error.error_message,
            error_code=error.error_code,
        ) from error


def _download_publish_source(source: publish_repository.PublishSourceRow) -> Path:
    suffix = Path(source.filename).suffix or ".mp4"
    destination = (
        settings.tmp_dir
        / "publishing"
        / f"{source.source_type.lower()}-{source.id}{suffix}"
    )
    return s3_service.download_file(
        source.s3_key,
        destination,
        bucket=source.s3_bucket,
    )


def _task_title(
    task: publish_repository.PublishTaskRow,
    source: publish_repository.PublishSourceRow,
) -> str:
    return task.title or Path(source.filename).stem or "Untitled video"


def _task_description(task: publish_repository.PublishTaskRow) -> str:
    parts = [task.description or task.caption or ""]
    tags = _task_tags(task)

    if tags:
        parts.append(" ".join(f"#{tag}" for tag in tags))

    return "\n\n".join(part for part in parts if part).strip()


def _task_tags(task: publish_repository.PublishTaskRow) -> list[str]:
    if isinstance(task.hashtags, list):
        return [
            str(tag).strip().lstrip("#") for tag in task.hashtags if str(tag).strip()
        ]

    return []


def _guess_mime_type(path: Path) -> str:
    return mimetypes.guess_type(path.name)[0] or "video/mp4"


def _expires_soon(value: datetime | None) -> bool:
    if value is None:
        return False

    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)

    return value <= datetime.now(UTC) + timedelta(
        seconds=settings.platform_token_refresh_window_seconds
    )


def _as_utc_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)


def _raise_google_api_error(error: HttpError, fallback: str) -> NoReturn:
    status_code = error.status_code
    message = _extract_google_error_message(error) or fallback
    if status_code in {408, 409, 425, 429} or status_code >= 500:
        raise RetryablePublishProviderError(message)

    raise TerminalPublishProviderError(message)


def _extract_google_error_message(error: HttpError) -> str | None:
    try:
        payload = json.loads(error.content.decode("utf-8"))
    except (AttributeError, UnicodeDecodeError, json.JSONDecodeError):
        return str(error) or None

    if not isinstance(payload, dict):
        return str(error) or None

    error_payload = payload.get("error")
    if isinstance(error_payload, dict):
        message = error_payload.get("message")
        if isinstance(message, str):
            return message

    return str(error) or None


def _raise_facebook_api_error(error: FacebookRequestError) -> NoReturn:
    status_code = error.http_status()
    message = (
        error.api_error_message() or error.get_message() or "Facebook publish failed"
    )

    if (
        error.api_transient_error()
        or status_code in {408, 409, 425, 429}
        or status_code >= 500
    ):
        raise RetryablePublishProviderError(message)

    raise TerminalPublishProviderError(message)
