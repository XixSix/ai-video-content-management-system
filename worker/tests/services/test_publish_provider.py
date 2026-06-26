import pytest

from app.services.publish_provider import (
    FacebookPageVideoPublishProvider,
    TerminalPublishProviderError,
    YouTubePublishProvider,
    get_publish_provider,
)


def test_publish_provider_registry_resolves_real_platforms() -> None:
    assert isinstance(get_publish_provider("YOUTUBE"), YouTubePublishProvider)
    assert isinstance(
        get_publish_provider("FACEBOOK"), FacebookPageVideoPublishProvider
    )


def test_publish_provider_registry_rejects_unsupported_platforms() -> None:
    with pytest.raises(TerminalPublishProviderError):
        get_publish_provider("TIKTOK")
