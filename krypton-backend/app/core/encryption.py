"""
Generic symmetric encryption for anything sensitive we store at rest
(LLM API keys, Binance API keys, etc).

Fernet = AES-128 in CBC mode + HMAC for integrity, all in one package.
It's the standard "I just need to encrypt/decrypt a string safely"
tool in the `cryptography` library -- not custom crypto, a well-vetted
recipe.

settings.ENCRYPTION_KEY must be a Fernet key (44-char base64 string).
Generate one with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings

_fernet = Fernet(settings.ENCRYPTION_KEY.encode("utf-8"))


def encrypt_value(plain_text: str) -> str:
    """Returns a base64 ciphertext string, safe to store in a DB column."""
    return _fernet.encrypt(plain_text.encode("utf-8")).decode("utf-8")


def decrypt_value(cipher_text: str) -> str:
    """Raises InvalidToken if the ciphertext is tampered with or the key is wrong."""
    return _fernet.decrypt(cipher_text.encode("utf-8")).decode("utf-8")


__all__ = ["encrypt_value", "decrypt_value", "InvalidToken"]