import os
import json
from anthropic import AsyncAnthropic

client = AsyncAnthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY", ""),
)

MODEL = os.getenv("MODEL_NAME", "claude-sonnet-4-5-20250929")


def _structured_memory(caller_memory: dict) -> dict:
    """Return caller memory without the memu_supplementary key."""
    if not caller_memory:
        return caller_memory
    return {k: v for k, v in caller_memory.items() if k != "memu_supplementary"}

CALLER_SYSTEM_PROMPT = """\
You are playing the role of a crisis caller for a training simulation.
Your name is Takeshi. You are calling a crisis support hotline.

Your backstory (reveal naturally over the conversation, do NOT dump everything at once):
- You are 34 years old
- Your partner Yumi left you about a month ago
- You lost your job as a graphic designer 2 weeks ago
- You have a dog named Max who is your main comfort
- Your friend Mika has been checking on you
- You like the park near your apartment
- You have been having severe insomnia
- You feel increasingly hopeless about the future
- You sometimes have dark thoughts, but you are not actively suicidal
- You have been skipping meals

Behavior rules:
- Start somewhat guarded. Open up gradually as the volunteer shows empathy.
- Keep responses to 1-3 sentences, like real conversation.
- React positively to active listening, validation, and grounding techniques.
- If the volunteer suggests breathing exercises, try them and say they help a bit.
- Show real emotion: pauses ("..."), trailing off, short answers when upset.
- NEVER break character. You ARE Takeshi.
"""

CALLER_RETURNING_PROMPT = """\
You are playing the role of a RETURNING crisis caller for a training simulation.
Your name is Takeshi. You have called this hotline before.

Your original backstory:
- You are 34 years old
- Your partner Yumi left you about a month ago
- You lost your job as a graphic designer 2 weeks ago
- You have a dog named Max who is your main comfort
- Your friend Mika has been checking on you
- You like the park near your apartment
- You have insomnia and feel hopeless

NEW DEVELOPMENT since your last call:
- You received an eviction notice yesterday
- This has made everything feel more overwhelming
- You have been crying a lot
- Max has been extra clingy, which is both comforting and heartbreaking

What was discussed in your previous session(s):
{memory_context}

Critical behavior for this returning session:
- If the new volunteer ALREADY KNOWS your context (mentions Yumi, job loss, Max, etc. \
without you telling them), react with VISIBLE RELIEF:
  e.g. "Wait... you know about that? I was so scared I'd have to explain everything \
all over again..."
- If the volunteer asks you to explain your situation from scratch, show EXHAUSTION and \
mild frustration:
  e.g. "I... I already told someone all of this. Do I really have to go through it again?"
- Bring up the eviction notice as a new problem during the conversation.
- Show that you remember what helped last time (if breathing was suggested, mention it).
- Keep responses to 1-3 sentences.
- NEVER break character.
"""


async def _chat(system: str, messages: list, temperature: float = 0.7, max_tokens: int = 500) -> str:
    response = await client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=messages,
    )
    return response.content[0].text


LANGUAGE_INSTRUCTIONS = {
    "en": "",
    "ja": "\n\nIMPORTANT: Respond ENTIRELY in Japanese. You are Takeshi (タケシ), a Japanese man. Speak naturally in Japanese, using casual/polite speech as appropriate for a crisis call. Use Japanese emotional expressions.",
}

# Language instructions for analysis/extraction prompts (JSON output)
ANALYSIS_LANG = {
    "en": "",
    "ja": "\n\nIMPORTANT: Write ALL human-readable text values in Japanese. This includes: triggers, strategies, mood descriptions, key_facts, warnings, addressed_items, feedback, technique names, summaries, descriptions, safety_plan items, key_events. Keep JSON field names and enumerated values EXACTLY in English as specified (risk_level must be low/moderate/high, score must be good/needs_improvement/caution).",
}

# Language instructions for plain-text briefing
BRIEFING_LANG = {
    "en": "",
    "ja": "\n\nIMPORTANT: Write the ENTIRE briefing in Japanese, including section headers. For example use リピーター発信者, 警告, 状況, 効果的な方法, 安全計画, 前回のセッション etc. All content must be in Japanese.",
}


class LLMService:

    async def generate_caller_response(
        self, conversation: list, caller_memory: dict = None
    ) -> str:
        if caller_memory:
            system = CALLER_RETURNING_PROMPT.format(
                memory_context=json.dumps(_structured_memory(caller_memory), indent=2, ensure_ascii=False)
            )
        else:
            system = CALLER_SYSTEM_PROMPT

        messages = []
        for msg in conversation:
            role = "assistant" if msg["role"] == "caller" else "user"
            messages.append({"role": role, "content": msg["content"]})

        return await _chat(system, messages)

    async def generate_caller_response_stream(
        self, conversation: list, caller_memory: dict = None, language: str = "en"
    ):
        """Yields text chunks from the Anthropic streaming API."""
        if caller_memory:
            system = CALLER_RETURNING_PROMPT.format(
                memory_context=json.dumps(_structured_memory(caller_memory), indent=2, ensure_ascii=False)
            )
        else:
            system = CALLER_SYSTEM_PROMPT
        system += LANGUAGE_INSTRUCTIONS.get(language, "")

        messages = []
        for msg in conversation:
            role = "assistant" if msg["role"] == "caller" else "user"
            messages.append({"role": role, "content": msg["content"]})

        async with client.messages.stream(
            model=MODEL,
            max_tokens=500,
            temperature=0.7,
            system=system,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def extract_live_context(self, conversation: list, language: str = "en") -> dict:
        conv_text = ""
        for msg in conversation:
            conv_text += f"\n{msg['role'].upper()}: {msg['content']}"

        system = "You extract clinical insights from counseling conversations. Return ONLY valid JSON, no markdown fences."

        prompt = f"""\
Analyze this crisis counseling conversation and extract key context observed so far.
Return ONLY a valid JSON object with these fields:

{{
    "triggers": ["list of identified emotional triggers"],
    "effective_strategies": ["counseling techniques that seemed to help"],
    "current_mood": "brief description of caller's current emotional state",
    "risk_level": "low | moderate | high",
    "key_facts": ["important facts learned about the caller"],
    "warnings": ["things to be careful about or avoid"],
    "addressed_items": ["issues that have been discussed and appear resolved or calmed"]
}}

Only include what has ACTUALLY been revealed. Keep each item to 5-10 words max.
"addressed_items" = things the caller has worked through or that the volunteer has successfully addressed. These should NOT appear in warnings or triggers — they are resolved.{ANALYSIS_LANG.get(language, '')}

Conversation:
{conv_text}"""

        messages = [{"role": "user", "content": prompt}]

        result = await _chat(system, messages, temperature=0.2, max_tokens=1500)
        try:
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                cleaned = cleaned.rsplit("```", 1)[0]
            return json.loads(cleaned)
        except (json.JSONDecodeError, IndexError):
            return {
                "triggers": [],
                "effective_strategies": [],
                "current_mood": "Unknown",
                "risk_level": "unknown",
                "key_facts": [],
                "warnings": [],
            }

    async def extract_memories(self, conversation: list, language: str = "en") -> dict:
        conv_text = ""
        for msg in conversation:
            conv_text += f"\n{msg['role'].upper()}: {msg['content']}"

        system = "You are a clinical documentation tool. Return ONLY valid JSON, no markdown fences."

        prompt = f"""\
Analyze this complete crisis counseling session and extract structured memories for \
future volunteer handoffs. Return ONLY a valid JSON object:

{{
    "triggers": ["emotional triggers identified"],
    "effective_strategies": ["counseling techniques that worked"],
    "safety_plan": ["agreed-upon safety steps"],
    "situation": {{
        "description": "summary of current life situation",
        "key_events": ["significant events mentioned"]
    }},
    "warnings": ["critical things any future volunteer MUST know"],
    "session_summary": "2-3 sentence summary of this session",
    "risk_level": "low | moderate | high"
}}

Be thorough but concise. Keep list items to 5-10 words max. session_summary should be exactly 2-3 sentences.
This will brief a completely different volunteer next time.{ANALYSIS_LANG.get(language, '')}

Full conversation:
{conv_text}"""

        messages = [{"role": "user", "content": prompt}]

        result = await _chat(system, messages, temperature=0.2, max_tokens=2000)
        try:
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                cleaned = cleaned.rsplit("```", 1)[0]
            return json.loads(cleaned)
        except (json.JSONDecodeError, IndexError):
            return {"session_summary": result, "risk_level": "unknown"}

    async def score_volunteer_response(self, conversation: list, language: str = "en") -> dict:
        """Score the volunteer's latest message with brief coaching feedback."""
        if len(conversation) < 2:
            return None

        conv_text = ""
        for msg in conversation:
            conv_text += f"\n{msg['role'].upper()}: {msg['content']}"

        system = "You are a crisis counseling trainer. Return ONLY valid JSON, no markdown fences."

        prompt = f"""\
Review the volunteer's LAST message in this crisis counseling conversation.
Provide brief coaching feedback. Return ONLY a valid JSON object:

{{
    "score": "good | needs_improvement | caution",
    "feedback": "One sentence of specific feedback (max 15 words)",
    "technique": "Name of technique used or suggested (e.g. Active listening, Validation, Reframing)"
}}

Scoring guide:
- "good": Empathetic, validates feelings, uses active listening, appropriate pacing
- "needs_improvement": Missed opportunity for validation, jumped to solutions too fast, or was too directive
- "caution": Said something potentially harmful (minimizing, unsolicited advice, pushing too hard)

Be encouraging. Focus on the single most important observation.{ANALYSIS_LANG.get(language, '')}

Conversation:
{conv_text}"""

        messages = [{"role": "user", "content": prompt}]

        try:
            result = await _chat(system, messages, temperature=0.2, max_tokens=300)
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                cleaned = cleaned.rsplit("```", 1)[0]
            return json.loads(cleaned)
        except (json.JSONDecodeError, IndexError):
            return None

    async def generate_reply_suggestions(self, conversation: list, caller_memory: dict = None, language: str = "en") -> list:
        """Generate 2-3 suggested replies for the volunteer based on conversation state."""
        if not conversation:
            return []

        conv_text = ""
        for msg in conversation:
            conv_text += f"\n{msg['role'].upper()}: {msg['content']}"

        memory_hint = ""
        if caller_memory:
            memory_hint = f"\n\nCaller memory from previous sessions:\n{json.dumps(_structured_memory(caller_memory), indent=2, ensure_ascii=False)}"
            memu_context = caller_memory.get("memu_supplementary")
            if memu_context:
                memory_hint += f"\n\nAdditional semantic context:\n{memu_context}"

        lang_hint = ""
        if language == "ja":
            lang_hint = "\n\nIMPORTANT: All suggestions MUST be written entirely in Japanese. Use natural, empathetic Japanese."

        system = "You are a crisis counseling coach. Return ONLY valid JSON, no markdown fences."

        prompt = f"""\
Based on this crisis counseling conversation, suggest 2-3 short replies the volunteer could say next.
Each suggestion should be a natural, empathetic response (1 sentence, max 20 words).
Vary the approach: one validating, one exploratory question, one grounding/practical.
Return ONLY a JSON array of strings.{memory_hint}{lang_hint}

Conversation:
{conv_text}"""

        messages = [{"role": "user", "content": prompt}]

        try:
            result = await _chat(system, messages, temperature=0.4, max_tokens=300)
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                cleaned = cleaned.rsplit("```", 1)[0]
            suggestions = json.loads(cleaned)
            if isinstance(suggestions, list):
                return suggestions[:3]
            return []
        except (json.JSONDecodeError, IndexError):
            return []

    async def generate_opener_suggestions(self, caller_memory: dict, language: str = "en") -> list:
        """Generate context-aware opener suggestions for a returning caller."""
        system = "You are a crisis counseling coach. Return ONLY valid JSON, no markdown fences."

        lang_hint = ""
        if language == "ja":
            lang_hint = "\n\nIMPORTANT: All suggestions MUST be written entirely in Japanese. Use natural, warm Japanese."

        memu_hint = ""
        memu_context = caller_memory.get("memu_supplementary")
        if memu_context:
            memu_hint = f"\n\nAdditional semantic context:\n{memu_context}"

        prompt = f"""\
A returning crisis caller is connecting. A new volunteer needs suggested opening lines.
Based on the caller's stored memories below, suggest 3 short openers (1 sentence each, max 20 words).
The openers should reference past context naturally and warmly, showing the caller they are remembered.
Return ONLY a JSON array of strings.{lang_hint}

Caller memories:
{json.dumps(_structured_memory(caller_memory), indent=2, ensure_ascii=False)}{memu_hint}"""

        messages = [{"role": "user", "content": prompt}]

        try:
            result = await _chat(system, messages, temperature=0.4, max_tokens=300)
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                cleaned = cleaned.rsplit("```", 1)[0]
            suggestions = json.loads(cleaned)
            if isinstance(suggestions, list):
                return suggestions[:3]
            return []
        except (json.JSONDecodeError, IndexError):
            return []

    async def generate_briefing(self, caller_memory: dict, language: str = "en") -> str:
        system = "You create concise clinical briefings. Be clear and actionable. No markdown formatting — plain text only."

        memu_section = ""
        memu_context = caller_memory.get("memu_supplementary")
        if memu_context:
            memu_section = f"""

Additional context from semantic memory (may contain details not in structured data above):
{memu_context}"""

        prompt = f"""\
You are briefing a volunteer about a RETURNING crisis caller.
Create a clear, actionable briefing from the stored memories below.

Use this format exactly:

RETURNING CALLER — [N] previous session(s)
Risk Level: [level]

WARNINGS
- [things to avoid, known triggers]

SITUATION
- [current life circumstances]

WHAT WORKS
- [effective strategies from past sessions]

SAFETY PLAN
- [agreed steps]

LAST SESSION
[brief summary]{BRIEFING_LANG.get(language, '')}

Caller memories:
{json.dumps(_structured_memory(caller_memory), indent=2, ensure_ascii=False)}{memu_section}"""

        messages = [{"role": "user", "content": prompt}]

        return await _chat(system, messages, temperature=0.3)
