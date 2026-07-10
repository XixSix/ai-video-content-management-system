from pathlib import Path
from uuid import UUID

import pytest

from app.db.publish_repository import (
    PlatformAccountRow,
    PublishSourceRow,
    PublishTaskRow,
)
from app.services.publish_provider import (
    FacebookPageVideoPublishProvider,
    PublishProviderInput,
    TerminalPublishProviderError,
    YouTubePublishProvider,
    get_publish_provider,
)
from app.services.platform_token_crypto import encrypt_platform_token


PUBLISH_TASK_ID = UUID("11111111-1111-4111-8111-111111111111")
USER_ID = UUID("22222222-2222-4222-8222-222222222222")
MEDIA_ID = UUID("33333333-3333-4333-8333-333333333333")
ACCOUNT_ID = UUID("44444444-4444-4444-8444-444444444444")
WORKSPACE_ID = UUID("55555555-5555-4555-8555-555555555555")
SOURCE_ID = UUID("66666666-6666-4666-8666-666666666666")


def test_publish_provider_registry_resolves_real_platforms() -> None:
    assert isinstance(get_publish_provider("YOUTUBE"), YouTubePublishProvider)
    assert isinstance(
        get_publish_provider("FACEBOOK"), FacebookPageVideoPublishProvider
    )


def test_publish_provider_registry_rejects_unsupported_platforms() -> None:
    with pytest.raises(TerminalPublishProviderError):
        get_publish_provider("TIKTOK")


def test_youtube_publish_provider_uploads_with_google_sdk(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    source_file = tmp_path / "source.mp4"
    calls: dict[str, object] = {}

    def download_file(
        _s3_key: str,
        destination: Path,
        *,
        bucket: str | None = None,
    ) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(b"video")
        calls["download"] = (destination, bucket)
        return destination

    class FakeInsertRequest:
        def execute(self, *, num_retries: int) -> dict[str, str]:
            calls["execute"] = num_retries
            return {"id": "youtube-video-id"}

    class FakeVideosResource:
        def insert(self, **kwargs: object) -> FakeInsertRequest:
            calls["insert"] = kwargs
            return FakeInsertRequest()

    class FakeYouTubeService:
        def videos(self) -> FakeVideosResource:
            return FakeVideosResource()

    def service_builder(*args: object, **kwargs: object) -> FakeYouTubeService:
        calls["service_builder"] = (args, kwargs)
        return FakeYouTubeService()

    def media_upload_factory(
        path: str,
        *,
        mimetype: str,
        resumable: bool,
    ) -> object:
        calls["media_upload"] = (path, mimetype, resumable)
        return object()

    monkeypatch.setattr(
        "app.services.publish_provider.s3_service.download_file",
        download_file,
    )

    result = YouTubePublishProvider(
        service_builder=service_builder,
        media_upload_factory=media_upload_factory,
    ).publish(
        PublishProviderInput(
            task=_task(platform="YOUTUBE"),
            account=_account(platform="YOUTUBE"),
            source=_source(filename=source_file.name),
        )
    )

    assert result.platform_post_id == "youtube-video-id"
    assert (
        result.platform_post_url == "https://www.youtube.com/watch?v=youtube-video-id"
    )
    assert calls["media_upload"] == (
        str(calls["download"][0]),
        "video/mp4",
        True,
    )
    assert calls["execute"] == 3
    insert = calls["insert"]
    assert isinstance(insert, dict)
    assert insert["part"] == "snippet,status"
    assert insert["body"] == {
        "snippet": {
            "title": "Video title",
            "description": "Description\n\n#ai #clips",
            "categoryId": "22",
            "tags": ["ai", "clips"],
        },
        "status": {
            "privacyStatus": "unlisted",
            "selfDeclaredMadeForKids": False,
        },
    }


def test_facebook_publish_provider_uploads_with_meta_sdk(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    calls: dict[str, object] = {}

    def download_file(
        _s3_key: str,
        destination: Path,
        *,
        bucket: str | None = None,
    ) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(b"video")
        calls["download"] = (destination, bucket)
        return destination

    class FakeFacebookResponse:
        def json(self) -> dict[str, str]:
            return {"id": "facebook-video-id"}

    class FakeFacebookApi:
        def call(self, *args: object, **kwargs: object) -> FakeFacebookResponse:
            files = kwargs.get("files")
            assert isinstance(files, dict)
            assert files["source"].read() == b"video"
            calls["api_call"] = (args, kwargs)
            return FakeFacebookResponse()

    def api_factory(access_token: str) -> FakeFacebookApi:
        calls["access_token"] = access_token
        return FakeFacebookApi()

    monkeypatch.setattr(
        "app.services.publish_provider.s3_service.download_file",
        download_file,
    )

    result = FacebookPageVideoPublishProvider(api_factory=api_factory).publish(
        PublishProviderInput(
            task=_task(platform="FACEBOOK"),
            account=_account(
                platform="FACEBOOK",
                platform_user_id="facebook-page-id",
            ),
            source=_source(filename="source.mp4"),
        )
    )

    assert result.platform_post_id == "facebook-video-id"
    assert result.platform_post_url == "https://www.facebook.com/facebook-video-id"
    assert calls["access_token"] == "platform-access-token"
    args, kwargs = calls["api_call"]
    assert args == ("POST", ("facebook-page-id", "videos"))
    assert kwargs["params"] == {
        "title": "Video title",
        "description": "Description\n\n#ai #clips",
    }


def _task(*, platform: str) -> PublishTaskRow:
    return PublishTaskRow(
        id=PUBLISH_TASK_ID,
        user_id=USER_ID,
        media_id=MEDIA_ID,
        project_id=None,
        short_clip_id=None,
        platform_account_id=ACCOUNT_ID,
        job_id=None,
        platform=platform,
        status="DRAFT",
        title="Video title",
        caption=None,
        description="Description",
        hashtags=["ai", "#clips"],
        platform_post_id=None,
        platform_post_url=None,
    )


def _account(
    *,
    platform: str,
    platform_user_id: str | None = None,
) -> PlatformAccountRow:
    return PlatformAccountRow(
        id=ACCOUNT_ID,
        workspace_id=WORKSPACE_ID,
        platform=platform,
        platform_user_id=platform_user_id,
        status="CONNECTED",
        access_token_encrypted=encrypt_platform_token("platform-access-token"),
        refresh_token_encrypted=None,
        expires_at=None,
    )


def _source(*, filename: str) -> PublishSourceRow:
    return PublishSourceRow(
        id=SOURCE_ID,
        source_type="MEDIA",
        s3_bucket="media-bucket",
        s3_key="media/source.mp4",
        mime_type="video/mp4",
        file_size_bytes=5,
        filename=filename,
    )
