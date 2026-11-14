"""Secret handling: guest API keys live only in memory and never reach logs.

Every key a session holds is registered here while the session is alive. Log
records from both loguru (Pipecat) and stdlib logging (uvicorn, httpx) are
scrubbed of any registered secret before they are written.
"""

import hashlib
import hmac
import logging
import re
import secrets
import sys
import threading

from loguru import logger

_lock = threading.Lock()
_active: dict[str, int] = {}

# Patterns that look like credentials even if not registered (defence in depth).
_PATTERNS = [
    re.compile(r"(sk-or-v1-)[A-Za-z0-9]{16,}"),
    re.compile(r"(AIza)[A-Za-z0-9_\-]{20,}"),
    re.compile(r"(?i)(x-api-key-id['\"]?\s*[:=]\s*['\"]?)[^'\"\s,}]+"),
    re.compile(r"(?i)(authorization['\"]?\s*[:=]\s*['\"]?bearer\s+)[^'\"\s,}]+"),
]


class Secret:
    """A string that refuses to print itself."""

    __slots__ = ("_value",)

    def __init__(self, value: str):
        self._value = value
        register(value)

    def get(self) -> str:
        return self._value

    def drop(self) -> None:
        unregister(self._value)
        self._value = ""

    def __repr__(self) -> str:
        return "Secret(***)"

    __str__ = __repr__


def register(value: str) -> None:
    if not value or len(value) < 8:
        return
    with _lock:
        _active[value] = _active.get(value, 0) + 1


def unregister(value: str) -> None:
    with _lock:
        n = _active.get(value, 0) - 1
        if n <= 0:
            _active.pop(value, None)
        else:
            _active[value] = n


def redact(text: str) -> str:
    if not text:
        return text
    with _lock:
        values = list(_active)
    for v in values:
        if v in text:
            text = text.replace(v, "[redacted]")
    for p in _PATTERNS:
        text = p.sub(lambda m: m.group(1) + "[redacted]", text)
    return text


class _StdlibRedactFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        try:
            msg = record.getMessage()
        except Exception:
            return True
        clean = redact(msg)
        if clean != msg:
            record.msg, record.args = clean, None
        return True


def setup_logging(level: str) -> None:
    logger.remove()
    logger.add(
        sys.stderr,
        level=level,
        format="{time:HH:mm:ss} | {level: <7} | {name}:{line} - {message}",
        backtrace=False,
        diagnose=False,  # diagnose would print local variable values, including keys
    )
    logger.configure(patcher=lambda r: r.update(message=redact(r["message"])))
    f = _StdlibRedactFilter()
    for name in ("", "uvicorn", "uvicorn.error", "uvicorn.access", "httpx", "websockets"):
        lg = logging.getLogger(name)
        lg.addFilter(f)
        for h in lg.handlers:
            h.addFilter(f)
    # httpx logs full request URLs at INFO; keep it quiet.
    logging.getLogger("httpx").setLevel(logging.WARNING)


def new_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def tokens_match(token: str, token_hash: str) -> bool:
    return bool(token) and hmac.compare_digest(hash_token(token), token_hash)
