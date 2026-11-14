"""Auth0 identity for API requests.

The Next.js server forwards the signed-in user's Auth0 ID token as a bearer
token. It is verified here against the tenant's JWKS (signature, issuer,
audience = our client id, expiry). Guests send no token.
"""

from dataclasses import dataclass

import jwt
from fastapi import HTTPException, Request
from jwt import PyJWKClient

from .config import settings

_jwks: PyJWKClient | None = None


def _client() -> PyJWKClient:
    global _jwks
    if _jwks is None:
        _jwks = PyJWKClient(f"https://{settings.auth0_domain}/.well-known/jwks.json", cache_keys=True)
    return _jwks


@dataclass(frozen=True)
class User:
    sub: str
    email: str | None
    email_verified: bool
    name: str | None
    picture: str | None


def _verify(token: str) -> User:
    try:
        key = _client().get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token, key, algorithms=["RS256"],
            audience=settings.auth0_client_id,
            issuer=f"https://{settings.auth0_domain}/",
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
            leeway=30,
        )
    except jwt.PyJWTError:
        raise HTTPException(401, "Your sign-in has expired. Please sign in again.")
    email = claims.get("email")
    return User(
        sub=claims["sub"],
        email=email.lower() if isinstance(email, str) else None,
        email_verified=bool(claims.get("email_verified")),
        name=claims.get("name"),
        picture=claims.get("picture"),
    )


def optional_user(request: Request) -> User | None:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    if not settings.auth0_domain or not settings.auth0_client_id:
        raise HTTPException(503, "Sign-in is not configured on this server.")
    return _verify(auth[7:].strip())


def require_user(request: Request) -> User:
    user = optional_user(request)
    if not user:
        raise HTTPException(401, "Please sign in.")
    return user
