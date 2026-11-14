"""Account profile, data deletion and public metadata."""

import httpx
from fastapi import APIRouter, Depends
from loguru import logger

from .. import db
from ..auth import User, require_user
from ..config import settings
from ..gnani import LANG
from ..llm import PROVIDERS
from ..schemas import DEFAULT_VOICE, VOICES

router = APIRouter()


@router.get("/api/meta")
async def meta():
    return {
        "voices": VOICES, "default_voice": DEFAULT_VOICE, "languages": list(LANG),
        "providers": {k: {"default_model": v["default_model"]} for k, v in PROVIDERS.items()},
        "guest_ttl_hours": settings.guest_ttl_hours,
    }


@router.get("/api/me")
async def me(user: User = Depends(require_user)):
    await db.upsert_user(user)
    return {"sub": user.sub, "email": user.email, "email_verified": user.email_verified,
            "name": user.name, "picture": user.picture}


async def _delete_auth0_user(sub: str) -> bool:
    """Needs the app to be authorised for the Management API with delete:users."""
    if not (settings.auth0_domain and settings.auth0_client_id and settings.auth0_client_secret):
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            tok = await c.post(f"https://{settings.auth0_domain}/oauth/token", json={
                "grant_type": "client_credentials", "client_id": settings.auth0_client_id,
                "client_secret": settings.auth0_client_secret,
                "audience": f"https://{settings.auth0_domain}/api/v2/"})
            if tok.status_code != 200:
                return False
            r = await c.delete(f"https://{settings.auth0_domain}/api/v2/users/{sub}",
                               headers={"Authorization": f"Bearer {tok.json()['access_token']}"})
            return r.status_code in (200, 204)
    except Exception as e:
        logger.warning(f"auth0 delete failed: {type(e).__name__}")
        return False


@router.delete("/api/me")
async def delete_me(user: User = Depends(require_user)):
    d = db.db()
    interviews = await d.interviews.delete_many({"owner_sub": user.sub})
    templates = await d.templates.delete_many({"owner_sub": user.sub})
    assignments = await d.assignments.delete_many({"owner_sub": user.sub})
    # Candidates keep their own interview records; the deleted recruiter loses access.
    await d.interviews.update_many({"recruiter_sub": user.sub}, {"$unset": {"recruiter_sub": ""}})
    await d.users.delete_one({"_id": user.sub})
    auth0_deleted = await _delete_auth0_user(user.sub)
    return {
        "deleted": {"interviews": interviews.deleted_count, "templates": templates.deleted_count,
                    "assignments": assignments.deleted_count},
        "auth0_profile_deleted": auth0_deleted,
    }
