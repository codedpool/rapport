"""Gnani STT/TTS wiring on top of the pipecat-gnani plugin."""

import asyncio
import time
from collections.abc import AsyncIterator

import pipecat_gnani.stt as _gnani_stt
import websockets
from pipecat.services.tts_service import TextAggregationMode
from pipecat.transcriptions.language import Language
from pipecat.utils.text.base_text_aggregator import Aggregation
from pipecat.utils.text.simple_text_aggregator import SimpleTextAggregator
from pipecat_gnani import GnaniSTTService, GnaniTTSService

STT_URL = "wss://api.vachana.ai/stt/v3/stream"

# The plugin does not expose the idle-timeout or VAD headers, so extend the
# header builder it uses for the websocket handshake. A candidate who pauses to
# think must not get cut off by the 60 s default.
_EXTRA_STT_HEADERS = {
    "x-idle-timeout-sec": "600",
    "x-min-silence-ms": "700",
    "x-vad-threshold": "0.55",
}
_orig_build = _gnani_stt._build_ws_option_headers


def _build_with_extras(settings):
    headers = _orig_build(settings)
    headers.update(_EXTRA_STT_HEADERS)
    return headers


_gnani_stt._build_ws_option_headers = _build_with_extras


class GnaniKeyError(Exception):
    pass


async def validate_key(key: str) -> None:
    """Open the STT websocket and close it before sending audio: free and fast."""
    try:
        async with websockets.connect(
            STT_URL,
            additional_headers={"x-api-key-id": key, "language_code": "en-IN", "x-sample-rate": "16000"},
            open_timeout=10,
        ) as ws:
            await asyncio.wait_for(ws.recv(), timeout=8)
    except websockets.InvalidStatus as e:
        code = e.response.status_code
        if code in (401, 403):
            raise GnaniKeyError("The Gnani key was rejected. Check it in the Gnani dashboard.")
        if code == 429:
            raise GnaniKeyError("Gnani is rate-limiting this key (too many live streams). Try again shortly.")
        raise GnaniKeyError(f"Gnani refused the connection ({code}).")
    except (OSError, asyncio.TimeoutError, websockets.WebSocketException):
        raise GnaniKeyError("Could not reach Gnani. Check your connection and try again.")


# Interview language -> STT and TTS settings.
LANG = {
    "en": {"stt": Language.EN_IN, "candidates": None, "format": "transcribe", "tts": "en-IN"},
    "hi": {"stt": Language.HI_IN, "candidates": None, "format": "codemix", "tts": "hi-IN"},
    "hinglish": {"stt": "indic-auto", "candidates": ["hi-IN", "en-IN"], "format": "codemix", "tts": "auto"},
}


def make_stt(key: str, language: str, keyterms: list[str]) -> GnaniSTTService:
    cfg = LANG[language]
    kwargs = dict(model="prisma-v3.0", language=cfg["stt"], format=cfg["format"])
    if cfg["candidates"]:
        kwargs["language_candidates"] = cfg["candidates"]
    if keyterms:
        kwargs["keywords"] = keyterms[:200]
    return GnaniSTTService(api_key=key, sample_rate=16000, settings=GnaniSTTService.Settings(**kwargs))


class WholeTurnAggregator(SimpleTextAggregator):
    """Holds the interviewer's whole reply and releases it once, at the end of the LLM turn.

    Gnani's realtime TTS serves one synthesis request at a time per connection,
    and the plugin closes the turn's audio context on the first "complete". Sending
    sentence by sentence drops audio, so each turn is one request. Turns are one
    to three short sentences, so the added wait is small.
    """

    async def aggregate(self, text: str) -> AsyncIterator[Aggregation]:
        self._text += text
        return
        yield  # pragma: no cover  (makes this an async generator)


class RapportGnaniTTS(GnaniTTSService):
    """Reopens the TTS socket before a turn if it sat idle.

    Gnani closes idle realtime TTS sockets while the candidate is talking; a
    request sent into a socket that is closing produces no audio.
    """

    IDLE_RECONNECT_S = 4.0

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._last_activity = time.monotonic()
        self._fresh_next = False

    def reconnect_next(self) -> None:
        """Open a new socket for the next request (used before retrying a silent turn)."""
        self._fresh_next = True

    async def run_tts(self, text: str, context_id: str):
        stale = time.monotonic() - self._last_activity > self.IDLE_RECONNECT_S
        if self._ws is not None and (self._fresh_next or stale):
            await self._disconnect_websocket()
        self._fresh_next = False
        self._last_activity = time.monotonic()
        async for frame in super().run_tts(text, context_id):
            yield frame

    async def _handle_audio_chunk(self, audio_bytes: bytes):
        self._last_activity = time.monotonic()
        await super()._handle_audio_chunk(audio_bytes)


# The SDK validator rejects "hi-en" even for Poorvi, so Hinglish uses script auto-detection.
FAST_TTS_LANG = {"en": "en-IN", "hi": "hi-IN", "hinglish": "auto"}


def tts_voice(engine: str, voice: str, language: str) -> tuple[str, str, str]:
    """Return (model, voice, tts language) for the chosen engine."""
    from .schemas import FAST_VOICES, VOICES
    if engine == "fast":
        gender = VOICES.get(voice, {}).get("gender", "female")
        return "timbre-v2.5", FAST_VOICES[language][gender], FAST_TTS_LANG[language]
    return "timbre-v3.0", voice, LANG[language]["tts"]


def make_tts(key: str, voice: str, language: str, text_filters=None, engine: str = "expressive") -> GnaniTTSService:
    model, voice_name, tts_lang = tts_voice(engine, voice, language)
    tts = RapportGnaniTTS(
        api_key=key,
        sample_rate=24000,
        settings=GnaniTTSService.Settings(model=model, voice=voice_name, language=tts_lang, speed=1.0),
        text_filters=text_filters,
    )
    tts._text_aggregator = WholeTurnAggregator(aggregation_type=TextAggregationMode.SENTENCE)
    return tts
