import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings


class PlatformTokenCryptoError(Exception):
    pass


def _decode_base64url(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _encode_base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _token_key() -> bytes:
    key = base64.b64decode(settings.platform_token_encryption_key)

    if len(key) != 32:
        raise PlatformTokenCryptoError(
            "PLATFORM_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
        )

    return key


def decrypt_platform_token(encrypted_token: str) -> str:
    parts = encrypted_token.split(":")

    if len(parts) != 4 or parts[0] != "v1":
        raise PlatformTokenCryptoError("Invalid encrypted token format")

    _, iv_encoded, auth_tag_encoded, ciphertext_encoded = parts
    iv = _decode_base64url(iv_encoded)
    auth_tag = _decode_base64url(auth_tag_encoded)
    ciphertext = _decode_base64url(ciphertext_encoded)

    try:
        return (
            AESGCM(_token_key())
            .decrypt(iv, ciphertext + auth_tag, None)
            .decode("utf-8")
        )
    except Exception as error:  # pragma: no cover - exact crypto errors vary.
        raise PlatformTokenCryptoError("Could not decrypt platform token") from error


def encrypt_platform_token(token: str) -> str:
    iv = os.urandom(12)
    encrypted = AESGCM(_token_key()).encrypt(iv, token.encode("utf-8"), None)
    ciphertext = encrypted[:-16]
    auth_tag = encrypted[-16:]

    return ":".join(
        [
            "v1",
            _encode_base64url(iv),
            _encode_base64url(auth_tag),
            _encode_base64url(ciphertext),
        ]
    )
