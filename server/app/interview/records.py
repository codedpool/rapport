"""Interview documents in MongoDB."""

import datetime as dt

from .. import db
from ..config import settings
from ..security import hash_token


async def create(
    *, kind: str, spec: dict, questions: list[str], voice: str, owner_sub: str | None,
    guest_token: str | None, assignment: dict | None,
) -> str:
    iid = db.new_id()
    doc = {
        "_id": iid,
        "kind": kind,
        "owner_sub": owner_sub,
        "spec": spec,
        "questions": questions,
        "voice": voice,
        "status": "created",
        "transcript": [],
        "feedback": None,
        "created_at": db.now(),
        # Mock results are visible to their owner; scheduled ones wait for release.
        "released": kind == "mock",
    }
    if guest_token:
        doc["guest_token_hash"] = hash_token(guest_token)
        doc["expires_at"] = db.now() + dt.timedelta(hours=settings.guest_ttl_hours)
    if assignment:
        doc["assignment_id"] = assignment["_id"]
        doc["recruiter_sub"] = assignment["owner_sub"]
        doc["template_name"] = assignment.get("template_name")
    await db.db().interviews.insert_one(doc)
    if assignment:
        await db.db().assignments.update_one(
            {"_id": assignment["_id"]},
            {"$set": {"status": "in_progress", "interview_id": iid, "started_at": db.now()}},
        )
    return iid


async def mark_started(iid: str) -> None:
    await db.db().interviews.update_one(
        {"_id": iid}, {"$set": {"status": "in_progress", "started_at": db.now()}}
    )


async def finalize(iid: str, *, transcript: list[dict], feedback: dict | None, status: str,
                   duration_s: int, language_switches: list[dict]) -> None:
    doc = await db.db().interviews.find_one_and_update(
        {"_id": iid},
        {"$set": {
            "transcript": transcript, "feedback": feedback, "status": status,
            "ended_at": db.now(), "duration_s": duration_s, "language_switches": language_switches,
        }},
        projection={"assignment_id": 1},
    )
    aid = (doc or {}).get("assignment_id")
    if not aid:
        return
    if status == "abandoned":
        # Nothing was said: let the candidate try again.
        await db.db().assignments.update_one(
            {"_id": aid}, {"$set": {"status": "pending"}, "$unset": {"interview_id": ""}}
        )
    else:
        await db.db().assignments.update_one(
            {"_id": aid}, {"$set": {"status": "completed", "completed_at": db.now()}}
        )
