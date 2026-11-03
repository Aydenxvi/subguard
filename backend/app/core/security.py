"""Telegram Mini App authentication.

`initData` is verified server-side with HMAC-SHA256 against the bot token.
`initDataUnsafe` from the client is never trusted.
Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import parse_qsl

from jose import JWTError, jwt

from app.core.config import settings


class InitDataError(Exception):
    """Raised when Telegram initData is missing, malformed, expired or forged."""


@dataclass(frozen=True)
class TelegramUser:
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    language_code: str = "en"


def _secret_key(bot_token: str) -> bytes:
    return hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()


def compute_init_data_hash(init_data: str, bot_token: str) -> str:
    pairs = [(k, v) for k, v in parse_qsl(init_data, keep_blank_values=True) if k != "hash"]
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs))
    return hmac.new(_secret_key(bot_token), data_check_string.encode(), hashlib.sha256).hexdigest()


def verify_init_data(
    init_data: str, bot_token: str | None = None, max_age_seconds: int | None = None
) -> dict[str, Any]:
    bot_token = bot_token if bot_token is not None else settings.telegram_bot_token
    max_age = settings.init_data_max_age_seconds if max_age_seconds is None else max_age_seconds

    if not bot_token:
        raise InitDataError("TELEGRAM_BOT_TOKEN is not configured")
    if not init_data:
        raise InitDataError("initData is empty")

    pairs = parse_qsl(init_data, keep_blank_values=True)
    if len({k for k, _ in pairs}) != len(pairs):
        raise InitDataError("duplicate initData fields")
    fields = dict(pairs)
    received_hash = fields.get("hash")
    if not received_hash:
        raise InitDataError("initData has no hash")

    expected = compute_init_data_hash(init_data, bot_token)
    if not hmac.compare_digest(expected, received_hash):
        raise InitDataError("initData signature mismatch")

    auth_date_raw = fields.get("auth_date")
    if not auth_date_raw or not auth_date_raw.isdigit():
        raise InitDataError("initData has no valid auth_date")
    if int(auth_date_raw) > time.time() + 30:
        raise InitDataError("initData is from the future")
    if max_age > 0 and time.time() - int(auth_date_raw) > max_age:
        raise InitDataError("initData is expired")

    return fields


def parse_telegram_user(fields: dict[str, Any]) -> TelegramUser:
    raw = fields.get("user")
    if not raw:
        raise InitDataError("initData has no user payload")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InitDataError("initData user payload is not valid JSON") from exc
    if not isinstance(data, dict) or not isinstance(data.get("id"), int) or isinstance(data.get("id"), bool) or data["id"] <= 0:
        raise InitDataError("initData user payload has no id")
    return TelegramUser(
        telegram_id=int(data["id"]),
        username=data.get("username"),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        language_code=data.get("language_code") or "en",
    )


def create_access_token(user_id: int, *, is_demo: bool = False) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "demo": is_demo,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=settings.jwt_ttl_seconds)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise InitDataError("invalid or expired session token") from exc
