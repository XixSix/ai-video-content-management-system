import json
import mimetypes
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Protocol

from app.core.config import settings
from app.db import publish_repository
from app.services.platform_token_crypto import (
    decrypt_platform_token,
    encrypt_platform_token,
)
from app.services.s3_service import s3_service


class PublishProviderError(Exception):
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


@dataclass(frozen=True)
class HttpJsonResponse:
    data: dict[str, Any]
    headers: dict[str, str]


class PublishProvider(Protocol):
    def publish(self, payload: PublishProviderInput) -> PublishProviderResult: ...


class HttpJsonClient:
    def request(
        self,
        url: str,
        *,
        method: str = "GET",
        headers: dict[str, str] | None = None,
        body: bytes | None = None,
        timeout_seconds: int = 120,
    ) -> HttpJsonResponse:
        request = urllib.request.Request(
            url,
            data=body,
            headers=headers or {},
            method=method,
        )

        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                payload = response.read()
                response_headers = dict(response.headers.items())
        except urllib.error.HTTPError as error:
            error_payload = error.read().decode("utf-8", errors="replace")
            _raise_http_error(error.code, error_payload)
        except urllib.error.URLError as error:
            raise RetryablePublishProviderError("Platform request failed") from error

        data: dict[str, Any] = {}

        if payload:
            try:
                decoded = json.loads(payload.decode("utf-8"))
            except json.JSONDecodeError as error:
                raise RetryablePublishProviderError(
                    "Platform returned invalid JSON"
                ) from error

            if isinstance(decoded, dict) and decoded.get("error"):
                raise TerminalPublishProviderError(_extract_platform_error(decoded))

            if not isinstance(decoded, dict):
                raise RetryablePublishProviderError("Platform returned invalid payload")

            data = decoded

        return HttpJsonResponse(data=data, headers=response_headers)

    def request_json(
        self,
        url: str,
        *,
        method: str = "GET",
        headers: dict[str, str] | None = None,
        body: bytes | None = None,
        timeout_seconds: int = 120,
    ) -> dict[str, Any]:
        return self.request(
            url,
            method=method,
            headers=headers,
            body=body,
            timeout_seconds=timeout_seconds,
        ).data


class YouTubePublishProvider:
    def __init__(self, *, http_client: HttpJsonClient | None = None) -> None:
        self.http_client = http_client or HttpJsonClient()

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

        query = urllib.parse.urlencode(
            {"part": "snippet,status", "uploadType": "resumable"}
        )
        session = self.http_client.request(
            f"https://www.googleapis.com/upload/youtube/v3/videos?{query}",
            method="POST",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Type": mime_type,
                "X-Upload-Content-Length": str(local_path.stat().st_size),
            },
            body=json.dumps(metadata).encode("utf-8"),
        )
        upload_url = session.headers.get("Location") or session.headers.get("location")

        if not isinstance(upload_url, str):
            raise RetryablePublishProviderError(
                "YouTube resumable upload session did not include uploadUrl"
            )

        response = self.http_client.request_json(
            upload_url,
            method="PUT",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": mime_type,
                "Content-Length": str(local_path.stat().st_size),
            },
            body=local_path.read_bytes(),
            timeout_seconds=1800,
        )
        video_id = response.get("id")

        if not isinstance(video_id, str) or not video_id:
            raise RetryablePublishProviderError(
                "YouTube response did not include video id"
            )

        return PublishProviderResult(
            platform_post_id=video_id,
            platform_post_url=f"https://www.youtube.com/watch?v={video_id}",
        )


class FacebookPageVideoPublishProvider:
    def __init__(self, *, http_client: HttpJsonClient | None = None) -> None:
        self.http_client = http_client or HttpJsonClient()

    def publish(self, payload: PublishProviderInput) -> PublishProviderResult:
        access_token = _require_decrypted_token(payload.account)

        if not payload.account.platform_user_id:
            raise TerminalPublishProviderError("Facebook Page id is missing")

        local_path = _download_publish_source(payload.source)
        mime_type = payload.source.mime_type or _guess_mime_type(local_path)
        file_length = local_path.stat().st_size
        upload_handle = self._upload_to_meta(
            access_token=access_token,
            file_length=file_length,
            file_path=local_path,
            mime_type=mime_type,
        )
        video_id = self._publish_page_video(
            page_id=payload.account.platform_user_id,
            page_access_token=access_token,
            task=payload.task,
            source=payload.source,
            upload_handle=upload_handle,
        )

        return PublishProviderResult(
            platform_post_id=video_id,
            platform_post_url=f"https://www.facebook.com/{video_id}",
        )

    def _upload_to_meta(
        self,
        *,
        access_token: str,
        file_length: int,
        file_path: Path,
        mime_type: str,
    ) -> str:
        params = urllib.parse.urlencode(
            {
                "file_name": file_path.name,
                "file_length": str(file_length),
                "file_type": mime_type,
                "access_token": access_token,
            }
        )
        session = self.http_client.request_json(
            f"https://graph.facebook.com/{settings.facebook_graph_api_version}/{settings.facebook_app_id}/uploads?{params}",
            method="POST",
        )
        session_id = session.get("id")

        if not isinstance(session_id, str) or not session_id:
            raise RetryablePublishProviderError(
                "Facebook upload session did not include id"
            )

        response = self.http_client.request_json(
            f"https://graph.facebook.com/{settings.facebook_graph_api_version}/{session_id}",
            method="POST",
            headers={
                "Authorization": f"OAuth {access_token}",
                "file_offset": "0",
                "Content-Type": "application/octet-stream",
            },
            body=file_path.read_bytes(),
            timeout_seconds=1800,
        )
        handle = response.get("h")

        if not isinstance(handle, str) or not handle:
            raise RetryablePublishProviderError(
                "Facebook upload response did not include file handle"
            )

        return handle

    def _publish_page_video(
        self,
        *,
        page_id: str,
        page_access_token: str,
        task: publish_repository.PublishTaskRow,
        source: publish_repository.PublishSourceRow,
        upload_handle: str,
    ) -> str:
        form = urllib.parse.urlencode(
            {
                "access_token": page_access_token,
                "title": _task_title(task, source),
                "description": _task_description(task),
                "fbuploader_video_file_chunk": upload_handle,
            }
        ).encode("utf-8")
        response = self.http_client.request_json(
            f"https://graph-video.facebook.com/{settings.facebook_graph_api_version}/{page_id}/videos",
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            body=form,
            timeout_seconds=300,
        )
        video_id = response.get("id")

        if not isinstance(video_id, str) or not video_id:
            raise RetryablePublishProviderError(
                "Facebook publish response did not include video id"
            )

        return video_id


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

    refresh_token = decrypt_platform_token(account.refresh_token_encrypted)
    form = urllib.parse.urlencode(
        {
            "client_id": settings.youtube_client_id,
            "client_secret": settings.youtube_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")
    response = HttpJsonClient().request_json(
        "https://oauth2.googleapis.com/token",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=form,
        timeout_seconds=60,
    )
    access_token = response.get("access_token")

    if not isinstance(access_token, str) or not access_token:
        raise TerminalPublishProviderError("YouTube token refresh failed")

    expires_in = response.get("expires_in")
    expires_at = (
        datetime.now(UTC) + timedelta(seconds=int(expires_in))
        if isinstance(expires_in, int)
        else None
    )
    refresh_token_value = (
        response["refresh_token"]
        if isinstance(response.get("refresh_token"), str)
        else refresh_token
    )
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


def _require_decrypted_token(account: publish_repository.PlatformAccountRow) -> str:
    if not account.access_token_encrypted:
        raise TerminalPublishProviderError("Platform account token is missing")

    if account.status != "CONNECTED":
        raise TerminalPublishProviderError("Platform account must be reconnected")

    if account.platform == "FACEBOOK" and _expires_soon(account.expires_at):
        raise TerminalPublishProviderError("Facebook account must be reconnected")

    return decrypt_platform_token(account.access_token_encrypted)


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


def _raise_http_error(status_code: int, payload: str) -> None:
    message = payload or f"Platform request failed with status {status_code}"

    if status_code in {408, 409, 425, 429} or status_code >= 500:
        raise RetryablePublishProviderError(message)

    raise TerminalPublishProviderError(message)


def _extract_platform_error(payload: dict[str, Any]) -> str:
    error = payload.get("error")

    if isinstance(error, dict):
        message = error.get("message")
        if isinstance(message, str):
            return message

    return "Platform request failed"
