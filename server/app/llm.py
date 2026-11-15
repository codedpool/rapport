"""LLM access shared by the live interview and the one-shot JSON calls.

All three providers speak the OpenAI chat-completions dialect. Groq is the default:
it answers in well under a second, which is what makes the interview feel live.

Groq's free tier allows about 8,000 tokens per minute *per model*, so Groq runs a
fallback chain (Qwen, then GPT-OSS 20B, then GPT-OSS 120B). A rate limit, overload or
outage on one model moves the request to the next, and every request is sized to
stay under the per-minute budget.
"""

import asyncio
import json
import re

import httpx

from .config import settings
from .security import redact

GROQ_CHAIN = ["qwen/qwen3.8-27b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]

PROVIDERS = {
    "groq": {
        "base_url": settings.groq_base_url,
        "default_model": GROQ_CHAIN[0],
        "chain": GROQ_CHAIN,
        "request_budget": 7000,  # prompt + reply per request, under the 8k tokens/minute free limit
    },
    "openrouter": {
        "base_url": settings.openrouter_base_url,
        "default_model": "nvidia/nemotron-3.5-super-vl:free",
        "chain": ["nvidia/nemotron-3.5-super-vl:free", "baidu/ernie-5.5-flash-preview:free"],
        "request_budget": 60000,
    },
    "gemini": {
        "base_url": settings.gemini_base_url,
        "default_model": "gemini-3.5-flash-lite",
        "chain": ["gemini-3.5-flash-lite"],
        "request_budget": 60000,
    },
}


class LLMError(Exception):
    """Safe-to-show error. Never carries a key or a raw provider body."""

    def __init__(self, message: str, *, auth: bool = False):
        super().__init__(message)
        self.auth = auth


def base_url(provider: str) -> str:
    return PROVIDERS[provider]["base_url"]


def resolve_model(provider: str, model: str | None) -> str:
    return model or PROVIDERS[provider]["default_model"]


def model_chain(provider: str, preferred: str | None) -> list[str]:
    """The user's model first (if any), then the provider's fallbacks, without repeats."""
    chain = [preferred] if preferred else []
    for m in PROVIDERS[provider]["chain"]:
        if m not in chain:
            chain.append(m)
    return chain


def request_budget(provider: str) -> int:
    return PROVIDERS[provider]["request_budget"]


def model_extras(provider: str, model: str) -> dict:
    """Per-model request fields that keep reasoning models quick and to the point."""
    if provider == "groq":
        if model.startswith("qwen/"):
            return {"reasoning_effort": "none"}
        if model.startswith("openai/gpt-oss"):
            return {"reasoning_effort": "low"}
        return {}
    if provider == "openrouter":
        return {"reasoning": {"effort": "low"}}
    return {}


_DEVANAGARI = re.compile(r"[ऀ-ॿ]")


def estimate_tokens(messages: list[dict]) -> int:
    """Rough, deliberately generous token count. Devanagari costs far more per character."""
    total = 0
    for m in messages:
        content = m.get("content")
        if isinstance(content, list):
            content = " ".join(str(p.get("text", "")) for p in content if isinstance(p, dict))
        text = str(content or "")
        if m.get("tool_calls"):
            text += json.dumps(m["tool_calls"])
        deva = len(_DEVANAGARI.findall(text))
        total += int(deva * 0.9 + (len(text) - deva) / 3.2) + 6
    return total


async def validate_key(provider: str, key: str) -> None:
    """Cheap, credit-free key check."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            base = base_url(provider).rstrip("/")
            if provider == "groq":
                r = await c.get(f"{base}/models", headers={"Authorization": f"Bearer {key}"})
            elif provider == "openrouter":
                r = await c.get(f"{base}/key", headers={"Authorization": f"Bearer {key}"})
            else:
                # Gemini's native models list sits one level above its OpenAI-compatible path.
                native = base.removesuffix("/openai")
                r = await c.get(f"{native}/models", params={"pageSize": 1}, headers={"x-goog-api-key": key})
    except httpx.HTTPError:
        raise LLMError("Could not reach the LLM provider. Check your connection and try again.")
    if r.status_code in (400, 401, 403):
        raise LLMError("The LLM key was rejected by the provider.", auth=True)
    if r.status_code >= 400:
        raise LLMError(f"The LLM provider returned an error ({r.status_code}).")


def _extract_json(text: str) -> dict | None:
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    cand = fenced.group(1) if fenced else text
    start, end = cand.find("{"), cand.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(cand[start : end + 1])
    except json.JSONDecodeError:
        return None


def _retry_after(r: httpx.Response) -> float:
    try:
        return max(0.5, min(float(r.headers.get("retry-after", "2")), 20.0))
    except ValueError:
        return 2.0


async def chat_json(
    provider: str, key: str, model: str | None, messages: list[dict], *,
    temperature: float = 0.6, max_tokens: int = 2500, timeout: float = 60, max_wait: float = 45,
    chain: list[str] | None = None,
) -> dict:
    """One JSON completion. Walks the model chain on rate limits, overloads, outages,
    truncation and malformed output; waits out a full-chain rate limit up to max_wait."""
    url = base_url(provider).rstrip("/") + "/chat/completions"
    chain = chain or model_chain(provider, model)
    budget = request_budget(provider)
    prompt_tokens = estimate_tokens(messages)
    # Leave the reply whatever fits in the per-request budget, within sensible bounds.
    reply_cap = max(800, min(max_tokens, budget - prompt_tokens))
    waited = 0.0
    last = "The LLM did not respond."
    use_format = True
    for _round in range(3):
        shortest_wait = None
        for m in chain:
            tokens = reply_cap
            for _try in range(2):  # second try only after a truncated reply
                body = {"model": m, "messages": messages, "temperature": temperature,
                        "max_tokens": tokens, **model_extras(provider, m)}
                if use_format:
                    body["response_format"] = {"type": "json_object"}
                try:
                    async with httpx.AsyncClient(timeout=timeout) as c:
                        r = await c.post(url, json=body, headers={"Authorization": f"Bearer {key}"})
                except httpx.TimeoutException:
                    last = "The LLM timed out."
                    break
                except httpx.HTTPError:
                    last = "Could not reach the LLM provider."
                    break
                if r.status_code in (401, 403):
                    raise LLMError("The LLM key was rejected by the provider.", auth=True)
                if r.status_code == 402:
                    last = "The LLM account is out of credits for this request."
                    break
                if r.status_code == 429:
                    wait = _retry_after(r)
                    shortest_wait = wait if shortest_wait is None else min(shortest_wait, wait)
                    last = "The LLM provider is rate-limiting this key."
                    break
                if r.status_code in (404, 413) or r.status_code >= 500:
                    last = f"The LLM provider could not serve this request ({r.status_code})."
                    break
                if r.status_code >= 400:
                    if use_format:  # some models reject response_format
                        use_format = False
                        continue
                    last = f"The LLM request failed ({r.status_code})."
                    break
                try:
                    choice = r.json()["choices"][0]
                    text = choice["message"].get("content") or ""
                except (KeyError, IndexError, ValueError, TypeError):
                    last = "The LLM returned an unexpected response."
                    break
                parsed = _extract_json(text)
                if parsed is not None:
                    return parsed
                if choice.get("finish_reason") == "length" and tokens < budget:
                    tokens = min(tokens * 2, max(budget - prompt_tokens, tokens + 500))
                    last = "The LLM ran out of room before finishing."
                    continue
                last = "The LLM returned malformed JSON."
                break
        if shortest_wait is None or waited + shortest_wait > max_wait:
            break
        await asyncio.sleep(shortest_wait)
        waited += shortest_wait
    raise LLMError(redact(last))
