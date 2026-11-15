"""Rapport API: FastAPI app, middleware and background housekeeping."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from .config import settings
from .security import setup_logging

setup_logging(settings.log_level)

from . import db  # noqa: E402
from .interview import records  # noqa: E402
from .routes import account, interviews, recruiter, resume, sessions  # noqa: E402
from .sessions import store  # noqa: E402

MAX_BODY = 64 * 1024


async def _sweeper():
    while True:
        await asyncio.sleep(30)
        try:
            for s in await store.sweep():
                await records.finalize(s.interview_id, transcript=[], feedback=None,
                                       status="abandoned", duration_s=0, language_switches=[])
        except Exception as e:
            logger.warning(f"sweeper: {type(e).__name__}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init()
    task = asyncio.create_task(_sweeper())
    logger.info(f"Rapport API ready; allowed origins: {settings.client_origins}")
    yield
    task.cancel()
    await db.close()


app = FastAPI(title="Rapport API", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.client_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["authorization", "content-type", "x-guest-token"],
)


@app.middleware("http")
async def guard(request: Request, call_next):
    cl = request.headers.get("content-length")
    if cl and cl.isdigit() and int(cl) > MAX_BODY:
        return JSONResponse({"detail": "Request too large."}, status_code=413)
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Cache-Control"] = "no-store"
    return resp


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    # FastAPI's default echoes the submitted values back, which would include API keys.
    errors = [{"field": ".".join(str(p) for p in e.get("loc", [])[1:]), "message": e.get("msg", "")}
              for e in exc.errors()]
    return JSONResponse({"detail": "Some fields are invalid.", "errors": errors[:20]}, status_code=422)


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    logger.error(f"unhandled {type(exc).__name__} on {request.method} {request.url.path}")
    return JSONResponse({"detail": "Something went wrong."}, status_code=500)


@app.get("/health")
async def health():
    return {"ok": True, "db": await db.ping(), "live_sessions": store.count()}


app.include_router(sessions.router)
app.include_router(interviews.router)
app.include_router(recruiter.router)
app.include_router(account.router)
app.include_router(resume.router)
