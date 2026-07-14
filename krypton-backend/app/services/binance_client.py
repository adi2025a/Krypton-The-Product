# app/services/binance_client.py
import hmac
import hashlib
import time
import httpx

BINANCE_BASE_URL = "https://api.binance.com"
API_RESTRICTIONS_PATH = "/sapi/v1/account/apiRestrictions"

class BinanceVerificationError(Exception):
    """Raised when a Binance API key/secret pair fails validation."""
    pass

def _sign(query_string: str, api_secret: str) -> str:
    return hmac.new(
        api_secret.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

async def verify_binance_key(api_key: str, api_secret: str) -> dict:
    """
    Validates a Binance API key/secret pair and returns the key's permissions.

    Raises BinanceVerificationError if the key/secret is invalid, expired,
    IP-restricted against this server, or if Binance is unreachable.
    """
    timestamp = int(time.time() * 1000)
    query_string = f"timestamp={timestamp}&recvWindow=5000"
    signature = _sign(query_string, api_secret)

    url = f"{BINANCE_BASE_URL}{API_RESTRICTIONS_PATH}?{query_string}&signature={signature}"
    headers = {"X-MBX-APIKEY": api_key}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
    except httpx.RequestError as exc:
        raise BinanceVerificationError(f"Could not reach Binance: {exc}") from exc

    if response.status_code == 401:
        raise BinanceVerificationError("Invalid API key or signature")

    if response.status_code != 200:
        # Binance returns structured error bodies like {"code": -2015, "msg": "..."}
        try:
            body = response.json()
            msg = body.get("msg", "Unknown error")
        except ValueError:
            msg = response.text
        raise BinanceVerificationError(f"Binance rejected the request: {msg}")

    data = response.json()

    # Normalize the fields we actually care about downstream.
    return {
        "enableReading": data.get("enableReading", False),
        "enableSpotAndMarginTrading": data.get("enableSpotAndMarginTrading", False),
        "enableWithdrawals": data.get("enableWithdrawals", False),
        "enableFutures": data.get("enableFutures", False),
        "enableMargin": data.get("enableMargin", False),
        "ipRestrict": data.get("ipRestrict", False),
        "raw": data,  # keep the full payload around in case you need other fields later
    }

# app/services/binance_client.py (add to the same file)

ACCOUNT_PATH = "/api/v3/account"

async def get_account_snapshot(api_key: str, api_secret: str) -> dict:
    """
    Fetches current spot balances for a user.
    Only requires 'enableReading' permission on the key.
    """
    timestamp = int(time.time() * 1000)
    query_string = f"timestamp={timestamp}&recvWindow=5000"
    signature = _sign(query_string, api_secret)

    url = f"{BINANCE_BASE_URL}{ACCOUNT_PATH}?{query_string}&signature={signature}"
    headers = {"X-MBX-APIKEY": api_key}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
    except httpx.RequestError as exc:
        raise BinanceVerificationError(f"Could not reach Binance: {exc}") from exc

    if response.status_code != 200:
        try:
            msg = response.json().get("msg", "Unknown error")
        except ValueError:
            msg = response.text
        raise BinanceVerificationError(f"Failed to fetch account data: {msg}")

    data = response.json()

    # Filter out zero balances — no need to ship dust to the frontend
    balances = [
        {"asset": b["asset"], "free": b["free"], "locked": b["locked"]}
        for b in data.get("balances", [])
        if float(b["free"]) > 0 or float(b["locked"]) > 0
    ]

    return {"balances": balances, "updateTime": data.get("updateTime")}