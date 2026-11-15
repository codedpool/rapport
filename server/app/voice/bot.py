"""One live interview: Pipecat pipeline over the browser websocket.

browser mic -> Gnani STT -> user turn -> LLM (streaming) -> Gnani TTS -> browser
The LLM ends the interview by calling end_interview after its closing line.
When the pipeline stops, feedback is generated and saved, then keys are dropped
by the caller.
"""

import asyncio
import re
import time

from fastapi import WebSocket
from loguru import logger
from pipecat.adapters.llm.schemas.function_schema import FunctionSchema
from pipecat.adapters.llm.schemas.tools_schema import ToolsSchema
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    EndFrame,
    ErrorFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMTextFrame,
    FunctionCallResultProperties,
    LLMMessagesAppendFrame,
    LLMRunFrame,
    STTUpdateSettingsFrame,
    TTSSpeakFrame,
    TTSTextFrame,
    TTSUpdateSettingsFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.websocket.fastapi import FastAPIWebsocketParams, FastAPIWebsocketTransport
from pipecat.turns.user_mute import AlwaysUserMuteStrategy, FunctionCallUserMuteStrategy
from pipecat_gnani import GnaniSTTService, GnaniTTSService
from starlette.websockets import WebSocketState

from ..config import settings
from ..gnani import LANG, make_stt, make_tts, tts_voice
from ..interview import feedback as fb
from ..interview import records
from ..interview.prompts import KICKOFF, LANGUAGE_NAME, TIME_UP, TIME_WARNING, system_prompt
from ..llm import LLMError, base_url, model_chain
from ..sessions import LiveSession
from .filters import InterviewerTextFilter, clean_for_speech
from .llm_service import FallbackLLMService
from .serializer import IN_RATE, OUT_RATE, RapportSerializer

STOP_WORDS = ("stop", "end the interview", "end this", "finish", "that's all", "bas", "band karo", "khatam",
              "बस", "बंद", "खत्म", "रोक")

GOODBYE = {
    "en": "Thank you, that's all from my side. Your feedback will appear on screen in a moment.",
    "hi": "धन्यवाद, मेरी तरफ़ से बस इतना ही। आपका feedback कुछ ही देर में स्क्रीन पर आ जाएगा।",
    "hinglish": "Thank you, मेरी तरफ़ से बस इतना ही। आपका feedback अभी screen पर आ जाएगा।",
}

FORCED_CLOSE = {
    "en": "We're out of time, so let's stop here. Thank you, your feedback will appear on screen.",
    "hi": "हमारा समय पूरा हो गया है। धन्यवाद, आपका feedback स्क्रीन पर आ जाएगा।",
    "hinglish": "अच्छा, हमारा time खत्म हो गया है। Thank you, आपका feedback screen पर आ जाएगा।",
}


class Events:
    """JSON events to the browser, sent alongside the transport's audio."""

    def __init__(self, ws: WebSocket):
        self.ws = ws

    async def send(self, event: dict) -> None:
        if self.ws.client_state != WebSocketState.CONNECTED:
            return
        try:
            await self.ws.send_json(event)
        except Exception:
            pass


class Reporter(FrameProcessor):
    """Mirrors speaking state and spoken text to the browser."""

    def __init__(self, events: Events):
        super().__init__()
        self.events = events

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, BotStartedSpeakingFrame) and direction == FrameDirection.UPSTREAM:
            await self.events.send({"type": "bot_speaking", "value": True})
        elif isinstance(frame, BotStoppedSpeakingFrame) and direction == FrameDirection.UPSTREAM:
            await self.events.send({"type": "bot_speaking", "value": False})
        elif isinstance(frame, UserStartedSpeakingFrame):
            await self.events.send({"type": "user_speaking", "value": True})
        elif isinstance(frame, UserStoppedSpeakingFrame):
            await self.events.send({"type": "user_speaking", "value": False})
        elif isinstance(frame, TTSTextFrame) and frame.text:
            await self.events.send({"type": "bot_text", "text": fb.strip_tags(frame.text)})
        await self.push_frame(frame, direction)


class TTSRetryGuard(FrameProcessor):
    """Sits between the LLM and TTS. If a turn comes back with no audio, speak it again on a
    fresh socket (up to twice) so the candidate is never left waiting in silence."""

    MAX_RETRIES = 2

    def __init__(self, tts=None):
        super().__init__()
        self._tts = tts
        self._buf = ""
        self._last = ""
        self._retries = self.MAX_RETRIES

    def spoke_this_turn(self) -> bool:
        return bool(re.sub(r"<[^>]*>", "", clean_for_speech(self._buf)).strip())

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if direction == FrameDirection.DOWNSTREAM:
            if isinstance(frame, LLMFullResponseStartFrame):
                self._buf = ""
            elif isinstance(frame, LLMTextFrame):
                self._buf += frame.text
            elif isinstance(frame, LLMFullResponseEndFrame) and self._buf.strip():
                self._last, self._retries = self._buf, 0
        elif isinstance(frame, ErrorFrame) and "no audio" in str(frame.error) and self._retries < self.MAX_RETRIES:
            self._retries += 1
            logger.warning(f"TTS turn produced no audio; retry {self._retries} on a fresh socket")
            if self._tts is not None and hasattr(self._tts, "reconnect_next"):
                self._tts.reconnect_next()
            await self.push_frame(TTSSpeakFrame(clean_for_speech(self._last)), FrameDirection.DOWNSTREAM)
        await self.push_frame(frame, direction)


async def run_interview(ws: WebSocket, session: LiveSession) -> None:
    spec = session.spec
    events = Events(ws)
    transcript: list[dict] = []
    language_switches: list[dict] = []
    started = time.time()
    state = {"ending": False, "language": spec["language"]}
    task_ref: dict = {}

    def elapsed() -> int:
        return int(time.time() - started)

    async def on_control(msg: dict) -> None:
        task: PipelineTask = task_ref["task"]
        if msg["type"] == "end":
            state["ending"] = True
            await events.send({"type": "status", "status": "ending"})
            await task.cancel()
        elif msg["type"] == "set_language":
            lang = msg.get("language")
            if lang not in LANG or lang == state["language"]:
                return
            state["language"] = lang
            language_switches.append({"t": elapsed(), "language": lang})
            cfg = LANG[lang]
            stt_delta = {"language": cfg["stt"], "format": cfg["format"],
                         "language_candidates": cfg["candidates"]}
            await task.queue_frames([
                STTUpdateSettingsFrame(delta=GnaniSTTService.Settings(**stt_delta)),
                TTSUpdateSettingsFrame(delta=GnaniTTSService.Settings(
                    **dict(zip(("model", "voice", "language"),
                               tts_voice(session.voice_engine, session.voice, lang))))),
                LLMMessagesAppendFrame(messages=[{"role": "user", "content": (
                    f"(The candidate switched the interview language to {LANGUAGE_NAME[lang]}. "
                    f"From now on speak {LANGUAGE_NAME[lang]}. Do not comment on the switch.)")}],
                    run_llm=False),
            ])
            await events.send({"type": "language", "language": lang})

    serializer = RapportSerializer(on_control)
    transport = FastAPIWebsocketTransport(
        websocket=ws,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True, audio_out_enabled=True,
            audio_in_sample_rate=IN_RATE, audio_out_sample_rate=OUT_RATE,
            add_wav_header=False, serializer=serializer,
            allowed_origins=[],  # origin is checked before the socket is accepted
        ),
    )

    keys = session.keys
    stt = make_stt(keys.gnani.get(), spec["language"], spec.get("keyterms") or [])
    tts = make_tts(keys.gnani.get(), session.voice, spec["language"],
                   text_filters=[InterviewerTextFilter()], engine=session.voice_engine)
    interviewer = session.voice
    # Groq: small prompts keep each turn well inside the per-model minute budget.
    prompt_budget = 3500 if keys.llm_provider == "groq" else 12000
    def end_tool_allowed(messages: list[dict]) -> bool:
        """Offer end_interview only once ending is plausible: time is up, the candidate
        asked to stop, or the planned questions have had answers. Stays on once on."""
        if state.get("tools_on"):
            return True
        said = [str(m.get("content") or "") for m in messages
                if m.get("role") == "user" and not str(m.get("content") or "").startswith("(")]
        asked_to_stop = bool(said) and any(w in said[-1].lower() for w in STOP_WORDS)
        if state.get("time_up") or asked_to_stop or len(said) >= max(3, len(session.questions)):
            state["tools_on"] = True
        return bool(state.get("tools_on"))

    llm = FallbackLLMService(
        tools_gate=end_tool_allowed,
        provider=keys.llm_provider,
        chain=model_chain(keys.llm_provider, keys.llm_model),
        prompt_budget=prompt_budget,
        reply_tokens=400,
        api_key=keys.llm.get(), base_url=base_url(keys.llm_provider),
        settings=OpenAILLMService.Settings(
            model=keys.llm_model, temperature=0.7,
            system_instruction=system_prompt(spec, session.questions, interviewer),
        ),
    )

    end_tool = FunctionSchema(
        name="end_interview",
        description="End the interview. Call this only after you have said your closing line.",
        properties={}, required=[],
    )
    context = LLMContext(
        messages=[{"role": "user", "content": KICKOFF}],
        tools=ToolsSchema(standard_tools=[end_tool]),
    )
    mute = [FunctionCallUserMuteStrategy()]
    if not session.barge_in:
        mute.append(AlwaysUserMuteStrategy())  # speakers: don't let the bot hear itself
    aggregators = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            # Default VAD timing lets the smart-turn model decide when an answer is
            # finished; the stop timeout caps how long a mid-thought pause can hold.
            vad_analyzer=SileroVADAnalyzer(),
            user_mute_strategies=mute,
            user_turn_stop_timeout=3.0,
        ),
    )

    guard = TTSRetryGuard(tts)
    pipeline = Pipeline([
        transport.input(), stt, aggregators.user(), llm, guard, tts,
        Reporter(events), transport.output(), aggregators.assistant(),
    ])
    task = PipelineTask(
        pipeline,
        params=PipelineParams(audio_in_sample_rate=IN_RATE, audio_out_sample_rate=OUT_RATE,
                              enable_metrics=False),
    )
    task_ref["task"] = task

    async def end_interview(params):
        # Models sometimes call this too early (even in the greeting). Only end when time is
        # up, the candidate asked to stop, or the planned questions have had their answers.
        answers = [t["text"].lower() for t in transcript if t["role"] == "candidate"]
        asked_to_stop = bool(answers) and any(w in answers[-1] for w in STOP_WORDS)
        enough = len(answers) >= max(3, len(session.questions))
        if not (state.get("time_up") or asked_to_stop or enough):
            # Ask the model to carry on, so the candidate is never left in silence.
            await params.result_callback(
                {"status": "not_ended", "reason": "The interview is still in progress. Continue with the next question."},
                properties=FunctionCallResultProperties(run_llm=True))
            return
        state["ending"] = True
        await params.result_callback({"status": "ended"},
                                     properties=FunctionCallResultProperties(run_llm=False))
        await events.send({"type": "status", "status": "ending"})
        frames = [] if guard.spoke_this_turn() else [TTSSpeakFrame(GOODBYE[state["language"]])]
        await task.queue_frames(frames + [EndFrame()])

    llm.register_function("end_interview", end_interview)

    @aggregators.user().event_handler("on_user_turn_stopped")
    async def _user_turn(aggregator, strategy, message):
        text = (message.content or "").strip() if message else ""
        if text:
            transcript.append({"role": "candidate", "text": text, "t": elapsed()})
            await events.send({"type": "user_turn", "text": text})

    @aggregators.assistant().event_handler("on_assistant_turn_stopped")
    async def _bot_turn(aggregator, message):
        text = fb.strip_tags(message.content or "")
        if text:
            transcript.append({"role": "interviewer", "text": text, "t": elapsed(),
                               "interrupted": bool(message.interrupted)})
            await events.send({"type": "bot_turn", "text": text, "interrupted": bool(message.interrupted)})

    @transport.event_handler("on_client_connected")
    async def _connected(transport, client):
        await records.mark_started(session.interview_id)
        await events.send({"type": "ready", "duration_min": spec["duration_min"],
                           "hard_cap_s": settings.hard_cap_minutes * 60,
                           "interviewer": interviewer, "language": spec["language"]})
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def _disconnected(transport, client):
        await task.cancel()

    async def watchdog():
        dur = spec["duration_min"] * 60
        cap = min(dur + 180, settings.hard_cap_minutes * 60)
        note = lambda c: LLMMessagesAppendFrame(messages=[{"role": "user", "content": c}], run_llm=False)
        await asyncio.sleep(max(dur - 60, 30))
        if not state["ending"]:
            await task.queue_frame(note(TIME_WARNING))
        await asyncio.sleep(min(60, max(dur - 30, 0)))
        if not state["ending"]:
            state["time_up"] = True
            await task.queue_frame(note(TIME_UP))
        await asyncio.sleep(max(cap - elapsed(), 0))
        if not state["ending"]:
            state["ending"] = True
            await events.send({"type": "status", "status": "ending"})
            await task.queue_frames([TTSSpeakFrame(FORCED_CLOSE[state["language"]]), EndFrame()])
        await asyncio.sleep(25)
        await task.cancel()  # last resort if the goodbye never finishes

    dog = asyncio.create_task(watchdog())
    status = "completed"
    try:
        await PipelineRunner(handle_sigint=False).run(task)
    except Exception as e:
        logger.error(f"pipeline error in session {session.id}: {type(e).__name__}")
        status = "failed"
    finally:
        dog.cancel()

    # ---- after the call: feedback and persistence --------------------------
    feedback = None
    if not any(t["role"] == "candidate" for t in transcript):
        status = "abandoned"
    else:
        await events.send({"type": "status", "status": "processing"})
        try:
            feedback = await asyncio.wait_for(
                fb.generate(spec, transcript, provider=keys.llm_provider,
                            key=keys.llm.get(), model=keys.llm_model),
                timeout=120,
            )
        except LLMError as e:
            feedback = {"error": str(e)}
        except asyncio.TimeoutError:
            feedback = {"error": "Feedback generation timed out."}
        except Exception as e:
            logger.error(f"feedback error: {type(e).__name__}")
            feedback = {"error": "Feedback generation failed."}
    await records.finalize(session.interview_id, transcript=transcript, feedback=feedback,
                           status=status, duration_s=elapsed(), language_switches=language_switches)
    await events.send({"type": "done", "interview_id": session.interview_id, "status": status})
