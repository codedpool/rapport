"""Saved interviews: list, read, claim, delete. Access is owner-scoped."""

from fastapi import APIRouter, Depends, Header, HTTPException

from .. import db
from ..auth import User, optional_user, require_user
from ..schemas import ClaimIn
from ..security import tokens_match

router = APIRouter()

_LIST_FIELDS = {"kind": 1, "spec.role": 1, "spec.interview_type": 1, "spec.language": 1,
                "spec.duration_min": 1, "status": 1, "created_at": 1, "duration_s": 1,
                "released": 1, "template_name": 1, "feedback.overall": 1, "feedback.scores": 1}


def _access(doc: dict, user: User | None, guest_token: str | None) -> str | None:
    if user and doc.get("owner_sub") == user.sub:
        return "candidate"
    if user and doc.get("recruiter_sub") == user.sub:
        return "recruiter"
    if (doc.get("owner_sub") is None and doc.get("guest_token_hash") and guest_token
            and tokens_match(guest_token, doc["guest_token_hash"])):
        return "guest"
    return None


def _public(doc: dict, role: str) -> dict:
    out = {k: v for k, v in doc.items() if k not in ("guest_token_hash", "expires_at", "owner_sub",
                                                    "recruiter_sub", "questions")}
    out["id"] = out.pop("_id")
    out["viewer"] = role
    held = doc.get("kind") == "scheduled" and not doc.get("released") and role != "recruiter"
    if held:
        out["feedback"] = None
        out["feedback_held"] = True
    out["claimable"] = role == "guest"
    return out


@router.get("/api/interviews")
async def list_mine(user: User = Depends(require_user)):
    cur = db.db().interviews.find(
        {"owner_sub": user.sub, "status": {"$in": ["completed", "failed", "in_progress"]}},
        _LIST_FIELDS,
    ).sort("created_at", -1).limit(100)
    out = []
    async for d in cur:
        d["id"] = d.pop("_id")
        if d.get("kind") == "scheduled" and not d.get("released"):
            d.pop("feedback", None)
            d["feedback_held"] = True
        out.append(d)
    return {"interviews": out}


@router.get("/api/interviews/{iid}")
async def get_one(iid: str, user: User | None = Depends(optional_user),
                  x_guest_token: str | None = Header(default=None)):
    doc = await db.db().interviews.find_one({"_id": iid})
    role = _access(doc, user, x_guest_token) if doc else None
    if not role:
        raise HTTPException(404, "Interview not found.")
    return _public(doc, role)


@router.post("/api/interviews/{iid}/claim")
async def claim(iid: str, body: ClaimIn, user: User = Depends(require_user)):
    doc = await db.db().interviews.find_one({"_id": iid})
    if not doc or _access(doc, None, body.guest_token) != "guest":
        raise HTTPException(404, "Interview not found.")
    await db.upsert_user(user)
    res = await db.db().interviews.update_one(
        {"_id": iid, "owner_sub": None},
        {"$set": {"owner_sub": user.sub, "claimed_at": db.now()},
         "$unset": {"expires_at": "", "guest_token_hash": ""}},
    )
    if res.modified_count != 1:
        raise HTTPException(409, "This interview was already saved.")
    return {"ok": True}


@router.delete("/api/interviews/{iid}")
async def delete_one(iid: str, user: User = Depends(require_user)):
    res = await db.db().interviews.delete_one({"_id": iid, "owner_sub": user.sub, "kind": "mock"})
    if res.deleted_count != 1:
        raise HTTPException(404, "Interview not found.")
    return {"ok": True}
