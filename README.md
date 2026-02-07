# Crisis Memory Bridge

> No one should have to retell their trauma because the shift changed.

An AI-powered memory layer for crisis counseling hotlines. When a caller reaches out again and gets a different volunteer, the new volunteer already has full context — triggers, what worked, safety plan, session history. The caller never has to re-explain their worst moment to a stranger.

Built for the **Vibe Coding with Memory Hackathon** (Feb 7, 2026 — Shibuya Hikarie, Tokyo). Uses TRAE + [memU](https://github.com/NevaMind-AI/memU).

---

## The Problem

Japan has one of the highest suicide rates among developed nations — over 21,000 people in 2022, roughly 58 per day. Crisis hotlines like **Inochi no Denwa** (7,000 volunteers, 700,000 calls/year) are a critical lifeline. But they share a structural problem:

**Every time a caller reaches out again, they get a different volunteer who knows nothing.**

The caller has to re-explain their triggers, their situation, what was tried before, what helped — from scratch. This causes:

- **Re-traumatization** through forced repetition of painful experiences
- **Wasted assessment time** — volunteers spend 10+ minutes gathering context instead of providing support
- **Missed escalation patterns** — risk may be trending upward across sessions, but no one sees the trajectory
- **Volunteer burnout** — working without context is exhausting for both parties

## The Solution

Crisis Memory Bridge adds an AI-powered memory layer between sessions:

1. **Volunteer A** talks with a caller. The AI extracts context in real-time (triggers, mood, risk level, strategies) into a sidebar.
2. Session ends. AI extracts structured memories and stores them.
3. **Volunteer B** connects with the same caller later. Before saying a word, they see a full briefing, memory timeline, and what changed since last time.
4. The caller reacts with relief — they don't have to start over.

| Without Memory | With Memory |
|----------------|-------------|
| "Can you tell me what's going on?" | "I see you've been dealing with job loss and a breakup. How have things been since we last spoke?" |
| Caller re-explains trauma | Caller feels known and safe |
| Volunteer spends 10 min assessing | Volunteer starts with context, jumps to support |
| Risk trends invisible | Risk escalation flagged automatically |
| Each session isolated | Continuous care across volunteers |

For the demo, the AI plays the caller role (Takeshi) while the human plays the volunteer — one person can demonstrate the full handoff flow.

---

## Quick Start

```bash
# Clone and setup
git clone https://github.com/Gentle-mann/crisis-memory-bridge.git
cd crisis-memory-bridge
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY

# Pre-seed demo data (creates caller-001 with one session history)
python seed_demo.py

# Run
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Open http://localhost:8000
# Enter "Volunteer B" + "caller-001" to see the returning caller flow immediately
```

### Optional: Enable memU semantic layer

```bash
pip install memu-py
# Add MEMU_API_KEY to .env (see .env.example)
python test_memu.py  # Verify integration
```

---

## Features

### Core
- **Real-time chat** with AI-simulated caller (Takeshi) using Claude Sonnet 4.5
- **Live context extraction** — triggers, mood, risk level, strategies update in the sidebar as conversation happens
- **Structured memory extraction** on session end — stored as inspectable JSON
- **Volunteer handoff** with auto-generated briefing for returning callers
- **SSE streaming** — token-by-token caller responses

### Intelligence
- **Volunteer coaching** — each volunteer message scored (good/needs_improvement/caution) with technique feedback, auto-fades after 12s
- **Risk escalation alerts** — flashing banner when risk increases mid-session, auto-dismisses after 8s
- **Dynamic reply suggestions** — clickable context-aware chips above the input (hardcoded greetings for new callers, LLM-generated for returning callers and follow-ups)
- **Smart forgetting** — addressed items fade with strikethrough; active warnings stay prominent
- **Session diffs** — NEW/ESCALATED/WORKED items highlighted on handoff
- **Emergency protocol overlay** — full-screen safety checklist triggered on HIGH risk with checkboxes and emergency numbers

### Hybrid Memory (Local + memU)
- **LocalMemoryStore** (primary) — structured JSON on disk: triggers, strategies, safety plan, warnings, situation, session records
- **HybridMemoryStore** (when memU configured) — local structured data + memU semantic retrieval for supplementary context
- memU catches things structured extraction misses (personal details, emotional patterns, offhand mentions)
- Graceful fallback — if memU is down, everything works via local store

### Supervisor Dashboard (`/supervisor`)
- Multi-caller grid with risk-colored cards
- SVG analytics (risk trend line chart, trigger count bar chart) — no external dependencies
- Session replay with play/pause controls and timed message delays

### UX
- **Full EN/JA i18n** — language toggle switches every piece of text instantly (75+ keys), all LLM outputs respond in selected language
- **Voice input** via Web Speech API (switches locale for Japanese)
- **Risk arc visualization** — mini SVG sparkline tracking risk progression within a session
- **Conversation export** — download transcript + context as formatted .txt
- **Sound notifications** — Web Audio API oscillator tones (alert on escalation, chime on backgrounded-tab message)
- **Session timer** — elapsed MM:SS with tabular-nums
- **Volunteer performance summary** — coaching stats at session end with score distribution and technique frequency

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                          │
│   Setup Screen → Chat Screen → Extraction → Reset        │
│   (SSE streaming, timeline rendering, live context)      │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP + SSE
┌──────────────────────▼──────────────────────────────────┐
│                    FastAPI Server                         │
│   app.py — routes, session state, SSE streaming          │
├──────────────────────┬──────────────────────────────────┤
│   LLM Service        │   Memory Store                    │
│   llm_service.py     │   memory_store.py                 │
│   (Anthropic Claude) │   (Local JSON + optional memU)    │
└──────────────────────┴──────────────────────────────────┘
```

### Memory Flow

```
Conversation happens
        │
        ▼
[Live Context Extraction] ──→ Sidebar updates (triggers, mood, risk, strategies)
        │
        ▼ (on session end)
[Full Memory Extraction] ──→ Structured JSON (triggers, strategies, safety plan, warnings, situation)
        │
        ▼
[Memory Store] ──→ LocalMemoryStore (structured JSON on disk)
               ──→ memU (raw conversation for semantic retrieval, if configured)
        │
        ▼ (on next session with same caller)
[Load Structured Memory] ──→ Local JSON (triggers, strategies, etc.)
[Query memU]             ──→ Supplementary semantic context (if configured)
        │
        ▼
[Briefing Generation] ──→ Plain-text briefing from structured data + memU context
[Timeline Retrieval]   ──→ Visual timeline with cross-session diffs (NEW/ESCALATED/WORKED)
```

### LLM Operations

8 distinct LLM calls through `llm_service.py`, all language-aware (EN/JA):

| Operation | Purpose | Temperature |
|-----------|---------|-------------|
| Caller response (streaming) | Simulates Takeshi via SSE | 0.7 |
| Live context extraction | Triggers/mood/risk/strategies as JSON | 0.2 |
| Volunteer coaching | Scores volunteer message with technique feedback | 0.2 |
| Reply suggestions | 2-3 contextual follow-up options | 0.4 |
| Opener suggestions | Context-aware opening lines for returning callers | 0.4 |
| Full memory extraction | Comprehensive structured extraction on session end | 0.2 |
| Briefing generation | Plain-text volunteer briefing from stored memories | 0.3 |

Live context extraction, coaching, and reply suggestions run **in parallel** after each exchange (3 concurrent LLM calls, zero added latency).

### Hybrid Memory Architecture

| Layer | Handled by | Purpose |
|-------|-----------|---------|
| Structured extraction (triggers, risk, safety plan) | LocalMemoryStore | Domain-specific schema, inspectable JSON |
| Timeline diffs (NEW/ESCALATED/WORKED) | LocalMemoryStore | Cross-session change detection |
| Supplementary semantic context | memU | Catches details structured extraction missed |

The `HybridMemoryStore` keeps local as primary and queries memU for supplementary context added as a `memu_supplementary` key. This key is included in volunteer-facing prompts (briefing, suggestions) but excluded from the caller AI. If memU is unavailable, the app works identically to pure local mode.

---

## Project Structure

```
crisis-memory-bridge/
├── app.py                  # FastAPI server — routes, session management, SSE streaming
├── llm_service.py          # All LLM calls — caller simulation, extraction, briefing, suggestions
├── memory_store.py          # Memory abstraction — LocalMemoryStore + HybridMemoryStore
├── seed_demo.py            # Pre-seed caller-001 data for demo
├── test_memu.py            # memU integration smoke test
├── requirements.txt         # Python dependencies
├── .env.example             # Template for environment variables
├── CLAUDE.md               # Detailed technical documentation & memU feedback
├── static/
│   ├── index.html           # Volunteer app — setup + chat screen
│   ├── supervisor.html      # Supervisor dashboard
│   ├── style.css            # Dark theme, clinical design
│   ├── supervisor.css       # Supervisor dashboard styles
│   ├── app.js               # Volunteer frontend — SSE, timeline, context, voice, i18n
│   └── supervisor.js        # Supervisor frontend — grid, analytics, replay
└── data/                    # Stored caller memories as JSON (gitignored)
    └── {caller_id}/
        ├── triggers.json
        ├── effective_strategies.json
        ├── safety_plan.json
        ├── situation.json
        ├── warnings.json
        └── sessions/
            ├── session_001.json
            └── session_002.json
```

## Tech Stack

- **Backend**: Python 3.14, FastAPI, uvicorn
- **Frontend**: Vanilla HTML/CSS/JS (no framework)
- **LLM**: Anthropic Claude Sonnet 4.5 via `anthropic` SDK (streaming)
- **Memory**: `LocalMemoryStore` (JSON on disk) + optional `HybridMemoryStore` (local + memU semantic layer)
- **Streaming**: Server-Sent Events for token-by-token responses

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `MODEL_NAME` | No | Model to use (default: `claude-sonnet-4-5-20250929`) |
| `MEMU_API_KEY` | No | memU cloud API key — enables HybridMemoryStore |
| `MEMU_BASE_URL` | No | memU cloud API base URL |
| `MEMU_LLM_API_KEY` | No | For self-hosted memU — LLM provider key |
| `MEMU_LLM_BASE_URL` | No | For self-hosted memU — LLM provider URL |
| `MEMU_CHAT_MODEL` | No | For self-hosted memU — chat model name |
| `MEMU_EMBED_MODEL` | No | For self-hosted memU — embedding model name |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Volunteer frontend |
| `GET` | `/supervisor` | Supervisor dashboard |
| `POST` | `/api/sessions/start` | Start session — returns briefing + suggestions if returning caller |
| `GET` | `/api/messages/stream` | Send message via SSE streaming (includes coaching, risk alerts, suggestions) |
| `POST` | `/api/sessions/end` | End session — extract and store memories |
| `GET` | `/api/callers/{caller_id}/timeline` | Memory timeline with diffs |
| `GET` | `/api/callers` | List all known caller IDs |
| `GET` | `/api/callers/summary` | All callers with risk, session count, last date |
| `GET` | `/api/callers/{caller_id}/analytics` | Risk trend, trigger counts, session dates |
| `GET` | `/api/callers/{caller_id}/sessions/{n}` | Full session detail including conversation |

---

## Demo Script (3 minutes)

**Pre-demo**: Run `python seed_demo.py` to pre-seed caller-001 with one session. Skip Scene 1 and jump straight to the handoff.

### Opening (15s)

> "Inochi no Denwa has served Japan for over 50 years — 7,000 volunteers handling 700,000 calls a year. But every time a caller reaches out again, they get a different volunteer who knows nothing. Crisis Memory Bridge fixes this."

### Scene 1 — "The First Call" (60s)

*Skip if using pre-seeded data.*

- Enter "Volunteer A" + "caller-001"
- Chat 5-6 messages. Let Takeshi reveal his situation naturally.
- Point out the sidebar updating in real-time.
- Click "End Session & Save Memories"

### Scene 2 — "The Return Call" (75s)

- Enter "Volunteer B" + "caller-001" (same caller ID)
- Point out **"CHANGES SINCE LAST SESSION"** block: new triggers, escalations, what worked
- Point out the **full briefing** and **memory timeline** below
- Point out **suggestion chips** above the input with context-aware openers
- Click a suggestion or reference Takeshi's past context
- Takeshi reacts with relief: *"Wait... you know about that?"*
- Takeshi introduces new crisis (eviction notice) — show sidebar updating

### Optional: Japanese Demo (15s)

- Click "JA" on setup screen — entire UI switches instantly
- Start session — Takeshi responds in Japanese, suggestions in Japanese, sidebar in Japanese
- *"Every LLM call outputs Japanese. Even voice input switches to Japanese recognition."*

### The Point (30s)

> "Without memory, this caller would retell their trauma to every new volunteer. With memory, care is continuous. The volunteer changes. The context doesn't."

> "This pattern applies to any handoff: nursing shifts, caseworker turnover, refugee resettlement. Anywhere humans are passed between helpers, memory should persist."

---

## Other Applications

The memory-layer-for-handoff pattern applies far beyond crisis counseling:

- **Healthcare** — Nursing shift handoffs, primary care continuity, ED triage for returning patients
- **Social Services** — Child protective services caseworker turnover, refugee resettlement, homeless outreach
- **Education** — IEP tracking across teachers, school counseling continuity, tutoring platforms
- **Legal** — Public defenders with high caseloads, immigration legal aid spanning years
- **Commercial** — Hospitality VIP preferences, wealth management advisor transitions, premium customer support

---

## memU Integration

memU is integrated as a **supplementary semantic layer** alongside the local structured store:

- **Without memU** (default): `LocalMemoryStore` handles everything via JSON files. Fully functional.
- **With memU**: `HybridMemoryStore` uses local JSON as primary + memU for supplementary context. Raw conversations are fed to memU on session end; memU is queried on session start for additional context that enriches briefings and suggestions.

```bash
pip install memu-py
# Add MEMU_API_KEY (cloud) or MEMU_LLM_API_KEY (self-hosted) to .env
python test_memu.py  # Verify
```

The factory in `memory_store.py` auto-detects env vars and selects the appropriate store. No code changes needed.

For detailed technical documentation on the hybrid architecture, including what each system handles and feedback for the memU team, see [CLAUDE.md](CLAUDE.md#deep-dive-hybrid-memory-implementation--memu-feedback).

---

## License

MIT

---

*Built with empathy. For the 58 people per day, and the volunteers who answer the phone.*
