"""Resume: read once, review, and optionally save the short summary to the account."""

import time

from fastapi import APIRouter, Depends, HTTPException, Request

from .. import db, llm
from ..auth import User, optional_user, require_user
from ..interview import resume as resume_mod
from ..net import client_ip
from ..schemas import ResumeParseIn, ResumeProfile

router = APIRouter()

_PARSES: dict[str, list[float]] = {}
MAX_PARSES_PER_HOUR = 12


@router.post("/api/resume/parse")
async def parse_resume(body: ResumeParseIn, request: Request, user: User | None = Depends(optional_user)):
    ip = client_ip(request)
    now = time.time()
    recent = [t for t in _PARSES.get(user.sub if user else ip, []) if now - t < 3600]
    if len(recent) >= MAX_PARSES_PER_HOUR:
        raise HTTPException(429, "That's a lot of resumes for one hour. Try again later.")
    _PARSES[user.sub if user else ip] = recent + [now]

    text = resume_mod.scrub(body.text)
    if len(text) < 150:
        raise HTTPException(422, "There isn't enough text in this resume to read. If it's a scanned image, paste the text instead.")
    try:
        profile = await resume_mod.parse(text, provider=body.llm_provider, key=body.llm_api_key, model=body.llm_model)
    except llm.LLMError as e:
        raise HTTPException(400 if e.auth else 502, str(e))
    if not (profile.roles or profile.projects or profile.skills):
        raise HTTPException(422, "This doesn't look like a resume. Check the file, or paste the text instead.")
    profile.file_name = body.file_name
    return profile.model_dump()


@router.get("/api/resume")
async def get_resume(user: User = Depends(require_user)):
    doc = await db.db().users.find_one({"_id": user.sub}, {"resume": 1})
    return {"resume": (doc or {}).get("resume")}


@router.put("/api/resume")
async def save_resume(body: ResumeProfile, user: User = Depends(require_user)):
    await db.upsert_user(user)
    data = body.model_dump()
    data["updated_at"] = db.now()
    await db.db().users.update_one({"_id": user.sub}, {"$set": {"resume": data}})
    return {"resume": data}


@router.delete("/api/resume")
async def delete_resume(user: User = Depends(require_user)):
    await db.db().users.update_one({"_id": user.sub}, {"$unset": {"resume": ""}})
    return {"ok": True}
