"""Live interview LLM with a model fallback chain and per-request token control.

Each interviewer turn:
  1. trims the conversation to a prompt budget (system prompt always kept, oldest
     exchanges dropped first, never starting on an orphaned tool message),
  2. caps the reply length (the interviewer speaks one to three sentences),
  3. tries the chain in order, skipping models that are cooling down after a rate
     limit, and moves on at the first rate limit, overload, outage or timeout,
  4. if every model is rate-limited, waits the shortest retry-after (a few seconds)
     and tries again rather than failing the interview.
"""

import asyncio
import time

from loguru import logger
from openai import APIConnectionError, APIStatusError, APITimeoutError, RateLimitError
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.utils.types import assert_given

from ..llm import estimate_tokens, model_extras

FIRST_TOKEN_TIMEOUT_S = 12.0
MAX_TOTAL_WAIT_S = 10.0


def trim_messages(messages: list[dict], prompt_budget: int) -> list[dict]:
    head_len = 0
    while head_len < len(messages) and messages[head_len].get("role") in ("system", "developer"):
        head_len += 1
    head, rest = messages[:head_len], messages[head_len:]
    while len(rest) > 2 and estimate_tokens(head + rest) > prompt_budget:
        rest = rest[1:]
        # A trimmed history must start on a user turn, never on a reply or tool result.
        while len(rest) > 1 and rest[0].get("role") != "user":
            rest = rest[1:]
    return head + rest


class FallbackLLMService(OpenAILLMService):
    def __init__(self, *, provider: str, chain: list[str], prompt_budget: int, reply_tokens: int,
                 tools_gate=None, **kwargs):
        super().__init__(**kwargs)
        self._tools_gate = tools_gate  # decides, per request, whether tools are offered
        self._provider = provider
        self._chain = chain
        self._prompt_budget = prompt_budget
        self._reply_tokens = reply_tokens
        self._cooldown: dict[str, float] = {}

    def _retry_after(self, err: Exception) -> float:
        try:
            value = float(err.response.headers.get("retry-after", "2"))  # type: ignore[attr-defined]
        except Exception:
            value = 2.0
        return max(0.5, min(value, 30.0))

    async def get_chat_completions(self, context: LLMContext):
        adapter = self.get_llm_adapter()
        params_from_context = await adapter.get_llm_invocation_params(
            context,
            system_instruction=assert_given(self._settings.system_instruction),
            convert_developer_to_user=not self.supports_developer_role,
        )
        params = self.build_chat_completion_params(params_from_context)
        params["messages"] = trim_messages(list(params["messages"]), self._prompt_budget)
        params["max_tokens"] = self._reply_tokens
        params.pop("max_completion_tokens", None)
        if self._tools_gate and not self._tools_gate(params["messages"]):
            params.pop("tools", None)
            params.pop("tool_choice", None)

        waited = 0.0
        last_err: Exception | None = None
        for _ in range(4):
            now = time.monotonic()
            ready = [m for m in self._chain if self._cooldown.get(m, 0) <= now]
            shortest = None
            for model in ready:
                req = dict(params)
                req["model"] = model
                extra = dict(req.get("extra_body") or {})
                extra.update(model_extras(self._provider, model))
                if extra:
                    req["extra_body"] = extra
                try:
                    stream = await asyncio.wait_for(self._client.chat.completions.create(**req), FIRST_TOKEN_TIMEOUT_S)
                    if model != self._chain[0]:
                        logger.info(f"interviewer turn served by fallback model {model}")
                    return stream
                except RateLimitError as e:
                    wait = self._retry_after(e)
                    self._cooldown[model] = time.monotonic() + wait
                    shortest = wait if shortest is None else min(shortest, wait)
                    last_err = e
                    logger.warning(f"{model} rate-limited; cooling down {wait:.1f}s")
                except APIStatusError as e:
                    if e.status_code in (401, 403):
                        raise
                    last_err = e
                    logger.warning(f"{model} failed ({e.status_code}); trying the next model")
                except (asyncio.TimeoutError, APITimeoutError, APIConnectionError) as e:
                    last_err = e
                    logger.warning(f"{model} timed out or was unreachable; trying the next model")
            # Every model is cooling down or failed: wait for the soonest one, briefly.
            now = time.monotonic()
            soonest = min((t - now for t in self._cooldown.values() if t > now), default=None)
            wait = soonest if soonest is not None else (shortest or 1.0)
            if waited + wait > MAX_TOTAL_WAIT_S:
                break
            await asyncio.sleep(max(0.3, wait))
            waited += wait
        raise last_err or RuntimeError("no model available")
