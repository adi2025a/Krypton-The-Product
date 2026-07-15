"""
Binance private (signed) endpoints require:
1. `X-MBX-APIKEY` header = your API key
2. A `signature` query param = HMAC-SHA256(secret_key, query_string)
3. A `timestamp` param (server rejects requests too far from its clock)

We use this same signed request both to VALIDATE a key (a call succeeds
only if the key+secret pair is genuinely correct) and to fetch the
account's live balances.
"""

import hmac
import hashlib
import time
from urllib.parse import urlencode

import httpx

BASE_URL = "https://api.binance.com"
TIMEOUT = 10.0


def _sign(query_string: str, api_secret: str) -> str:
    return hmac.new(
        api_secret.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


async def _signed_get(path: str, api_key: str, api_secret: str, extra_params: dict | None = None) -> httpx.Response:
    params = {"timestamp": int(time.time() * 1000), "recvWindow": 5000}
    if extra_params:
        params.update(extra_params)

    query_string = urlencode(params)
    params["signature"] = _sign(query_string, api_secret)

    headers = {"X-MBX-APIKEY": api_key}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        return await client.get(f"{BASE_URL}{path}", params=params, headers=headers)


async def validate_binance_key(api_key: str, api_secret: str) -> bool:
    """
    Hits /api/v3/account -- succeeds only with a correct, active key+secret
    pair. Read-only keys can call this fine; it doesn't require trading
    permission.
    """
    try:
        resp = await _signed_get("/api/v3/account", api_key, api_secret)
        return resp.status_code == 200
    except httpx.HTTPError:
        return False


async def fetch_portfolio(api_key: str, api_secret: str) -> list[dict]:
    """
    Returns non-zero balances only -- Binance accounts list every asset
    ever supported, most of them zero, which is noise for a "portfolio" view.
    """
    resp = await _signed_get("/api/v3/account", api_key, api_secret)
    resp.raise_for_status()
    data = resp.json()

    balances = []
    for entry in data.get("balances", []):
        free = float(entry["free"])
        locked = float(entry["locked"])
        if free > 0 or locked > 0:
            balances.append({"asset": entry["asset"], "free": free, "locked": locked})
    return balances