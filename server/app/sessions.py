"""In-memory live-session store.

A live session holds the guest's API keys for as long as the interview runs.
Nothing here is persisted: a restart drops every session and every key.
The browser gets a one-time ticket to open the voice websocket; the ticket is
stored only as a hash and expires quickly.
"""

import asyncio
import time
import uuid
from dataclasses import dataclass, field

from .config import settings
from .security import Secret, hash_token, new_token, tokens_match


@dataclass
class SessionKeys:
    gnani: Secret
    llm_provider: str
    llm: Secret
    llm_model: str

    def drop(self) -> None:
        self.gnani.drop()
        self.llm.drop()


@dataclass
class LiveSession:
    id: str
    keys: SessionKeys
    spec: dict
    voice: str
    voice_engine: str
    barge_in: bool
    questions: list[str]
    interview_id: str
    ip: str
    user_sub: str | None
    ticket_hash: str
    ticket_expires: float
    created: float = field(default_factory=time.time)
    connected: bool = False

    def __repr__(self) -> str:  # never print keys
        return f"LiveSession(id={self.id}, interview={self.interview_id}, connected={self.connected})"


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, LiveSession] = {}
        self._lock = asyncio.Lock()
        self._ip_history: dict[str, list[float]] = {}
        self._user_history: dict[str, list[float]] = {}

    # ---- abuse controls -------------------------------------------------
    def check_limits(self, ip: str, user_sub: str | None) -> str | None:
        """Return a human-readable reason if a new session is not allowed."""
        now = time.time()
        live = list(self._sessions.values())
        if len(live) >= settings.max_concurrent_sessions:
            return "The server is at capacity. Please try again in a few minutes."
        if sum(1 for s in live if s.ip == ip) >= settings.max_concurrent_per_ip:
            return "Too many interviews running from your network. Finish one first."
        hist = [t for t in self._ip_history.get(ip, []) if now - t < 3600]
        self._ip_history[ip] = hist
        if len(hist) >= settings.max_sessions_per_ip_hour:
            return "Hourly interview limit reached for your network. Try again later."
        if user_sub:
            uh = [t for t in self._user_history.get(user_sub, []) if now - t < 86400]
            self._user_history[user_sub] = uh
            if len(uh) >= settings.max_sessions_per_user_day:
                return "Daily interview limit reached for your account."
        return None

    # ---- lifecycle -----------------------------------------------------
    async def create(
        self, *, keys: SessionKeys, spec: dict, voice: str, voice_engine: str, barge_in: bool,
        questions: list[str], interview_id: str, ip: str, user_sub: str | None,
    ) -> tuple[LiveSession, str]:
        ticket = new_token()
        s = LiveSession(
            id=uuid.uuid4().hex, keys=keys, spec=spec, voice=voice, voice_engine=voice_engine, barge_in=barge_in,
            questions=questions, interview_id=interview_id, ip=ip, user_sub=user_sub,
            ticket_hash=hash_token(ticket), ticket_expires=time.time() + settings.ticket_ttl_s,
        )
        async with self._lock:
            self._sessions[s.id] = s
            self._ip_history.setdefault(ip, []).append(time.time())
            if user_sub:
                self._user_history.setdefault(user_sub, []).append(time.time())
        return s, ticket

    async def claim_ticket(self, session_id: str, ticket: str) -> LiveSession | None:
        """Single use: a ticket opens the websocket once, before it expires."""
        async with self._lock:
            s = self._sessions.get(session_id)
            if not s or s.connected or time.time() > s.ticket_expires:
                return None
            if not tokens_match(ticket, s.ticket_hash):
                return None
            s.connected = True
            s.ticket_hash = ""
            return s

    async def remove(self, session_id: str) -> None:
        async with self._lock:
            s = self._sessions.pop(session_id, None)
        if s:
            s.keys.drop()

    async def sweep(self) -> list[LiveSession]:
        """Drop sessions whose ticket expired before the browser connected."""
        now = time.time()
        async with self._lock:
            stale = [s for s in self._sessions.values() if not s.connected and now > s.ticket_expires]
            for s in stale:
                self._sessions.pop(s.id, None)
        for s in stale:
            s.keys.drop()
        return stale

    def count(self) -> int:
        return len(self._sessions)


store = SessionStore()
