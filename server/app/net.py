"""Client address resolution for rate limits."""

import hmac

from fastapi import Request, WebSocket

from .config import settings


def client_ip(request: Request) -> str:
    """Trust the IP the Next.js server forwards only when it proves the shared secret."""
    secret = request.headers.get("x-internal-secret", "")
    if settings.internal_api_secret and secret and hmac.compare_digest(secret, settings.internal_api_secret):
        fwd = request.headers.get("x-client-ip", "").strip()
        if fwd and len(fwd) <= 64:
            return fwd
    return request.client.host if request.client else "unknown"


def ws_ip(ws: WebSocket) -> str:
    if settings.trust_proxy_headers:
        fwd = ws.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()[:64]
    return ws.client.host if ws.client else "unknown"
