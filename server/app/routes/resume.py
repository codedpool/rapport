"""Resumes: read once, review, and keep several named versions on the account.

Only the short reviewed summary of each resume is stored, never the file or full text.
"""

import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from .. import db, llm
from ..auth import User, optional_user, require_user
from ..interview import resume as resume_mod
from ..net import client_ip
from ..schemas import ResumeItemIn, ResumeParseIn

router = APIRouter()

MAX_RESUMES = 10
MAX_PARSES_PER_HOUR = 12
_PARSES: dict[str, list[float]] = {}


async def load_resumes(sub: str) -> tuple[list[dict], str | None]:
    """The user's resumes and default id, upgrading the earlier single-resume field."""
    doc = await db.db().users.find_one({"_id": sub}, {"resume": 1, "resumes": 1, "default_resume_id": 1}) or {}
    items = doc.get("resumes")
    default_id = doc.get("default_resume_id")
    if items is None and doc.get("resume"):
        legacy = dict(doc["resume"], id=uuid.uuid4().hex, label="My resume")
        items, default_id = [legacy], legacy["id"]
        await db.db().users.update_one({"_id": sub}, {"$set": {"resumes": items, "default_resume_id": default_id},
                                                       "$unset": {"resume": ""}})
    items = items or []
    if items and default_id not in {r["id"] for r in items}:
        default_id = items[0]["id"]
    return items, default_id


async def default_resume(sub: str) -> dict | None:
    items, default_id = await load_resumes(sub)
    return next((r for r in items if r["id"] == default_id), None)


@router.post("/api/resume/parse")
async def parse_resume(body: ResumeParseIn, request: Request, user: User | None = Depends(optional_user)):
    who = user.sub if user else client_ip(request)
    now = time.time()
    recent = [t for t in _PARSES.get(who, []) if now - t < 3600]
    if len(recent) >= MAX_PARSES_PER_HOUR:
        raise HTTPException(429, "That's a lot of resumes for one hour. Try again later.")
    _PARSES[who] = recent + [now]

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


@router.get("/api/resumes")
async def list_resumes(user: User = Depends(require_user)):
    items, default_id = await load_resumes(user.sub)
    return {"resumes": items, "default_id": default_id}


@router.post("/api/resumes")
async def add_resume(body: ResumeItemIn, user: User = Depends(require_user)):
    await db.upsert_user(user)
    items, default_id = await load_resumes(user.sub)
    if len(items) >= MAX_RESUMES:
        raise HTTPException(409, f"You can keep up to {MAX_RESUMES} resumes. Delete one to add another.")
    item = dict(body.model_dump(), id=uuid.uuid4().hex, updated_at=db.now())
    update = {"$push": {"resumes": item}}
    if not default_id:
        update["$set"] = {"default_resume_id": item["id"]}
    await db.db().users.update_one({"_id": user.sub}, update)
    return {"resume": item, "default_id": default_id or item["id"]}


@router.put("/api/resumes/{rid}")
async def update_resume(rid: str, body: ResumeItemIn, user: User = Depends(require_user)):
    await load_resumes(user.sub)
    data = dict(body.model_dump(), id=rid, updated_at=db.now())
    res = await db.db().users.update_one({"_id": user.sub, "resumes.id": rid}, {"$set": {"resumes.$": data}})
    if res.matched_count != 1:
        raise HTTPException(404, "Resume not found.")
    return {"resume": data}


@router.post("/api/resumes/{rid}/default")
async def set_default(rid: str, user: User = Depends(require_user)):
    items, _ = await load_resumes(user.sub)
    if rid not in {r["id"] for r in items}:
        raise HTTPException(404, "Resume not found.")
    await db.db().users.update_one({"_id": user.sub}, {"$set": {"default_resume_id": rid}})
    return {"default_id": rid}


@router.delete("/api/resumes/{rid}")
async def delete_resume(rid: str, user: User = Depends(require_user)):
    items, default_id = await load_resumes(user.sub)
    if rid not in {r["id"] for r in items}:
        raise HTTPException(404, "Resume not found.")
    rest = [r for r in items if r["id"] != rid]
    new_default = default_id if default_id != rid else (rest[0]["id"] if rest else None)
    await db.db().users.update_one({"_id": user.sub}, {"$set": {"resumes": rest, "default_resume_id": new_default}})
    return {"ok": True, "default_id": new_default}
