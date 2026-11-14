"""Fairness check: the same answers in English, Hindi and Hinglish should score about the same.

Usage (from server/):  python -m scripts.fairness_eval [runs] [provider]
Reads the LLM key from the repo .env (GEMINI_API_KEY or OPEN_ROUTER_API_KEY).
"""

import asyncio
import os
import statistics
import sys

from app.config import settings  # noqa: F401  (loads .env)
from app.interview import feedback as fb
from app.llm import resolve_model

SPEC = {"role": "Backend Engineer", "job_description": "Python, Redis, payments systems.",
        "interview_type": "technical", "language": "en", "duration_min": 5}

Q = [
    "Tell me about a system you built that you are proud of.",
    "How did you decide what to cache, and what went wrong?",
    "How would you handle rate limiting for a payments API?",
]
A = {
    "en": [
        "I built the refund service for our payments team. It handles about two lakh refunds a day, and I designed the retry queue so that no refund is lost even if the bank API is down.",
        "We cached merchant settings in Redis because they were read on every payment. The mistake was a long expiry, so when a merchant changed settings it took ten minutes to apply. We moved to invalidating the key on every update.",
        "I would use a sliding window counter in Redis per merchant key, return 429 with a retry-after header, and keep a separate higher limit for refunds so they are never starved.",
    ],
    "hi": [
        "मैंने अपनी payments टीम के लिए refund service बनाई थी। यह रोज़ लगभग दो लाख refunds संभालती है, और मैंने retry queue ऐसे design की कि bank का API बंद होने पर भी कोई refund खोता नहीं है।",
        "हमने merchant settings को Redis में cache किया क्योंकि हर payment पर उन्हें पढ़ा जाता था। गलती यह थी कि expiry बहुत लंबी थी, तो merchant के settings बदलने पर दस मिनट लगते थे। फिर हमने हर update पर key को invalidate करना शुरू किया।",
        "मैं Redis में हर merchant key के लिए sliding window counter रखूँगा, 429 के साथ retry-after header लौटाऊँगा, और refunds के लिए अलग ऊँची limit रखूँगा ताकि वे कभी रुकें नहीं।",
    ],
    "hinglish": [
        "Maine apni payments team ke liye refund service banayi thi. Woh roz lagbhag do lakh refunds handle karti hai, aur maine retry queue aise design ki ki bank ka API down ho tab bhi koi refund lose nahi hota.",
        "Humne merchant settings ko Redis mein cache kiya kyunki har payment pe unhe read kiya jaata tha. Galti yeh thi ki expiry bahut lambi thi, toh merchant ke settings change karne pe das minute lagte the. Phir humne har update pe key invalidate karna shuru kiya.",
        "Main Redis mein har merchant key ke liye sliding window counter rakhunga, 429 ke saath retry-after header return karunga, aur refunds ke liye alag higher limit rakhunga taaki woh kabhi starve na hon.",
    ],
}


def transcript(lang: str) -> list[dict]:
    out = []
    for q, a in zip(Q, A[lang]):
        out += [{"role": "interviewer", "text": q, "t": 0}, {"role": "candidate", "text": a, "t": 0}]
    return out


async def main():
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    provider = sys.argv[2] if len(sys.argv) > 2 else "gemini"
    key = os.environ["GEMINI_API_KEY" if provider == "gemini" else "OPEN_ROUTER_API_KEY"]
    model = resolve_model(provider, None)
    print(f"provider={provider} model={model} runs={runs}\n")
    results = {}
    for lang in A:
        overall, dims, dropped = [], [], 0
        for _ in range(runs):
            f = await fb.generate(SPEC, transcript(lang), provider=provider, key=key, model=model)
            overall.append(f["overall"])
            dims.append(sum(f["scores"].values()) / 4)
            dropped += f["quotes_removed"]
        results[lang] = (statistics.mean(overall), statistics.mean(dims))
        print(f"{lang:9s} overall {statistics.mean(overall):.2f} (runs {overall})  "
              f"avg dimension {statistics.mean(dims):.2f}  non-verbatim quotes removed {dropped}")
    spread = max(v[0] for v in results.values()) - min(v[0] for v in results.values())
    print(f"\nspread of mean overall across languages: {spread:.2f} points (out of 10)")


if __name__ == "__main__":
    asyncio.run(main())
