"""MongoDB access. API keys are never written here.

Collections
  users        _id = Auth0 sub; email, name, picture, timestamps
  templates    recruiter interview templates (owner_sub)
  assignments  template sent to a candidate email (owner_sub = recruiter)
  interviews   one per interview: spec, transcript, feedback, status.
               Guest interviews carry expires_at (TTL) until claimed.
"""

import datetime as dt
import uuid

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient

from .config import settings

_client: AsyncMongoClient | None = None


def now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def new_id() -> str:
    return uuid.uuid4().hex


def db():
    if _client is None:
        raise RuntimeError("database not initialised")
    return _client[settings.mongodb_db]


async def init() -> None:
    global _client
    if not settings.mongodb_uri:
        raise RuntimeError("MONGODB_URI is not set")
    _client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=8000, tz_aware=True)
    d = db()
    await d.interviews.create_index([("owner_sub", ASCENDING), ("created_at", DESCENDING)])
    await d.interviews.create_index([("recruiter_sub", ASCENDING), ("created_at", DESCENDING)])
    await d.interviews.create_index("expires_at", expireAfterSeconds=0)
    await d.templates.create_index([("owner_sub", ASCENDING), ("created_at", DESCENDING)])
    await d.assignments.create_index([("owner_sub", ASCENDING), ("created_at", DESCENDING)])
    await d.assignments.create_index([("candidate_email", ASCENDING), ("created_at", DESCENDING)])
    await d.assignments.create_index("template_id")


async def close() -> None:
    if _client is not None:
        await _client.close()


async def ping() -> bool:
    try:
        await db().command("ping")
        return True
    except Exception:
        return False


async def upsert_user(user) -> None:
    await db().users.update_one(
        {"_id": user.sub},
        {
            "$set": {"email": user.email, "email_verified": user.email_verified,
                     "name": user.name, "picture": user.picture, "updated_at": now()},
            "$setOnInsert": {"created_at": now()},
        },
        upsert=True,
    )
