"""Request and domain schemas."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Language = Literal["en", "hi", "hinglish"]
InterviewType = Literal["technical", "hr", "mixed"]
LLMProvider = Literal["groq", "openrouter", "gemini"]

# Timbre v3.0 voices (each speaks all ten languages). Persona from Gnani's catalog.
VOICES: dict[str, dict] = {
    "Shivani": {"gender": "female", "persona": "Calm, clear"},
    "Chetana": {"gender": "female", "persona": "Warm, empathetic"},
    "Kalpana": {"gender": "female", "persona": "Composed"},
    "Riyaa": {"gender": "female", "persona": "Confident"},
    "Avinash": {"gender": "male", "persona": "Professional"},
    "Devansh": {"gender": "male", "persona": "Conversational"},
    "Prakash": {"gender": "male", "persona": "Steady"},
}
DEFAULT_VOICE = "Shivani"

# Timbre v2.5 "fast" engine: one preferred language per voice, no audio tags,
# but steadier first-audio latency. Picked by interview language and gender.
FAST_VOICES = {
    "en": {"female": "Kaveri", "male": "Pranav"},
    "hi": {"female": "Nalini", "male": "Deepak"},
    "hinglish": {"female": "Poorvi", "male": "Poorvi"},
}
VoiceEngine = Literal["expressive", "fast"]

MODEL_PATTERN = r"^[A-Za-z0-9._:/\-]{1,100}$"


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class InterviewSpec(_Strict):
    """What an interview is about. Shared by mock setups and recruiter templates."""

    role: str = Field(min_length=2, max_length=80)
    job_description: str = Field(default="", max_length=4000)
    resume_highlights: str = Field(default="", max_length=2000)
    interview_type: InterviewType = "mixed"
    duration_min: int = Field(default=8, ge=3, le=12)
    language: Language = "en"
    pressure_mode: bool = False
    deep_followups: bool = True
    keyterms: list[str] = Field(default_factory=list, max_length=60)

    @field_validator("keyterms")
    @classmethod
    def _clean_terms(cls, v: list[str]) -> list[str]:
        out = []
        for t in v:
            t = t.strip()
            if 1 <= len(t) <= 40 and t not in out:
                out.append(t)
        return out


class Keys(_Strict):
    gnani_api_key: str = Field(min_length=8, max_length=300)
    llm_provider: LLMProvider = "groq"
    llm_api_key: str = Field(min_length=8, max_length=300)
    llm_model: str | None = Field(default=None, pattern=MODEL_PATTERN)


class SessionCreate(_Strict):
    mode: Literal["mock", "scheduled"] = "mock"
    spec: InterviewSpec | None = None  # required for mock
    assignment_id: str | None = Field(default=None, max_length=64)  # required for scheduled
    keys: Keys
    voice: str = DEFAULT_VOICE
    voice_engine: VoiceEngine = "expressive"
    barge_in: bool = False  # True when the candidate wears headphones
    consent: bool

    @field_validator("voice")
    @classmethod
    def _voice(cls, v: str) -> str:
        if v not in VOICES:
            raise ValueError("unknown voice")
        return v

    @field_validator("consent")
    @classmethod
    def _consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("consent is required")
        return v


class TemplateIn(InterviewSpec):
    name: str = Field(min_length=2, max_length=80)


class AssignIn(_Strict):
    template_id: str = Field(max_length=64)
    emails: str = Field(max_length=20000)  # comma- or newline-separated


class ReleaseIn(_Strict):
    released: bool


class ClaimIn(_Strict):
    guest_token: str = Field(min_length=10, max_length=200)
