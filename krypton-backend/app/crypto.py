# app/core/crypto.py
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# In production: fetch this from AWS KMS / Vault, not os.environ directly.
# This should be the *unwrapped* KEK, cached in memory only, never logged.
_KEK = base64.b64decode(os.environ["BINANCE_CRED_KEK"])  # 32 bytes, base64-encoded in env

def encrypt_secret(plaintext: str) -> tuple[bytes, bytes]:
    """Returns (nonce, ciphertext). Store both."""
    aesgcm = AESGCM(_KEK)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return nonce, ciphertext

def decrypt_secret(nonce: bytes, ciphertext: bytes) -> str:
    aesgcm = AESGCM(_KEK)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()