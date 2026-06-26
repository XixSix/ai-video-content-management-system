from app.services.platform_token_crypto import (
    decrypt_platform_token,
    encrypt_platform_token,
)


def test_platform_token_crypto_round_trips_backend_token_format() -> None:
    encrypted = encrypt_platform_token("youtube-access-token")

    assert encrypted.startswith("v1:")
    assert encrypted != "youtube-access-token"
    assert decrypt_platform_token(encrypted) == "youtube-access-token"
