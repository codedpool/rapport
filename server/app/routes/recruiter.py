"""Recruiter side: templates, assignments, results release. Candidate's view of assignments."""

import re

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..auth import User, require_user
from ..schemas import AssignIn, ReleaseIn, TemplateIn

router = APIRouter()

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
MAX_ASSIGN = 100


def _out(doc: dict) -> dict:
    doc["id"] = doc.pop("_id")
    return doc


# ---- templates -----------------------------------------------------------

@router.get("/api/templates")
async def list_templates(user: User = Depends(require_user)):
    cur = db.db().templates.find({"owner_sub": user.sub}).sort("created_at", -1).limit(200)
    return {"templates": [_out(d) async for d in cur]}


@router.post("/api/templates")
async def create_template(body: TemplateIn, user: User = Depends(require_user)):
    await db.upsert_user(user)
    doc = {"_id": db.new_id(), "owner_sub": user.sub, **body.model_dump(),
           "created_at": db.now(), "updated_at": db.now()}
    await db.db().templates.insert_one(doc)
    return _out(doc)


@router.put("/api/templates/{tid}")
async def update_template(tid: str, body: TemplateIn, user: User = Depends(require_user)):
    res = await db.db().templates.find_one_and_update(
        {"_id": tid, "owner_sub": user.sub},
        {"$set": {**body.model_dump(), "updated_at": db.now()}},
        return_document=True,
    )
    if not res:
        raise HTTPException(404, "Template not found.")
    await db.db().assignments.update_many({"template_id": tid}, {"$set": {"template_name": body.name}})
    return _out(res)


@router.delete("/api/templates/{tid}")
async def delete_template(tid: str, user: User = Depends(require_user)):
    res = await db.db().templates.delete_one({"_id": tid, "owner_sub": user.sub})
    if res.deleted_count != 1:
        raise HTTPException(404, "Template not found.")
    await db.db().assignments.delete_many({"template_id": tid, "owner_sub": user.sub, "status": "pending"})
    return {"ok": True}


# ---- assignments (recruiter) ---------------------------------------------

@router.post("/api/assignments")
async def assign(body: AssignIn, user: User = Depends(require_user)):
    t = await db.db().templates.find_one({"_id": body.template_id, "owner_sub": user.sub})
    if not t:
        raise HTTPException(404, "Template not found.")
    raw = [e.strip().lower() for e in re.split(r"[,\n;\s]+", body.emails) if e.strip()]
    emails, invalid = [], []
    for e in raw:
        (emails if EMAIL_RE.match(e) and len(e) <= 254 else invalid).append(e)
    emails = list(dict.fromkeys(emails))
    if not emails:
        raise HTTPException(422, "No valid email addresses found.")
    if len(emails) > MAX_ASSIGN:
        raise HTTPException(422, f"At most {MAX_ASSIGN} candidates at a time.")
    existing = {a["candidate_email"] async for a in db.db().assignments.find(
        {"template_id": t["_id"], "candidate_email": {"$in": emails}, "status": {"$ne": "completed"}},
        {"candidate_email": 1})}
    docs = [{"_id": db.new_id(), "template_id": t["_id"], "template_name": t["name"],
             "owner_sub": user.sub, "candidate_email": e, "status": "pending", "released": False,
             "created_at": db.now()} for e in emails if e not in existing]
    if docs:
        await db.db().assignments.insert_many(docs)
    return {"created": len(docs), "skipped_existing": len(existing), "invalid": invalid[:20]}


@router.get("/api/assignments")
async def list_assignments(user: User = Depends(require_user)):
    cur = db.db().assignments.find({"owner_sub": user.sub}).sort("created_at", -1).limit(500)
    items = [_out(d) async for d in cur]
    ids = [a["interview_id"] for a in items if a.get("interview_id")]
    scores = {}
    if ids:
        async for i in db.db().interviews.find(
            {"_id": {"$in": ids}, "recruiter_sub": user.sub},
            {"feedback.overall": 1, "feedback.scores": 1, "status": 1, "duration_s": 1},
        ):
            scores[i["_id"]] = {"overall": (i.get("feedback") or {}).get("overall"),
                                "interview_status": i.get("status"), "duration_s": i.get("duration_s")}
    for a in items:
        a.update(scores.get(a.get("interview_id"), {}))
    return {"assignments": items}


@router.patch("/api/assignments/{aid}/release")
async def release(aid: str, body: ReleaseIn, user: User = Depends(require_user)):
    a = await db.db().assignments.find_one_and_update(
        {"_id": aid, "owner_sub": user.sub}, {"$set": {"released": body.released}}, return_document=True)
    if not a:
        raise HTTPException(404, "Assignment not found.")
    if a.get("interview_id"):
        await db.db().interviews.update_one(
            {"_id": a["interview_id"], "recruiter_sub": user.sub}, {"$set": {"released": body.released}})
    return {"ok": True, "released": body.released}


@router.delete("/api/assignments/{aid}")
async def delete_assignment(aid: str, user: User = Depends(require_user)):
    res = await db.db().assignments.delete_one({"_id": aid, "owner_sub": user.sub})
    if res.deleted_count != 1:
        raise HTTPException(404, "Assignment not found.")
    return {"ok": True}


# ---- assignments (candidate) ---------------------------------------------

@router.get("/api/my-assignments")
async def my_assignments(user: User = Depends(require_user)):
    if not user.email or not user.email_verified:
        return {"assignments": [], "email_unverified": True}
    cur = db.db().assignments.find({"candidate_email": user.email}).sort("created_at", -1).limit(200)
    items = []
    tids = set()
    async for a in cur:
        items.append({"id": a["_id"], "template_id": a["template_id"], "template_name": a.get("template_name"),
                      "status": a["status"], "released": a.get("released", False),
                      "interview_id": a.get("interview_id"), "created_at": a["created_at"]})
        tids.add(a["template_id"])
    meta = {}
    async for t in db.db().templates.find(
        {"_id": {"$in": list(tids)}},
        {"role": 1, "interview_type": 1, "duration_min": 1, "language": 1},
    ):
        meta[t.pop("_id")] = t
    for it in items:
        it.update(meta.get(it["template_id"], {}))
    return {"assignments": items}
