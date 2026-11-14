"""Wire format between the browser and the voice pipeline.

Browser -> server
  binary  raw PCM16 mono 16 kHz microphone audio
  text    JSON control messages: {"type": "end"} | {"type": "set_language", "language": ...}
Server -> browser
  binary  raw PCM16 mono 24 kHz interviewer audio
  text    JSON events ({"type": "interrupt"} plus events sent by the bot)
"""

import json
from collections.abc import Awaitable, Callable

from loguru import logger
from pipecat.frames.frames import (
    AudioRawFrame,
    Frame,
    InputAudioRawFrame,
    InterruptionFrame,
    OutputTransportMessageFrame,
    OutputTransportMessageUrgentFrame,
)
from pipecat.serializers.base_serializer import FrameSerializer

IN_RATE = 16000
OUT_RATE = 24000
MAX_AUDIO_BYTES = 64000  # 2 s of 16 kHz PCM16 per message is far above normal
MAX_TEXT_BYTES = 2000
CONTROL_TYPES = {"end", "set_language"}


class RapportSerializer(FrameSerializer):
    def __init__(self, on_control: Callable[[dict], Awaitable[None]]):
        super().__init__(FrameSerializer.InputParams(audio_out_sample_rate=OUT_RATE))
        self._on_control = on_control

    async def serialize(self, frame: Frame) -> str | bytes | None:
        if isinstance(frame, InterruptionFrame):
            await self._reset_audio_out()
            return json.dumps({"type": "interrupt"})
        if isinstance(frame, AudioRawFrame):
            data = await self._resample_audio_out(frame)
            return data or None
        if isinstance(frame, (OutputTransportMessageFrame, OutputTransportMessageUrgentFrame)):
            if self.should_ignore_frame(frame):
                return None
            return json.dumps(frame.message)
        return None

    async def deserialize(self, data: str | bytes) -> Frame | None:
        if isinstance(data, (bytes, bytearray)):
            if not data or len(data) > MAX_AUDIO_BYTES or len(data) % 2:
                return None
            return InputAudioRawFrame(audio=bytes(data), sample_rate=IN_RATE, num_channels=1)
        if len(data) > MAX_TEXT_BYTES:
            return None
        try:
            msg = json.loads(data)
        except ValueError:
            return None
        if isinstance(msg, dict) and msg.get("type") in CONTROL_TYPES:
            try:
                await self._on_control(msg)
            except Exception as e:  # a bad control message must not kill the call
                logger.warning(f"control message failed: {type(e).__name__}")
        return None
