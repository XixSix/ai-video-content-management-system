from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class MockPublishResult:
    platform_post_id: str
    platform_post_url: str


class MockPublishProvider:
    def publish(self, *, platform: str, publish_task_id: UUID) -> MockPublishResult:
        normalized_platform = platform.lower()
        deterministic_id = f"mock-{normalized_platform}-{publish_task_id}"

        return MockPublishResult(
            platform_post_id=deterministic_id,
            platform_post_url=f"https://mock.publish.local/{normalized_platform}/{publish_task_id}",
        )


mock_publish_provider = MockPublishProvider()
