"""Text filter applied right before speech synthesis.

Keeps the interviewer restrained: only the audio tags we allow reach Gnani
Timbre v3.0, and stray markdown never gets read aloud.
"""

import re
from collections.abc import Mapping
from typing import Any

from pipecat.utils.text.base_text_filter import BaseTextFilter

ALLOWED_TAGS = {"pauses", "exhales"}
_TAG = re.compile(r"<\s*([a-zA-Z _-]{1,24})\s*>")
_MARKDOWN = re.compile(r"[*#`~|]+")
# Emoji and pictographs: some models add them (e.g. a waving hand on goodbye).
_EMOJI = re.compile("[%s-%s%s-%s%s%s]+" % tuple(chr(c) for c in (0x1F000, 0x1FAFF, 0x2600, 0x27BF, 0xFE0F, 0x200D)))


def clean_for_speech(text: str) -> str:
    def keep(m: re.Match) -> str:
        name = m.group(1).strip().lower()
        return f"<{name}>" if name in ALLOWED_TAGS else " "

    text = _TAG.sub(keep, text)
    text = _MARKDOWN.sub(" ", text)
    text = _EMOJI.sub(" ", text)
    return re.sub(r"[ \t]{2,}", " ", text)


class InterviewerTextFilter(BaseTextFilter):
    async def update_settings(self, settings: Mapping[str, Any]):
        return None

    async def filter(self, text: str) -> str:
        return clean_for_speech(text)

    async def handle_interruption(self):
        return None

    async def reset_interruption(self):
        return None
