# Crisis Memory Bridge

> No one should have to retell their trauma because the shift changed.

## What This Is

An AI-powered memory layer for crisis counseling hotlines. When a caller reaches out again and gets a different volunteer, the new volunteer already has full context — triggers, what worked, safety plan, session history. The caller never has to re-explain their worst moment to a stranger.

Built for the **Vibe Coding with Memory Hackathon** (Feb 7, 2026 — Shibuya Hikarie, Tokyo). Uses TRAE + memU.

---

## The Problem

### Japan's Mental Health Crisis

Japan has one of the highest suicide rates among developed nations. In 2022, over 21,000 people died by suicide — roughly 58 people per day. The country also faces *kodokushi* (孤独死, "lonely death"), where socially isolated individuals die alone and are not discovered for extended periods. An aging population, cultural stigma around mental health, and intense work culture compound the crisis.

Crisis hotlines are a critical lifeline, but they are under severe structural strain.

### Existing Solutions

**Inochi no Denwa (いのちの電話)** — Japan's oldest crisis hotline, operating since 1971 with 49 centers nationwide. Over 7,000 trained volunteers handle approximately 700,000 calls per year. The service is entirely volunteer-run and free.

**Yorisoi Hotline (よりそいホットライン)** — A 24-hour national hotline launched in 2012 by the Ministry of Health, Labour and Welfare. Provides multilingual support (English, Chinese, Korean, Portuguese, Spanish, Thai, Vietnamese, Tagalog) and specialized lines for DV, sexual violence, and foreign residents.

**TELL Lifeline** — Serves the English-speaking community in Japan. Staffed by trained volunteers, operates 9am-11pm daily. Also provides professional counseling services.

### The Gap

These organizations do extraordinary work. But they share a structural problem that no amount of volunteer training can solve:

1. **Context loss on volunteer rotation.** When a caller reaches out again, they almost certainly get a different volunteer. That volunteer has zero context. The caller must re-explain their situation, their triggers, what was tried before, what helped — from scratch.

2. **Re-traumatization through repetition.** Asking someone in crisis to retell their worst moment to a stranger is itself harmful. Research shows that forced narrative repetition without therapeutic framing can intensify trauma responses.

3. **No institutional memory.** Individual volunteers may remember a caller, but the organization doesn't. There is no structured system to capture what was learned in session A and surface it in session B. Each interaction starts at zero.

4. **Volunteer burnout.** Without context, volunteers spend significant time in assessment mode (gathering information) rather than support mode (applying interventions). This is exhausting for both parties.

5. **Missed escalation patterns.** A caller's risk level may be trending upward across sessions, but if each session is independent, no one sees the trajectory.

---

## Our Solution

Crisis Memory Bridge adds an AI-powered memory layer between sessions. It observes conversations, extracts structured context in real-time, and surfaces that context to the next volunteer — automatically.

### How It Works

1. **Volunteer A** talks with a caller. The AI observes and extracts context in real-time (triggers, mood, strategies, risk level) into a sidebar.
2. Session ends. AI extracts structured memories and stores them locally (and via memU if configured).
3. **Volunteer B** connects with the same caller later. Before the conversation starts, they see a full briefing, memory timeline, and context from previous sessions.
4. The caller reacts with relief — they don't have to start over.

### What Changes

| Without Memory | With Memory |
|----------------|-------------|
| "Can you tell me what's going on?" | "I see you've been dealing with job loss and a breakup. How have things been since we last spoke?" |
| Caller re-explains trauma | Caller feels known and safe |
| Volunteer spends 10 min assessing | Volunteer starts with context, jumps to support |
| Risk trends invisible | Risk escalation flagged automatically |
| Each session isolated | Continuous care across volunteers |

For the demo, the AI plays the caller role (Takeshi) while the human plays the volunteer. This lets one person demonstrate the full handoff flow.

---

## Other Applications

The memory-layer-for-handoff pattern applies far beyond crisis counseling:

### Healthcare
- **Nursing shift handoffs** — Night nurse briefs day nurse with AI-extracted patient context, not just chart data
- **Primary care continuity** — When your doctor leaves the practice, the new one actually knows your history
- **Emergency department triage** — Returning patients don't re-explain chronic conditions to each new attending

### Social Services
- **Child protective services** — Caseworker turnover is high; case context must persist across workers
- **Refugee resettlement** — Asylum seekers interact with dozens of officials; their story shouldn't degrade with each retelling
- **Homeless outreach** — Outreach workers rotate; knowing a person's shelter preferences, triggers, and trust-building history matters

### Education
- **IEP (Individualized Education Program) tracking** — Students with special needs interact with many teachers; accommodations and what works must transfer
- **School counseling** — Student support shouldn't reset when a counselor changes
- **Tutoring platforms** — New tutor picks up where the last one left off

### Legal
- **Public defenders** — High caseloads and turnover mean clients often re-explain their case to new attorneys
- **Immigration legal aid** — Cases span years with multiple advocates

### Commercial
- **Hospitality** — VIP guest preferences across hotel stays, different concierges
- **Wealth management** — Client relationship context when advisors change
- **Customer support** — Premium support where context matters (healthcare SaaS, enterprise tools)

---

## Technical Architecture

### System Overview

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
[Timeline Retrieval]   ──→ Visual timeline with cross-session diffs
```

### LLM Operations

Every LLM call goes through `llm_service.py`. There are 8 distinct operations. All accept a `language` parameter — when set to `"ja"`, output content is in Japanese (enum values like `risk_level` and `score` stay in English for CSS/logic).

| Operation | Purpose | Temperature | Max Tokens | Lang-aware |
|-----------|---------|-------------|------------|------------|
| Caller response | Simulates Takeshi (first session) | 0.7 | 500 | Yes |
| Caller response (streaming) | Same, but yields tokens via SSE | 0.7 | 500 | Yes |
| Live context extraction | Extracts triggers/mood/risk/strategies/addressed_items as JSON | 0.2 | 1500 | Yes |
| Volunteer coaching | Scores volunteer's last message with technique name and feedback | 0.2 | 300 | Yes |
| Reply suggestions | Generates 2-3 contextual follow-up suggestions for the volunteer | 0.4 | 300 | Yes |
| Opener suggestions | Generates context-aware opening lines for returning callers | 0.4 | 300 | Yes |
| Full memory extraction | Comprehensive structured memory extraction on session end | 0.2 | 2000 | Yes |
| Briefing generation | Plain-text volunteer briefing from stored memories | 0.3 | 500 | Yes |

Live context extraction, volunteer coaching, and reply suggestions run in parallel after each message exchange (3 concurrent LLM calls, zero added latency). For returning callers, briefing generation and opener suggestions also run in parallel at session start.

### Caller AI Behavior

The caller AI (Takeshi) has two prompt modes:
- **First session**: Guarded at first, opens up gradually, reveals backstory naturally (job loss, breakup with Yumi, dog Max, insomnia, dark thoughts)
- **Returning session**: Reacts with visible relief if volunteer already knows context, frustration if asked to re-explain. Introduces a new crisis (eviction notice) to demonstrate memory updating across sessions.

### Streaming Architecture

The SSE endpoint (`GET /api/messages/stream`) streams caller response tokens, then sends a `stream_end` event to re-enable input immediately, followed by a `done` event with context/coaching/suggestions after parallel LLM calls complete.

```
Client                              Server
  │                                    │
  │── GET /api/messages/stream ───────→│
  │                                    │── LLM stream starts
  │←── data: {"type":"token","content":"I"}
  │←── data: {"type":"token","content":"..."}
  │←── data: {"type":"token","content":"yeah"}
  │                                    │── LLM stream ends
  │←── data: {"type":"stream_end","caller_response":"..."}
  │   (input re-enabled immediately)   │── 3 parallel LLM calls (context + coaching + suggestions)
  │←── data: {"type":"done","caller_response":"...","live_context":{...},"suggestions":[...]}
  │                                    │
```

The `stream_end` / `done` split ensures the volunteer can start composing their next message immediately after the caller finishes speaking, while context extraction, coaching, and suggestions load asynchronously in the background (2-4 seconds later).

The frontend uses `fetch()` with `ReadableStream` (not `EventSource`) to handle the SSE protocol, which allows better error handling and POST-like semantics via query params.

### Memory Store Abstraction

`memory_store.py` uses an abstract `BaseMemoryStore` class with a factory pattern:

```python
BaseMemoryStore (ABC)
├── get_caller_memory(caller_id) → Optional[dict]
├── store_session(caller_id, volunteer_name, conversation, extracted_memories)
├── get_timeline(caller_id) → Optional[dict]
├── get_session_diff(caller_id) → Optional[dict]   # NEW/ESCALATED/WORKED items since last session
├── list_callers() → list
└── clear_caller(caller_id)

LocalMemoryStore(BaseMemoryStore)    # JSON files on disk (default)
HybridMemoryStore(BaseMemoryStore)   # Local JSON (primary) + memU (supplementary semantic layer)
MemUMemoryStore(BaseMemoryStore)     # Legacy, replaced by HybridMemoryStore

create_memory_store() → BaseMemoryStore  # Factory: auto-selects based on env vars
```

### Hybrid Memory Architecture

The `HybridMemoryStore` combines both systems, using each for what it's best at:

| Layer | Handled by | Purpose |
|-------|-----------|---------|
| **Structured extraction** (triggers, risk, safety plan, warnings) | LocalMemoryStore | Domain-specific, precise schema, inspectable |
| **Timeline diffs** (NEW/ESCALATED/WORKED) | LocalMemoryStore | Cross-session change detection |
| **Supplementary semantic context** | memU | Catches details structured extraction missed |

**How it works:**
- **On session end**: `store_session()` writes structured data to local JSON first, then feeds the raw conversation to memU for its own extraction. Local write always succeeds even if memU is down.
- **On session start**: `get_caller_memory()` loads structured data from local JSON (same dict shape as `LocalMemoryStore`), then queries memU and adds the result as `memory["memu_supplementary"]`. This key is stripped from prompts sent to the caller AI but included as a labeled section in volunteer-facing prompts (briefing, suggestions).
- **Fallback**: Every memU call is wrapped in try/except. If memU is unavailable, the app behaves identically to pure `LocalMemoryStore`.

The factory in `create_memory_store()` returns `HybridMemoryStore` when memU env vars are detected, `LocalMemoryStore` otherwise.

### Timeline Diffs

`get_timeline()` reads all session JSONs chronologically and computes cross-session diffs:
- **new_info**: Triggers and situation events not seen in prior sessions
- **escalations**: Risk level increases between consecutive sessions (e.g., "moderate → high")
- **new_strategies**: Effective strategies that appeared for the first time

This powers the visual timeline in the sidebar, where each session node shows what changed.

### Session Diff on Handoff

When a returning caller connects, `get_session_diff()` extracts the latest session's diffs and returns them to the frontend. The UI renders a red "CHANGES SINCE LAST SESSION" block above the briefing with color-coded items:
- **Red** — ESCALATED: risk level increases
- **Yellow** — NEW: new triggers, situation events
- **Green** — WORKED: newly discovered effective strategies

This gives the volunteer an instant summary of what changed since the previous session without reading the full briefing.

### Volunteer Coaching

After each message exchange, a parallel LLM call evaluates the volunteer's latest message and returns:
- **score**: `good`, `needs_improvement`, or `caution`
- **feedback**: One-sentence coaching tip (max 15 words)
- **technique**: Named technique (e.g., "Active listening", "Validation", "Reframing")

The coaching tip appears as a color-coded inline hint below the caller's response (green/yellow/red). It auto-fades to 30% opacity after 12 seconds to avoid clutter.

### Risk Escalation Alerts

The server tracks the previous risk level in each session. When the live context extraction returns a higher risk level than previously observed, the done event includes a `risk_alert` with `from` and `to` levels. The frontend renders a flashing red banner at the top of the chat panel that auto-dismisses after 8 seconds.

### Voice Input

A microphone button (Web Speech API) sits next to the send button. When active, it pulses red and transcribes speech into the message input field. The feature gracefully hides the button if the browser doesn't support `SpeechRecognition`.

### Smart Forgetting

The live context extraction prompt now includes an `addressed_items` field — issues the caller has worked through or that the volunteer has successfully addressed. These items render in the sidebar with strikethrough and 50% opacity, expanding slightly on hover. Active warnings and triggers always remain at full opacity, ensuring critical information is never lost while resolved items recede visually.

### Supervisor Dashboard

A separate page at `/supervisor` provides a multi-caller overview:
- **Caller grid**: Cards for each caller showing risk level (color-coded left border), session count, last volunteer, escalation badges
- **Detail panel**: Click a caller to see analytics charts, full timeline, and replay buttons
- **Analytics**: SVG-based risk trend line chart and new-info-per-session bar chart, rendered without external libraries
- **Session replay**: Plays back conversations message-by-message with timed delays (1.5s for caller, 0.8s for volunteer), with play/pause controls

### Dynamic Reply Suggestions

Clickable suggestion chips appear above the text input, guiding volunteers with contextual reply options at every point in the conversation:

- **New callers, first message**: 3 hardcoded simple greetings (e.g., "Hi, thanks for calling. How are you doing today?")
- **Returning callers, first message**: LLM-generated context-aware openers that reference past sessions (e.g., "I can see you've been through a lot recently with the job loss. How are you holding up?"). Generated in parallel with the briefing at session start.
- **After each exchange**: LLM-generated follow-up suggestions (2-3 options) that vary approach — one validating, one exploratory question, one grounding/practical. Generated in parallel with coaching and live context extraction.

Clicking a chip populates the text input without sending — the volunteer can edit before sending. Chips clear when a message is sent and refresh after each caller response.

### Session Timer

A timer in the header displays elapsed time (MM:SS) from the moment the session starts. Uses `setInterval` with `Date.now()` delta for drift-free counting. Stops on session end. Displayed with tabular-nums font variant for stable width. Duration is included in both the conversation export and the volunteer performance summary.

### Emergency Protocol Overlay

When risk escalates to "high" (detected from `risk_alert.to === "high"` in the SSE done event), a full-screen emergency protocol overlay appears with a structured safety checklist:

1. Ask: "Are you safe right now?"
2. Assess: Plan, means, timeline
3. Identify: Someone who can be with them
4. Provide: Emergency numbers (110, Inochi no Denwa, TELL)
5. Plan: Agree on next steps

Each step has a checkbox the volunteer can tick off. An alert sound plays via Web Audio API. The overlay dismisses when the volunteer clicks "I Understand — Return to Session". The red-tinted backdrop uses the same `alertFlash` animation as risk alerts.

### Risk Arc Visualization

A mini SVG sparkline in the context sidebar tracks the caller's risk level progression within the current session. Each message exchange adds a data point. Risk levels map to numeric values (low=1, moderate=2, high=3) and render as colored dots (green/yellow/red) connected by a line. Dashed horizontal gridlines mark LOW/MOD/HIGH thresholds. Only appears after 2+ exchanges (needs at least 2 points to draw a line).

### Conversation Export

An "Export Transcript" button in the session bar generates and downloads a formatted `.txt` file containing:
- Session metadata (caller ID, volunteer name, date, duration)
- Full transcript with role labels ([VOLUNTEER], [CALLER], [SYSTEM])
- Context summary (risk level, mood, triggers, warnings, strategies, key facts)

Uses `Blob` + `URL.createObjectURL` for client-side download. No server round-trip needed.

### Sound Notifications

Web Audio API oscillator-based sounds (no audio files):
- **Alert tone**: Two-tone beep (520Hz + 680Hz) on risk escalation — plays even when tab is focused
- **Chime**: Soft 440Hz sine wave with exponential decay when a caller message arrives while the tab is backgrounded (`document.hidden`)

Audio context is lazily initialized on first use and handles suspended state from browser autoplay policies.

### Volunteer Performance Summary

At session end, alongside the extracted memories, a performance summary card shows:
- Total exchange count and session duration
- Coaching score distribution as a stacked color bar (green/yellow/red) with percentages
- Technique frequency tags (e.g., "Active Listening (3x)", "Validation (2x)")

All data is tracked client-side from coaching results received in SSE done events.

### Multi-Language Support & Full i18n

The entire application is fully localized. A language toggle (EN/JA) on the setup screen sets the session language, and every piece of text — static and dynamic — switches immediately.

**Backend (server-side) — all 8 LLM operations are language-aware:**
- Language is passed through `POST /api/sessions/start` and stored in session state
- Caller AI prompt is appended with language-specific instructions — for Japanese, Takeshi (タケシ) responds naturally in Japanese using appropriate speech levels
- Reply suggestions and opener suggestions receive a `language` parameter; when Japanese, the LLM prompt includes "All suggestions MUST be written entirely in Japanese"
- New callers get hardcoded Japanese greetings (e.g., "お電話ありがとうございます。今日はどのような調子ですか？")
- Live context extraction (`extract_live_context`) returns triggers, mood, strategies, warnings, key facts, addressed items all in Japanese
- Volunteer coaching (`score_volunteer_response`) returns feedback and technique names in Japanese
- Memory extraction (`extract_memories`) stores structured memories in Japanese for future handoffs
- Briefing generation (`generate_briefing`) produces the full briefing text in Japanese including section headers (警告, 状況, 効果的な方法, 安全計画, etc.)
- Three separate language instruction constants: `LANGUAGE_INSTRUCTIONS` (caller AI speech), `ANALYSIS_LANG` (JSON extraction — keeps enum values like `risk_level` and `score` in English for CSS/logic), `BRIEFING_LANG` (plain-text briefing)

**Frontend (client-side i18n system):**
- `i18n` object in `app.js` contains ~75 translation keys per language (EN and JA)
- `t(key)` function returns the translated string for the current language
- `applyLanguage()` updates all static DOM elements instantly when the language toggle is clicked — setup screen labels, chat screen headers, sidebar titles, button text, placeholders, emergency overlay, extraction overlay
- All dynamic text rendering (system messages, risk badges, context panel sections, session diff labels, timeline nodes, mood arc axis labels, extraction results, performance summary, coaching feedback) uses `t()` calls
- `translateRisk()` helper maps raw risk level values (`low`/`moderate`/`high`) to localized display names (`低`/`中`/`高`) for sidebar badges, timeline badges, and extraction overlay
- Voice input switches to `ja-JP` or `en-US` locale based on selected language
- Timeline dates use locale-appropriate formatting (`toLocaleDateString('ja-JP')` vs `'en-US'`)
- Emergency protocol checklist renders fully in Japanese when JA is selected
- Risk arc labels switch between LOW/MOD/HIGH and 低/中/高

Translation coverage includes: page title, setup form labels, chat headers, section titles (Triggers, Strategies, Warnings, Key Facts, etc.), risk level display names, coaching scores, system messages ("Session started", "Extracting memories..."), button labels, input placeholders, export headers, performance summary labels, emergency protocol steps, timeline diff labels (NEW, ESCALATED, WORKED), and all LLM-generated content (sidebar context items, coaching feedback, technique names, briefing text, extracted memories).

---

## Project Structure

```
crisis-memory-bridge/
├── app.py                  # FastAPI server — routes, session management, SSE streaming
├── llm_service.py          # All LLM calls — caller simulation, extraction, briefing, suggestions
├── memory_store.py          # Memory abstraction — LocalMemoryStore + HybridMemoryStore (+ legacy MemUMemoryStore)
├── seed_demo.py            # Pre-seed caller-001 data for demo (run: python seed_demo.py)
├── test_memu.py            # memU integration smoke test (run: python test_memu.py)
├── requirements.txt         # Python dependencies
├── .env                     # API keys (gitignored)
├── .env.example             # Template for .env
├── .gitignore
├── static/
│   ├── index.html           # Volunteer app — setup screen + chat screen
│   ├── supervisor.html      # Supervisor dashboard — multi-caller overview
│   ├── style.css            # Dark theme, clinical design, all component styles
│   ├── supervisor.css       # Supervisor dashboard styles, charts, replay
│   ├── app.js               # Volunteer frontend — SSE streaming, timeline, live context, voice, i18n
│   └── supervisor.js        # Supervisor frontend — caller grid, analytics, session replay
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

- **Backend**: Python 3.13, FastAPI, uvicorn
- **Frontend**: Vanilla HTML/CSS/JS (no framework — speed over complexity)
- **LLM**: Anthropic Claude Sonnet 4.5 via `anthropic` SDK (streaming)
- **Memory**: Abstract `BaseMemoryStore` with hybrid architecture:
  - `LocalMemoryStore` — JSON files on disk (default, always active as primary)
  - `HybridMemoryStore` — LocalMemoryStore (structured) + memU (supplementary semantic layer, when configured)
  - memU SDK (`memu-py`) adds semantic retrieval for context that structured extraction missed
- **Streaming**: SSE (Server-Sent Events) for token-by-token caller responses

## Running

```bash
# Setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY

# Pre-seed demo data (creates caller-001 with one session)
python seed_demo.py

# Run
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
# Open http://localhost:8000
# Enter "Volunteer B" + "caller-001" to see the returning caller flow immediately
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `MODEL_NAME` | No | Model to use (default: `claude-sonnet-4-5-20250929`) |
| `MEMU_API_KEY` | No | memU cloud API key — enables HybridMemoryStore with semantic layer |
| `MEMU_BASE_URL` | No | memU cloud API base URL |
| `MEMU_LLM_API_KEY` | No | For self-hosted memU — LLM provider key |
| `MEMU_LLM_BASE_URL` | No | For self-hosted memU — LLM provider URL |
| `MEMU_CHAT_MODEL` | No | For self-hosted memU — chat model name |
| `MEMU_EMBED_MODEL` | No | For self-hosted memU — embedding model name |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Serve the volunteer frontend |
| `GET` | `/supervisor` | Serve the supervisor dashboard |
| `POST` | `/api/sessions/start` | Start a session (accepts `language` field) — returns briefing + suggestions if returning caller |
| `POST` | `/api/messages/send` | Send message (non-streaming fallback) |
| `GET` | `/api/messages/stream` | Send message via SSE streaming (includes coaching, risk alerts, suggestions) |
| `POST` | `/api/sessions/end` | End session — extract and store memories |
| `GET` | `/api/callers/{caller_id}/timeline` | Get memory timeline with diffs |
| `GET` | `/api/callers` | List all known caller IDs |
| `GET` | `/api/callers/summary` | All callers with risk, session count, last date (supervisor dashboard) |
| `GET` | `/api/callers/{caller_id}/analytics` | Risk trend, trigger counts, session dates (charts) |
| `GET` | `/api/callers/{caller_id}/sessions/{n}` | Full session detail including conversation (replay) |

---

## Demo Script (3 minutes)

**Pre-demo setup**: Run `python seed_demo.py` to pre-seed caller-001 with one session. This way you can skip Scene 1 and jump straight to the handoff if time is tight.

### Opening (15s)

"Inochi no Denwa has served Japan for over 50 years — 7,000 volunteers handling 700,000 calls a year. But every time a caller reaches out again, they get a different volunteer. And that volunteer knows nothing. The caller has to re-explain their trauma from scratch. Crisis Memory Bridge fixes this."

### Scene 1 — "The First Call" (60s)

*Skip this scene if using pre-seeded data — go straight to Scene 3.*

- Enter "Volunteer A" + "caller-001"
- Chat 5-6 messages. Let Takeshi reveal his situation naturally (breakup, job loss, insomnia).
- Point out the sidebar updating in real-time: "Watch the AI extract triggers, risk level, and mood as the conversation happens. The volunteer sees this live."
- Click "End Session & Save Memories"

### Scene 2 — "The Handoff" (30s)

*Skip if using pre-seeded data.*

- Show the extraction results: "The AI has extracted structured memories — triggers, what worked, safety plan, warnings. Stored locally and fed to memU for semantic understanding."
- Click "Start New Session"

### Scene 3 — "The Return Call" (75s)

- Enter "Volunteer B" + "caller-001" (same caller ID)
- Point out the **"CHANGES SINCE LAST SESSION"** block at the top: "Before the volunteer even says hello, they can see what's new — new triggers, risk escalations, what worked last time."
- Point out: "Below that, the full briefing and memory timeline. Different volunteer, but full context."
- Point out the **suggestion chips** above the input: "The AI is already suggesting context-aware openers based on Takeshi's history. The volunteer can click one and edit before sending."
- Click a suggestion or type something that references Takeshi's past context: "I understand you've been going through a tough time since Yumi left, and losing your job on top of that..."
- Takeshi reacts with relief: "Wait... you know about that? I was so scared I'd have to explain everything all over again..."
- Takeshi introduces new crisis (eviction notice)
- Show sidebar updating with new information

### Optional: Japanese Demo (15s)

- On the setup screen, click "JA" in the language toggle
- Point out: "The entire interface switches to Japanese instantly — every label, every button, every system message."
- Start a session — Takeshi responds in natural Japanese, suggestion chips are in Japanese, sidebar content (triggers, mood, strategies) is in Japanese
- "This isn't just UI translation — every LLM call outputs Japanese. The caller speaks Japanese, the sidebar extracts context in Japanese, coaching feedback is in Japanese, the briefing is in Japanese. Even voice input switches to Japanese recognition."

### Scene 4 — "The Point" (30s)

"Without memory, this caller would retell their trauma to every new volunteer. With memory, care is continuous. The volunteer changes. The context doesn't."

"This pattern applies to any handoff: nursing shifts, caseworker turnover, refugee resettlement. Anywhere humans are passed between helpers, memory should persist."

---

## Deployment

The application is deployed on **Railway** with persistent filesystem and long-running process support (required for SSE streaming and in-memory session state).

- **GitHub**: https://github.com/Gentle-mann/crisis-memory-bridge
- **Live Demo**: https://web-production-b1d2c.up.railway.app/

Railway was chosen over Vercel/serverless because:
- SSE streaming requires long-lived connections (serverless functions timeout at 10-30s)
- In-memory session state (`sessions` dict) requires a persistent process
- Local filesystem storage (`data/` directory) requires persistent disk

---

## Hackathon Day: TRAE Setup & Hosting

The hackathon requires using TRAE IDE. TRAE is VS Code-based, so the project opens as-is — no special configuration needed.

### Setup in TRAE

1. Open the `crisis-memory-bridge/` folder in TRAE
2. Open TRAE's integrated terminal
3. Run the setup:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   pip install memu-py
   ```
4. Configure `.env` with API keys (see Environment Variables section)
5. Pre-seed demo data: `python seed_demo.py`
6. Verify memU: `python test_memu.py`

### Running the Demo

```bash
source .venv/bin/activate
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000
```

- **Local**: Open `http://localhost:8000`
- **Same WiFi** (judges on their own devices): Use your laptop's local IP, e.g. `http://192.168.x.x:8000`. The `--host 0.0.0.0` flag already allows this.
- **Public access** (unlikely needed): `ngrok http 8000` for a temporary public URL

### Important Notes

- **Drop `--reload`** for the actual demo — more stable without file-watching overhead
- **Don't restart the server** between Scene 1 and Scene 3 — active sessions live in memory and are lost on restart (saved memories in `data/` persist)
- **Test the full flow beforehand**: new session → 5-6 exchanges → end session → new session with same caller ID → verify handoff
- **Test Japanese mode end-to-end**: select JA → start session → chat → verify sidebar content, coaching, and suggestions are all in Japanese

---

## memU Integration (Hackathon Day)

memU is integrated as a **supplementary semantic layer** alongside the local structured store. The `HybridMemoryStore` uses both:
- **LocalMemoryStore** handles structured data (triggers, strategies, safety plan, etc.) and timeline diffs — this is always the primary system
- **memU** receives raw conversations and provides semantic retrieval that catches context the structured extraction missed (e.g., personal details, emotional patterns, offhand mentions)

At the hackathon, enable the memU layer:

```bash
pip install memu-py
```

Add to `.env`:
```
MEMU_API_KEY=your-memu-key-here
# OR for self-hosted:
MEMU_LLM_API_KEY=your-llm-key
MEMU_CHAT_MODEL=gpt-4o
MEMU_EMBED_MODEL=text-embedding-3-small
```

The factory in `memory_store.py` will automatically detect the env vars and return `HybridMemoryStore`. No code changes needed. Without memU env vars, it returns plain `LocalMemoryStore` — everything works the same, just without the supplementary semantic layer.

Verify it works:
```bash
python test_memu.py
```
This tests store creation, session storage, memory retrieval (including `memu_supplementary` key), and timeline. Auto-skips if `memu-py` is not installed or env vars are not set.

### How memU context flows through the system

1. **Session end**: `store_session()` saves structured data to local JSON, then feeds the raw conversation to `memU.memorize_conversation()`
2. **Session start**: `get_caller_memory()` loads local structured data, then calls `memU.retrieve()` — result is added as `memory["memu_supplementary"]`
3. **LLM prompts**: `_structured_memory()` helper in `llm_service.py` strips `memu_supplementary` from the structured data dump. Volunteer-facing prompts (briefing, suggestions) append it as a labeled "Additional context from semantic memory" section. Caller AI prompts never see it.
4. **Failure handling**: Every memU call is try/except. If memU is down, the app works identically to pure local mode.

memU SDK reference:
- GitHub: https://github.com/NevaMind-AI/memU
- PyPI: https://pypi.org/project/memu-py/
- Cloud: `MemuClient(api_key=...)` — `memorize_conversation()`, `retrieve()`
- Self-hosted: `MemUService(llm_profiles={...})` — `memorize()`, `retrieve()`
- Three-layer architecture: Resource (raw) → Item (facts) → Category (markdown files)
- Retrieval modes: `method="rag"` (fast) or `method="llm"` (deep semantic)

---

## Deep Dive: Hybrid Memory Implementation & memU Feedback

This section provides a detailed technical walkthrough of how Crisis Memory Bridge processes, stores, and retrieves memory — what the local system handles, what memU handles, and where the gaps are. It is written to serve as implementation documentation and as constructive feedback for the memU team.

### The Memory Problem in Handoff Systems

Crisis counseling handoffs require a specific kind of memory that general-purpose memory frameworks are not currently designed for. The core requirements are:

1. **Domain-specific schema enforcement** — We need triggers, risk levels, safety plans, and warnings extracted into precise, predictable categories. Not "facts and preferences."
2. **Cross-session temporal diffs** — The most critical information for a new volunteer is not "everything about this caller" but "what changed since last time." NEW triggers, ESCALATED risk, newly WORKED strategies.
3. **Auditability** — In clinical/crisis contexts, it must be possible to inspect exactly what was stored about a person. Opaque auto-categorization is a liability.
4. **Session-boundary awareness** — Memory must be organized by session. Which volunteer heard what, in which session, and what was the risk level at that time. The session is the fundamental unit, not the individual fact.
5. **Selective disclosure** — Different consumers need different slices of memory. The volunteer briefing should include supplementary context. The simulated caller AI should not see what a semantic search engine retrieved about them.

### What Local Memory Handles (and Why)

The `LocalMemoryStore` is the primary system. It handles everything that requires structure, predictability, and inspectability.

#### Structured Extraction (Claude LLM → Local JSON)

When a session ends, `llm_service.py:extract_memories()` sends the full conversation to Claude with a precise JSON schema:

```python
{
    "triggers": ["emotional triggers identified"],
    "effective_strategies": ["counseling techniques that worked"],
    "safety_plan": ["agreed-upon safety steps"],
    "situation": {
        "description": "summary of current life situation",
        "key_events": ["significant events mentioned"]
    },
    "warnings": ["critical things any future volunteer MUST know"],
    "session_summary": "2-3 sentence summary",
    "risk_level": "low | moderate | high"
}
```

This schema is **domain-specific by design**. It was built for crisis counseling — `warnings` captures things like "do not mention Yumi by name" or "avoids discussing family." `risk_level` is a controlled enum that maps directly to UI color coding and escalation logic. `effective_strategies` captures what the volunteer tried that actually worked, not just what was discussed.

The extracted JSON is stored as individual category files on disk:

```
data/caller-001/
├── triggers.json              # ["Job loss", "Breakup with Yumi", "Insomnia"]
├── effective_strategies.json   # ["Active listening", "Breathing exercises"]
├── safety_plan.json           # ["Call Mika if feeling overwhelmed", "Walk Max in the park"]
├── situation.json             # {"description": "...", "key_events": [...]}
├── warnings.json              # ["Sensitive about Yumi", "Do not push on family topics"]
└── sessions/
    ├── session_001.json       # Full session record with conversation + extracted data
    └── session_002.json
```

Each category file is **merged across sessions** — lists are deduplicated (`set` union), dicts are shallow-merged. This means `triggers.json` accumulates all triggers ever identified across all sessions. The session files preserve the per-session snapshot for timeline reconstruction.

#### Cross-Session Diffs (Local Computation)

`LocalMemoryStore.get_timeline()` reads all session JSONs chronologically and computes what changed between each pair:

```python
# For each session, compared against all prior sessions:
new_info = curr_triggers - prev_triggers          # Triggers not seen before
escalations = curr_risk > prev_risk               # Risk level went up
new_strategies = curr_strategies - prev_strategies # New things that worked
```

This powers the "CHANGES SINCE LAST SESSION" block that appears when a returning caller connects. The volunteer sees color-coded items: RED for escalations, YELLOW for new triggers, GREEN for new strategies. This is the single most valuable piece of information for a handoff — it answers "what's different now?" without requiring the volunteer to read the full history.

#### Briefing Generation (Claude LLM from Local Data)

`llm_service.py:generate_briefing()` takes the full local memory dict (all category files + session history) and generates a plain-text clinical briefing:

```
RETURNING CALLER — 2 previous session(s)
Risk Level: moderate

WARNINGS
- Sensitive about ex-partner Yumi
- Do not push on family topics early

SITUATION
- Lost job as graphic designer 2 weeks ago
- Breakup with partner Yumi about a month ago
- Has dog Max and friend Mika as support

WHAT WORKS
- Active listening and validation
- Breathing exercises helped slightly
- Talking about Max (dog) as grounding

SAFETY PLAN
- Call Mika if feeling overwhelmed
- Walk Max in the park for fresh air

LAST SESSION
Takeshi opened up about insomnia and feeling hopeless after job loss...
```

This briefing is deterministic and structured because the input data is structured. The LLM's job is formatting and summarization, not extraction — the hard work was already done.

### What memU Handles (and Why It's Supplementary)

memU enters the pipeline at two points:

#### 1. Ingestion: `memorize_conversation()` on Session End

After `store_session()` writes structured data locally, `HybridMemoryStore._store_to_memu()` feeds the **raw conversation** to memU:

```python
# Conversation is reformatted to memU's expected shape
formatted = [
    {"role": "user", "content": {"text": msg["content"]}, "created_at": "..."}
    for msg in conversation
]

# Cloud API
self._memu_client.memorize_conversation(
    conversation=formatted,
    user_name=caller_id,
    agent_name=volunteer_name,
    user_id=caller_id,
    agent_id=f"volunteer_{volunteer_name}",
)
```

memU receives the full conversation and runs its own extraction through its three-layer pipeline:
- **Resource layer**: Stores the raw conversation
- **Item layer**: Extracts facts, preferences, and patterns automatically
- **Category layer**: Auto-organizes items into topic groupings

Critically, **we do not control what memU extracts**. It may pick up things our structured schema missed — personal details ("mentioned his mother's birthday is next week"), emotional patterns ("uses humor as a deflection mechanism"), or contextual nuances ("seems more comfortable talking about work than relationships"). These are the details that don't fit neatly into `triggers.json` or `safety_plan.json` but might still matter for the next volunteer.

#### 2. Retrieval: `retrieve()` on Session Start

When a returning caller connects, `HybridMemoryStore._query_memu()` sends a semantic query:

```python
query = (
    f"Get all known information about caller {caller_id}: "
    "triggers, effective strategies, safety plan, warnings, situation, "
    "emotional patterns, and anything else relevant for a counselor."
)

# Cloud API
result = self._memu_client.retrieve(query=query, user_id=caller_id)
```

The result — an unstructured text blob — is added to the memory dict as `memory["memu_supplementary"]`.

#### 3. Prompt Integration: Labeled Supplementary Section

In `llm_service.py`, a helper function `_structured_memory()` strips `memu_supplementary` from the dict before JSON-dumping it into prompts. This ensures the structured data is always clean. The memU context is then appended as a separate, clearly labeled section only in volunteer-facing prompts:

```python
# In generate_briefing():
prompt = f"""...
Caller memories:
{json.dumps(_structured_memory(caller_memory), ...)}"""

memu_context = caller_memory.get("memu_supplementary")
if memu_context:
    prompt += f"""

Additional context from semantic memory (may contain details not in structured data above):
{memu_context}"""
```

**The caller AI never sees memU context.** This is a deliberate design decision — the simulated caller should only behave based on their backstory and what happened in structured sessions. Including semantic retrieval results in the caller prompt could cause the AI to "know" things it shouldn't or behave inconsistently.

### What We Built That memU Could Not Provide

The following capabilities were built entirely in our application layer because memU's current architecture does not support them. Each represents an opportunity for memU to expand its value for handoff-oriented use cases.

#### 1. Domain-Specific Extraction Schemas

**What we needed**: Extract conversation data into a precise, predefined schema — `triggers`, `risk_level`, `safety_plan`, `warnings`, `effective_strategies`, `situation`. These categories are specific to crisis counseling. The values must be predictable (e.g., `risk_level` must be one of `low | moderate | high` because the UI maps these to CSS colors and the escalation logic does ordinal comparison).

**What memU provides**: Generic fact extraction through its Item layer. memU automatically identifies "facts, preferences, and skills" from conversations. This is useful for general-purpose assistants but insufficient for domain applications where the schema is the contract between the backend and every downstream consumer (UI rendering, risk logic, briefing generation, timeline diffs).

**What would help**: A `schema` parameter on `memorize_conversation()` that lets the caller define extraction categories and value constraints. Something like:

```python
client.memorize_conversation(
    conversation=formatted,
    user_id=caller_id,
    extraction_schema={
        "triggers": {"type": "list", "description": "Emotional triggers identified"},
        "risk_level": {"type": "enum", "values": ["low", "moderate", "high"]},
        "safety_plan": {"type": "list", "description": "Agreed safety steps"},
        # ...
    }
)
```

This would let memU replace our Claude extraction call entirely — one fewer LLM call, one fewer point of failure, and the extraction would be integrated with memU's own storage and retrieval.

#### 2. Cross-Session Temporal Diffs

**What we needed**: When a caller returns, the volunteer needs to know what changed since last time — not the full history. Our `get_timeline()` computes set differences between consecutive sessions: new triggers, risk escalations, new strategies. The "CHANGES SINCE LAST SESSION" block is the most impactful piece of the handoff UI.

**What memU provides**: No concept of temporal change detection. `retrieve()` returns the best-matching memories for a query, but cannot answer "what is new since the last time I asked?" or "how has this user's profile changed over the last N interactions?"

**What would help**: A diff-aware retrieval mode. Something like:

```python
# Return only memories that are new or changed since a given timestamp or session
result = client.retrieve(
    query="What's new about this caller?",
    user_id=caller_id,
    since="2026-02-07T10:30:00",  # or since_session_id="..."
)
```

Or a built-in `diff()` method:

```python
diff = client.diff(
    user_id=caller_id,
    between=["session_001", "session_002"],  # or between timestamps
)
# Returns: {"new_items": [...], "changed_items": [...], "resolved_items": [...]}
```

This would be transformative for any handoff use case — crisis counseling, nursing shifts, caseworker rotations, customer support escalations. The pattern is universal: "I'm taking over from someone else. What's different now?"

#### 3. Session-Boundary Organization

**What we needed**: Memory organized by session. Each session has a volunteer name, a date, a risk level, a conversation, and extracted data. The timeline UI renders session nodes. The replay feature plays back individual sessions. The analytics charts plot risk-per-session. The session is the atomic unit of our data model.

**What memU provides**: Memory organized by the three-layer hierarchy (Resource → Item → Category). There is no concept of a "session" as a grouping boundary. A conversation fed to `memorize_conversation()` gets decomposed into Items and Categories, but the session boundary is lost. You cannot ask memU "what happened in session 2?" or "list all sessions for this user."

**What would help**: Session-level metadata and grouping. Something like:

```python
client.memorize_conversation(
    conversation=formatted,
    user_id=caller_id,
    session_id="session_002",
    session_metadata={
        "volunteer": "Volunteer B",
        "date": "2026-02-07T14:00:00",
        "risk_level": "moderate",
    }
)

# Later:
sessions = client.list_sessions(user_id=caller_id)
session_detail = client.get_session(user_id=caller_id, session_id="session_002")
```

This would let memU serve as the single source of truth for both memory content and session structure, eliminating the need for our parallel local storage of session metadata.

#### 4. Structured Retrieval (Typed Queries)

**What we needed**: The briefing generator needs triggers as a list, risk_level as a string enum, safety_plan as a list. The timeline renderer needs per-session risk levels as ordinal values. The UI renders triggers with specific styling, warnings with danger-colored badges. Every consumer expects a specific data shape.

**What memU provides**: `retrieve()` returns an unstructured text blob — a natural language summary of relevant memories. This is useful as supplementary context (which is how we use it), but cannot serve as the primary data source for applications that need structured output.

**What would help**: Structured retrieval that returns typed data matching a schema:

```python
result = client.retrieve(
    query="What are the caller's known triggers?",
    user_id=caller_id,
    response_schema={"triggers": {"type": "list[str]"}},
)
# Returns: {"triggers": ["Job loss", "Breakup with Yumi", "Insomnia"]}
```

Or category-level retrieval:

```python
# Retrieve all Items in a specific Category
triggers = client.get_category(user_id=caller_id, category="triggers")
```

This would let domain applications consume memU output directly without post-processing LLM calls.

#### 5. Auditability and Inspectability

**What we needed**: For a system dealing with vulnerable people in crisis, it must be possible to inspect exactly what is stored about someone. A supervisor should be able to open `data/caller-001/triggers.json` and see exactly what the system knows. If something is wrong, it should be correctable. If a caller requests deletion, it should be verifiable.

**What memU provides**: Auto-categorization through the three-layer hierarchy. The system decides what to extract and how to organize it. The Category layer produces markdown files, which are somewhat inspectable, but the extraction decisions are opaque — there is no way to audit why certain facts were extracted and others weren't, or to override a categorization.

**What would help**: An inspection API and correction mechanism:

```python
# View all extracted Items for a user
items = client.list_items(user_id=caller_id)
# [{"id": "item_001", "content": "Lost job as graphic designer", "category": "situation", "source_session": "session_001"}, ...]

# Delete a specific Item (right to be forgotten, correction)
client.delete_item(user_id=caller_id, item_id="item_001")

# Override a categorization
client.update_item(user_id=caller_id, item_id="item_002", category="warning")
```

For healthcare, crisis counseling, legal, and social services applications, auditability is not optional — it is a regulatory requirement in many jurisdictions. A memory system that cannot explain what it stored and why will face adoption barriers in the domains that need it most.

#### 6. Selective Memory Disclosure (Access Control)

**What we needed**: Different consumers of memory need different views. The volunteer briefing should include everything relevant. The caller AI should only see structured session history (not semantic retrieval results). A supervisor should see aggregate risk trends. A caller exercising data access rights should see a sanitized view.

**What memU provides**: A single `retrieve()` endpoint that returns everything matching a query. There is no concept of access control, role-based views, or selective disclosure.

**What would help**: Role-aware retrieval:

```python
# Volunteer sees everything
result = client.retrieve(query=..., user_id=caller_id, role="volunteer")

# Caller sees only non-clinical data
result = client.retrieve(query=..., user_id=caller_id, role="data_subject")

# Supervisor sees aggregate patterns, not individual conversations
result = client.retrieve(query=..., user_id=caller_id, role="supervisor")
```

#### 7. Native Async Support

**What we encountered**: The self-hosted memU path uses synchronous wrappers around async code (`asyncio.get_event_loop().run_until_complete()`). This conflicts with FastAPI's running event loop and can deadlock. The cloud `MemuClient` appears synchronous, which means it blocks the event loop during network calls.

**What would help**: Native `async`/`await` support for all SDK methods:

```python
# Instead of synchronous:
result = client.retrieve(query=..., user_id=caller_id)

# Provide async variants:
result = await client.aretrieve(query=..., user_id=caller_id)
await client.amemorize_conversation(conversation=..., user_id=caller_id)
```

Modern Python web frameworks (FastAPI, Starlette, Litestar) are async-first. A synchronous SDK forces workarounds (thread pool executors, `run_in_executor`) that add complexity and reduce performance.

### Summary: Division of Responsibility

| Capability | Who handles it | Why |
|-----------|---------------|-----|
| Structured extraction (triggers, risk, safety plan, warnings) | **Claude LLM → Local JSON** | Domain-specific schema, predictable output, directly consumable by UI and logic |
| Per-session storage with metadata | **Local JSON** | Session is the atomic unit; memU has no session concept |
| Cross-session temporal diffs | **Local computation** | Set operations on structured data; memU cannot diff |
| Timeline and replay | **Local JSON** | Requires session-boundary organization |
| Briefing generation | **Claude LLM from local data + memU supplementary** | Structured data is primary; memU catches the edges |
| Supplementary semantic context | **memU** | Auto-extracts things our schema missed; enriches briefings |
| Conversation ingestion for future retrieval | **memU** | Receives raw conversations; builds its own understanding |
| Risk escalation detection | **Local computation** | Ordinal comparison of structured risk_level values |
| Supervisor analytics | **Local JSON** | Requires per-session structured data for charting |

memU currently serves as a valuable **supplementary layer** — it catches what structured extraction misses. But for it to become the **primary memory system** for domain applications like crisis counseling, it would need: schema-aware extraction, session-boundary organization, temporal diffs, structured retrieval, auditability, and native async support.

## Known Issues & Gotchas

- **max_tokens**: Extraction calls need high max_tokens (1500-2000) or the JSON gets truncated mid-response, causing parse failures. The caller response uses 500 which is fine for 1-3 sentences.
- **JSON parsing**: The LLM sometimes wraps JSON in markdown fences despite being told not to. The code strips ``` fences before parsing. If parsing still fails, it falls back gracefully.
- **Session state**: Active sessions are stored in a Python dict (`sessions`). Server restart loses active sessions (but saved memories in `data/` persist). This is fine for a demo.
- **memu-py on Railway**: The `memu-py` package has native Rust extensions that fail to compile on Railway's Linux buildpack. The cloud mode uses `httpx` directly (no memu-py import needed), so `memu-py` is excluded from `requirements.txt`. Install it manually for local development if using self-hosted memU.

## Feature Roadmap

### Done
- [x] Core chat + AI caller simulation (Takeshi)
- [x] Real-time live context extraction in sidebar
- [x] Memory extraction and structured storage on session end
- [x] Volunteer handoff with briefing generation
- [x] Streaming responses (SSE, token-by-token)
- [x] Memory timeline visualization with diffs (new info, escalations, strategies)
- [x] memU SDK integration layer (abstract store + factory)
- [x] Hybrid memory architecture — LocalMemoryStore (structured, primary) + memU (supplementary semantic layer), with graceful fallback
- [x] Extraction overlay scrollable + clean result display
- [x] Session diff on handoff — "CHANGES SINCE LAST SESSION" block with NEW/ESCALATED/WORKED items
- [x] Pre-seeded demo data — `python seed_demo.py` populates caller-001 for instant returning caller demo
- [x] memU smoke test — `python test_memu.py` verifies integration, auto-skips if not configured
- [x] Volunteer coaching overlay — LLM scores each volunteer message (good/needs_improvement/caution) with technique name, auto-fades after 12s
- [x] Risk escalation alerts — Red banner flashes at top of chat when risk level increases mid-session, auto-dismisses after 8s
- [x] Voice input — Mic button with Web Speech API, pulsing red indicator when active, graceful fallback if unsupported
- [x] Smart forgetting — Addressed items appear faded with strikethrough in sidebar, expand on hover, warnings always stay prominent

- [x] Supervisor dashboard — Multi-caller grid at `/supervisor` with risk-colored cards, click to expand detail panel
- [x] Multi-language support & full i18n — EN/JA toggle translates the entire UI instantly (75+ keys per language), caller AI + suggestions respond in selected language, voice input switches locale, dates use locale formatting
- [x] Session replay for training — Play back any session message-by-message from supervisor dashboard with timed delays
- [x] Analytics — SVG risk trend line chart and trigger count bar chart per caller, no external dependencies
- [x] Dynamic reply suggestions — Clickable chips above input with context-aware openers for returning callers, hardcoded greetings for new callers, and LLM-generated follow-ups after each exchange. Runs in parallel with existing LLM calls.
- [x] Session timer — Elapsed MM:SS in header with tabular-nums, starts on session begin, included in export and performance summary
- [x] Emergency protocol overlay — Full-screen safety checklist triggered when risk escalates to HIGH, with numbered steps, checkboxes, emergency numbers, and acknowledgment button
- [x] Risk arc visualization — Mini SVG sparkline in sidebar tracking risk level progression within the session, color-coded dots with gridlines
- [x] Conversation export — Download transcript + context as formatted .txt file via client-side Blob, no server round-trip
- [x] Sound notifications — Web Audio API oscillator tones: two-tone alert on risk escalation, soft chime on backgrounded-tab caller message
- [x] Volunteer performance summary — Coaching stats at session end: exchange count, duration, score distribution bar, technique frequency tags
- [x] Non-blocking input after streaming — `stream_end` SSE event re-enables volunteer input immediately after caller finishes speaking; context/coaching/suggestions load asynchronously 2-4s later

**All features complete.**

## Style Guide

- **CSS**: Dark theme using CSS custom properties (var(--bg), var(--surface), etc.)
- **Colors**: bg=#0f1117, surface=#1a1d27, accent=#4f8ff7, danger=#e55c5c, warning=#e5a84f, success=#4fc78e
- **Typography**: System sans-serif, 13-15px body, uppercase section headers with letter-spacing
- **Components**: Cards with 1px borders and 8-12px border-radius, risk badges color-coded by level
- **Animations**: fadeIn (0.3s ease) on new messages and context items
