"""
Validates a user-supplied LLM API key by making one cheap, read-only
call to that provider -- just enough to confirm the key authenticates,
without spending tokens on an actual completion.
"""

import httpx

TIMEOUT = 10.0


async def _check_openai(api_key: str) -> bool:
    url = "https://api.openai.com/v1/models"
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, headers=headers)
    return resp.status_code == 200


async def _check_groq(api_key: str) -> bool:
    # Groq exposes an OpenAI-compatible API
    url = "https://api.groq.com/openai/v1/models"
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, headers=headers)
    return resp.status_code == 200


async def _check_gemini(api_key: str) -> bool:
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url)
    return resp.status_code == 200


async def _check_claude(api_key: str) -> bool:
    url = "https://api.anthropic.com/v1/models"
    headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01"}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, headers=headers)
    return resp.status_code == 200


_CHECKERS = {
    "openai": _check_openai,
    "groq": _check_groq,
    "gemini": _check_gemini,
    "claude": _check_claude,
}


async def validate_llm_key(provider: str, api_key: str) -> bool:
    checker = _CHECKERS.get(provider)
    if checker is None:
        return False
    try:
        return await checker(api_key)
    except httpx.HTTPError:
        # network error, timeout, DNS failure etc. -- treat as "couldn't verify"
        return False


async def get_active_llm_credentials(db, user_id) -> dict | None:
    """
    Used by agent nodes (not routes) to fetch the user's currently active
    LLM key, decrypted, ready to pass into llm_client_service.call_llm.
    Returns None if no active key, or if it has expired -- callers must
    handle that (e.g. return a friendly "please set an LLM key" message).
    """
    from datetime import datetime, timezone
    from sqlalchemy import select
    from app.models.api_key import LLMApiKey
    from app.core.encryption import decrypt_value

    result = await db.execute(
        select(LLMApiKey).where(LLMApiKey.user_id == user_id, LLMApiKey.is_active == True)  # noqa: E712
    )
    key_row = result.scalars().first()

    if key_row is None:
        return None
    if key_row.expires_at < datetime.now(timezone.utc):
        return None  # expired -- treat same as "not set" from the agent's perspective

    return {
        "provider": key_row.provider,
        "model_name": key_row.model_name,
        "api_key": decrypt_value(key_row.encrypted_key),
    }