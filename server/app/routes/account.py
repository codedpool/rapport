"""Account profile, data deletion and public metadata.

Deleting data removes everything Rapport stores. The Google sign-in record held by
Auth0 is left alone; it holds only name, email and picture.
"""

from fastapi import APIRouter, Depends

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


@router.delete("/api/me")
async def delete_me(user: User = Depends(require_user)):
    d = db.db()
    interviews = await d.interviews.delete_many({"owner_sub": user.sub})
    templates = await d.templates.delete_many({"owner_sub": user.sub})
    assignments = await d.assignments.delete_many({"owner_sub": user.sub})
    # Candidates keep their own interview records; the deleted recruiter loses access.
    await d.interviews.update_many({"recruiter_sub": user.sub}, {"$unset": {"recruiter_sub": ""}})
    await d.users.delete_one({"_id": user.sub})
    return {
        "deleted": {"interviews": interviews.deleted_count, "templates": templates.deleted_count,
                    "assignments": assignments.deleted_count},
    }
