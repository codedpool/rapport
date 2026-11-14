"""Server configuration, read once from the environment.

The repo-root `.env` is loaded first, then `server/.env` if present, so one
file can serve both local client and server during development.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

_SERVER_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_SERVER_DIR.parent / ".env")
load_dotenv(_SERVER_DIR / ".env", override=True)


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


def _list(name: str, default: str) -> list[str]:
    return [v.strip().rstrip("/") for v in os.getenv(name, default).split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    client_origins: list[str] = field(
        default_factory=lambda: _list("CLIENT_ORIGINS", "http://localhost:3000")
    )
    auth0_domain: str = os.getenv("AUTH0_DOMAIN", "").replace("https://", "").rstrip("/")
    auth0_client_id: str = os.getenv("AUTH0_CLIENT_ID", "")
    auth0_client_secret: str = os.getenv("AUTH0_CLIENT_SECRET", "")
    mongodb_uri: str = os.getenv("MONGODB_URI", "")
    mongodb_db: str = os.getenv("MONGODB_DB", "rapport")

    # Shared secret the Next.js server sends so the API can trust the client IP
    # it forwards. Without it, the socket peer address is used.
    internal_api_secret: str = os.getenv("INTERNAL_API_SECRET", "")
    # Trust X-Forwarded-For on websocket connections (set when behind a host proxy).
    trust_proxy_headers: bool = os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true"

    # Abuse controls
    max_concurrent_sessions: int = _int("MAX_CONCURRENT_SESSIONS", 20)
    max_concurrent_per_ip: int = _int("MAX_CONCURRENT_PER_IP", 2)
    max_sessions_per_ip_hour: int = _int("MAX_SESSIONS_PER_IP_HOUR", 12)
    max_sessions_per_user_day: int = _int("MAX_SESSIONS_PER_USER_DAY", 30)

    # Lifetimes
    ticket_ttl_s: int = _int("TICKET_TTL_SECONDS", 120)
    guest_ttl_hours: int = _int("GUEST_TTL_HOURS", 48)
    # Gnani realtime sessions cap at 15 minutes; stay under it.
    hard_cap_minutes: int = min(_int("HARD_CAP_MINUTES", 14), 14)

    log_level: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()
