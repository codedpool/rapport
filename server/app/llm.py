"""LLM access for non-streaming calls (question plans, feedback, key checks).

Both providers speak the OpenAI chat-completions dialect, so one client covers
OpenRouter and Gemini (through Google's OpenAI-compatible endpoint). The live
interview uses the same base URLs through Pipecat's OpenAI service.
"""

import asyncio
import json
import re

import httpx

from .security import redact

PROVIDERS = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "nvidia/nemotron-3.5-super-vl:free",  # free tier; tools + JSON verified
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "default_model": "gemini-3.5-flash-lite",
    },
}


class LLMError(Exception):
    """Safe-to-show error. Never carries a key or a raw provider body."""

    def __init__(self, message: str, *, auth: bool = False):
        super().__init__(message)
        self.auth = auth


def extra_body(provider: str) -> dict:
    """Provider-specific request fields. OpenRouter's free models reason before
    answering; low effort keeps replies fast and leaves room for the answer."""
    return {"reasoning": {"effort": "low"}} if provider == "openrouter" else {}


def base_url(provider: str) -> str:
    return PROVIDERS[provider]["base_url"]


def resolve_model(provider: str, model: str | None) -> str:
    return model or PROVIDERS[provider]["default_model"]


async def validate_key(provider: str, key: str) -> None:
    """Cheap, credit-free key check."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            if provider == "openrouter":
                r = await c.get("https://openrouter.ai/api/v1/key",
                                headers={"Authorization": f"Bearer {key}"})
            else:
                r = await c.get("https://generativelanguage.googleapis.com/v1beta/models",
                                params={"pageSize": 1}, headers={"x-goog-api-key": key})
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


async def chat_json(
    provider: str, key: str, model: str, messages: list[dict], *,
    temperature: float = 0.6, max_tokens: int = 2500, timeout: float = 60,
) -> dict:
    """One JSON-mode completion with a retry on rate limits and server errors."""
    url = base_url(provider).rstrip("/") + "/chat/completions"
    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
        **extra_body(provider),
    }
    last = "The LLM did not respond."
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=timeout) as c:
                r = await c.post(url, json=body, headers={"Authorization": f"Bearer {key}"})
        except httpx.TimeoutException:
            last = "The LLM timed out."
            continue
        except httpx.HTTPError:
            last = "Could not reach the LLM provider."
            await asyncio.sleep(1 + attempt)
            continue
        if r.status_code in (401, 403):
            raise LLMError("The LLM key was rejected by the provider.", auth=True)
        if r.status_code == 402:
            raise LLMError("The LLM account is out of credits for this request. Top it up or use another key.",
                           auth=True)
        if r.status_code == 404:
            raise LLMError(f"Model '{model}' is not available for this key.")
        if r.status_code == 429 or r.status_code >= 500:
            last = f"The LLM provider is busy ({r.status_code})."
            await asyncio.sleep(1.5 * (attempt + 1))
            continue
        if r.status_code >= 400:
            # Some models reject response_format; retry once without it.
            if "response_format" in body:
                body.pop("response_format")
                continue
            raise LLMError(f"The LLM request failed ({r.status_code}).")
        try:
            choice = r.json()["choices"][0]
            text = choice["message"]["content"] or ""
        except (KeyError, IndexError, ValueError, TypeError):
            last = "The LLM returned an unexpected response."
            continue
        parsed = _extract_json(text)
        if parsed is not None:
            return parsed
        if choice.get("finish_reason") == "length":
            # Reasoning models can spend the whole budget thinking; give them more room.
            body["max_tokens"] = min(body["max_tokens"] * 2, 12000)
            last = "The LLM ran out of room before finishing."
            continue
        last = "The LLM returned malformed JSON."
    raise LLMError(redact(last))
