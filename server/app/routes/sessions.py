"""Starting a live interview and the voice websocket."""

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from loguru import logger

from .. import db, gnani, llm
from ..auth import User, optional_user
from ..config import settings
from ..interview import records
from ..interview.prompts import questions_messages
from ..net import client_ip
from ..schemas import SessionCreate
from ..security import Secret, new_token
from ..sessions import SessionKeys, store
from ..voice.bot import run_interview

router = APIRouter()


async def _assignment_spec(assignment_id: str, user: User | None) -> tuple[dict, dict]:
    if not user:
        raise HTTPException(401, "Sign in to take a scheduled interview.")
    if not user.email or not user.email_verified:
        raise HTTPException(403, "Your email must be verified to take a scheduled interview.")
    a = await db.db().assignments.find_one({"_id": assignment_id, "candidate_email": user.email})
    if not a:
        raise HTTPException(404, "Interview not found.")
    if a["status"] == "completed":
        raise HTTPException(409, "You have already completed this interview.")
    if a["status"] == "in_progress" and a.get("started_at"):
        age = (db.now() - a["started_at"]).total_seconds()
        if age < (settings.hard_cap_minutes + 5) * 60:
            raise HTTPException(409, "This interview is already in progress.")
    t = await db.db().templates.find_one({"_id": a["template_id"]})
    if not t:
        raise HTTPException(410, "The recruiter removed this interview.")
    spec = {k: t[k] for k in ("role", "job_description", "resume_highlights", "interview_type",
                              "duration_min", "language", "pressure_mode", "deep_followups", "keyterms")}
    return spec, a


@router.post("/api/sessions")
async def create_session(body: SessionCreate, request: Request, user: User | None = Depends(optional_user)):
    ip = client_ip(request)
    reason = store.check_limits(ip, user.sub if user else None)
    if reason:
        raise HTTPException(429, reason)

    assignment = None
    if body.mode == "scheduled":
        if not body.assignment_id:
            raise HTTPException(422, "assignment_id is required.")
        spec, assignment = await _assignment_spec(body.assignment_id, user)
        if user:
            await db.upsert_user(user)
    else:
        if not body.spec:
            raise HTTPException(422, "Interview details are required.")
        spec = body.spec.model_dump()

    k = body.keys
    results = await asyncio.gather(
        gnani.validate_key(k.gnani_api_key), llm.validate_key(k.llm_provider, k.llm_api_key),
        return_exceptions=True,
    )
    for r in results:
        if isinstance(r, (gnani.GnaniKeyError, llm.LLMError)):
            raise HTTPException(400, str(r))
        if isinstance(r, Exception):
            logger.warning(f"key validation error: {type(r).__name__}")
            raise HTTPException(502, "Could not validate your keys. Please try again.")

    model = llm.resolve_model(k.llm_provider, k.llm_model)
    try:
        plan = await llm.chat_json(k.llm_provider, k.llm_api_key, model, questions_messages(spec),
                                   temperature=0.8, max_tokens=800, timeout=40)
    except llm.LLMError as e:
        raise HTTPException(400 if e.auth else 502, str(e))
    questions = [str(q).strip()[:300] for q in (plan.get("questions") or []) if str(q).strip()][:6]
    if not questions:
        raise HTTPException(502, "The LLM did not return interview questions. Try again or pick another model.")

    guest_token = new_token() if (not user and body.mode == "mock") else None
    interview_id = await records.create(
        kind=body.mode, spec=spec, questions=questions, voice=body.voice,
        owner_sub=user.sub if user else None, guest_token=guest_token, assignment=assignment,
    )
    keys = SessionKeys(gnani=Secret(k.gnani_api_key), llm_provider=k.llm_provider,
                       llm=Secret(k.llm_api_key), llm_model=model)
    session, ticket = await store.create(
        keys=keys, spec=spec, voice=body.voice, voice_engine=body.voice_engine, barge_in=body.barge_in, questions=questions,
        interview_id=interview_id, ip=ip, user_sub=user.sub if user else None,
    )
    return {
        "session_id": session.id,
        "ticket": ticket,
        "ticket_ttl_s": settings.ticket_ttl_s,
        "interview_id": interview_id,
        "guest_token": guest_token,
        "spec": {"role": spec["role"], "duration_min": spec["duration_min"], "language": spec["language"],
                 "interview_type": spec["interview_type"]},
    }


@router.websocket("/ws/{session_id}")
async def voice_socket(ws: WebSocket, session_id: str):
    origin = (ws.headers.get("origin") or "").rstrip("/")
    if origin not in settings.client_origins:
        await ws.close(code=1008)
        return
    await ws.accept()
    # Browsers cannot set headers on websockets, so the one-time ticket comes as
    # the first message rather than in the URL (where logs could capture it).
    try:
        raw = await asyncio.wait_for(ws.receive_text(), timeout=10)
        msg = json.loads(raw) if len(raw) < 1000 else {}
    except (asyncio.TimeoutError, ValueError, WebSocketDisconnect, KeyError):
        msg = {}
    session = None
    if isinstance(msg, dict) and msg.get("type") == "auth" and isinstance(msg.get("ticket"), str):
        session = await store.claim_ticket(session_id, msg["ticket"])
    if not session:
        try:
            await ws.send_json({"type": "error", "message": "This interview link has expired. Start again."})
            await ws.close(code=4401)
        except Exception:
            pass
        return
    try:
        await run_interview(ws, session)
    except Exception as e:
        logger.error(f"session {session.id} crashed: {type(e).__name__}")
        try:
            await records.finalize(session.interview_id, transcript=[], feedback=None, status="failed",
                                   duration_s=0, language_switches=[])
            await ws.send_json({"type": "error", "message": "The interview hit a server error. Please start again."})
        except Exception:
            pass
    finally:
        await store.remove(session.id)
        try:
            await ws.close()
        except Exception:
            pass
