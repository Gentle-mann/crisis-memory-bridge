import json
import os
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


class BaseMemoryStore(ABC):
    """Abstract interface — swap between local JSON and memU."""

    @abstractmethod
    def get_caller_memory(self, caller_id: str) -> Optional[dict]:
        ...

    @abstractmethod
    def store_session(
        self,
        caller_id: str,
        volunteer_name: str,
        conversation: list,
        extracted_memories: dict,
    ):
        ...

    @abstractmethod
    def get_timeline(self, caller_id: str) -> Optional[dict]:
        ...

    @abstractmethod
    def list_callers(self) -> list:
        ...

    @abstractmethod
    def clear_caller(self, caller_id: str):
        ...

    def get_session_diff(self, caller_id: str) -> Optional[dict]:
        """Compute what changed in the most recent session vs prior sessions."""
        timeline = self.get_timeline(caller_id)
        if not timeline or len(timeline.get("sessions", [])) < 1:
            return None
        sessions = timeline["sessions"]
        latest = sessions[-1]
        return {
            "new_info": latest.get("new_info", []),
            "escalations": latest.get("escalations", []),
            "new_strategies": latest.get("new_strategies", []),
            "risk_level": latest.get("risk_level", "unknown"),
            "session_count": len(sessions),
        }


class LocalMemoryStore(BaseMemoryStore):
    """
    Local JSON-based memory store for development.
    Mirrors memU's tiered structure using the filesystem.
    """

    def __init__(self, data_dir: str = DATA_DIR):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)

    def _caller_dir(self, caller_id: str) -> str:
        path = os.path.join(self.data_dir, caller_id)
        os.makedirs(path, exist_ok=True)
        return path

    def get_caller_memory(self, caller_id: str) -> Optional[dict]:
        caller_dir = os.path.join(self.data_dir, caller_id)
        if not os.path.exists(caller_dir):
            return None

        memory = {}
        for item in os.listdir(caller_dir):
            filepath = os.path.join(caller_dir, item)
            if item.endswith(".json") and os.path.isfile(filepath):
                key = item.replace(".json", "")
                with open(filepath) as f:
                    memory[key] = json.load(f)
            elif os.path.isdir(filepath) and item == "sessions":
                sessions = []
                for sf in sorted(os.listdir(filepath)):
                    if sf.endswith(".json"):
                        with open(os.path.join(filepath, sf)) as f:
                            sessions.append(json.load(f))
                memory["sessions"] = sessions

        return memory if memory else None

    def store_session(
        self,
        caller_id: str,
        volunteer_name: str,
        conversation: list,
        extracted_memories: dict,
    ):
        caller_dir = self._caller_dir(caller_id)

        memory_keys = [
            "triggers",
            "effective_strategies",
            "safety_plan",
            "situation",
            "warnings",
        ]
        for key in memory_keys:
            if key not in extracted_memories:
                continue
            filepath = os.path.join(caller_dir, f"{key}.json")
            existing = None
            if os.path.exists(filepath):
                with open(filepath) as f:
                    existing = json.load(f)

            new_data = extracted_memories[key]

            if existing is None:
                merged = new_data
            elif isinstance(existing, list) and isinstance(new_data, list):
                merged = list(set(existing + new_data))
            elif isinstance(existing, dict) and isinstance(new_data, dict):
                merged = {**existing, **new_data}
            else:
                merged = new_data

            with open(filepath, "w") as f:
                json.dump(merged, f, indent=2, ensure_ascii=False)

        # Store session record with extracted data for timeline diffs
        sessions_dir = os.path.join(caller_dir, "sessions")
        os.makedirs(sessions_dir, exist_ok=True)

        session_count = len(
            [f for f in os.listdir(sessions_dir) if f.endswith(".json")]
        )
        session_data = {
            "session_number": session_count + 1,
            "volunteer": volunteer_name,
            "date": datetime.now().isoformat(),
            "summary": extracted_memories.get("session_summary", ""),
            "risk_level": extracted_memories.get("risk_level", "unknown"),
            "message_count": len(conversation),
            "conversation": conversation,
            "extracted": {
                "triggers": extracted_memories.get("triggers", []),
                "effective_strategies": extracted_memories.get(
                    "effective_strategies", []
                ),
                "safety_plan": extracted_memories.get("safety_plan", []),
                "warnings": extracted_memories.get("warnings", []),
                "situation": extracted_memories.get("situation", {}),
            },
        }

        session_file = os.path.join(
            sessions_dir, f"session_{session_count + 1:03d}.json"
        )
        with open(session_file, "w") as f:
            json.dump(session_data, f, indent=2, ensure_ascii=False)

    def get_timeline(self, caller_id: str) -> Optional[dict]:
        caller_dir = os.path.join(self.data_dir, caller_id)
        sessions_dir = os.path.join(caller_dir, "sessions")
        if not os.path.exists(sessions_dir):
            return None

        sessions = []
        for sf in sorted(os.listdir(sessions_dir)):
            if sf.endswith(".json"):
                with open(os.path.join(sessions_dir, sf)) as f:
                    sessions.append(json.load(f))

        if not sessions:
            return None

        risk_order = {"low": 0, "moderate": 1, "high": 2, "unknown": -1}
        timeline_sessions = []
        prev_triggers = set()
        prev_strategies = set()
        prev_risk = None

        for session in sessions:
            extracted = session.get("extracted", {})
            curr_triggers = set(extracted.get("triggers", []))
            curr_strategies = set(extracted.get("effective_strategies", []))
            curr_risk = session.get("risk_level", "unknown")

            # New info = new triggers + situation key events
            new_info = list(curr_triggers - prev_triggers)
            situation = extracted.get("situation", {})
            if isinstance(situation, dict):
                new_info += situation.get("key_events", [])

            # Risk escalation detection
            escalations = []
            if prev_risk:
                prev_ord = risk_order.get(prev_risk, -1)
                curr_ord = risk_order.get(curr_risk, -1)
                if curr_ord > prev_ord and prev_ord >= 0:
                    escalations.append(f"Risk {prev_risk} → {curr_risk}")

            # Resolved = strategies that are new (things that now work)
            new_strategies = list(curr_strategies - prev_strategies)

            timeline_sessions.append({
                "session_number": session.get("session_number"),
                "volunteer": session.get("volunteer"),
                "date": session.get("date"),
                "summary": session.get("summary"),
                "risk_level": curr_risk,
                "new_info": new_info,
                "escalations": escalations,
                "new_strategies": new_strategies,
                "warnings": extracted.get("warnings", []),
            })

            prev_triggers = prev_triggers | curr_triggers
            prev_strategies = prev_strategies | curr_strategies
            prev_risk = curr_risk

        return {
            "caller_id": caller_id,
            "total_sessions": len(sessions),
            "sessions": timeline_sessions,
        }

    def list_callers(self) -> list:
        if not os.path.exists(self.data_dir):
            return []
        return [
            d
            for d in os.listdir(self.data_dir)
            if os.path.isdir(os.path.join(self.data_dir, d))
        ]

    def clear_caller(self, caller_id: str):
        import shutil

        caller_dir = os.path.join(self.data_dir, caller_id)
        if os.path.exists(caller_dir):
            shutil.rmtree(caller_dir)


class MemUMemoryStore(BaseMemoryStore):
    """
    memU SDK-backed memory store for the hackathon.
    pip install memu-py (requires Python 3.13+)

    Set MEMU_API_KEY for cloud, or MEMU_LLM_API_KEY for self-hosted.
    """

    def __init__(self):
        self._client = None
        self._service = None
        # Also keep local store for timeline tracking (memU handles memory,
        # we track session metadata locally)
        self._local = LocalMemoryStore()
        self._init_backend()

    def _init_backend(self):
        api_key = os.getenv("MEMU_API_KEY")
        if api_key:
            from memu import MemuClient

            self._client = MemuClient(
                api_key=api_key,
                base_url=os.getenv("MEMU_BASE_URL", "https://api-preview.memu.so"),
            )
        else:
            from memu import MemUService

            self._service = MemUService(
                llm_profiles={
                    "default": {
                        "base_url": os.getenv(
                            "MEMU_LLM_BASE_URL", "https://api.openai.com/v1"
                        ),
                        "api_key": os.getenv("MEMU_LLM_API_KEY", ""),
                        "chat_model": os.getenv("MEMU_CHAT_MODEL", "gpt-4o"),
                        "embed_model": os.getenv(
                            "MEMU_EMBED_MODEL", "text-embedding-3-small"
                        ),
                    }
                },
                database_config={"metadata_store": {"provider": "inmemory"}},
            )

    def _format_conversation(self, conversation: list) -> list:
        formatted = []
        for msg in conversation:
            formatted.append({
                "role": "user" if msg["role"] == "caller" else "assistant",
                "content": {"text": msg["content"]},
                "created_at": datetime.now().isoformat(),
            })
        return formatted

    def get_caller_memory(self, caller_id: str) -> Optional[dict]:
        # Try memU retrieval first
        try:
            query = (
                f"Get all known information about caller {caller_id}: "
                "triggers, effective strategies, safety plan, warnings, situation."
            )
            if self._client:
                result = self._client.retrieve(query=query, user_id=caller_id)
            else:
                import asyncio

                result = asyncio.get_event_loop().run_until_complete(
                    self._service.retrieve(
                        queries=[{"role": "user", "content": {"text": query}}],
                        where={"user_id": caller_id},
                        method="llm",
                    )
                )

            if result:
                # Merge memU result with local session metadata
                local = self._local.get_caller_memory(caller_id)
                return {
                    "memu_context": result,
                    "sessions": local.get("sessions", []) if local else [],
                }
        except Exception:
            pass

        # Fall back to local store
        return self._local.get_caller_memory(caller_id)

    def store_session(
        self,
        caller_id: str,
        volunteer_name: str,
        conversation: list,
        extracted_memories: dict,
    ):
        # Store in memU
        formatted = self._format_conversation(conversation)
        try:
            if self._client:
                self._client.memorize_conversation(
                    conversation=formatted,
                    user_name=caller_id,
                    agent_name=volunteer_name,
                    user_id=caller_id,
                    agent_id=f"volunteer_{volunteer_name}",
                )
            else:
                import asyncio
                import tempfile

                with tempfile.NamedTemporaryFile(
                    mode="w", suffix=".json", delete=False
                ) as f:
                    json.dump(formatted, f)
                    temp_path = f.name

                asyncio.get_event_loop().run_until_complete(
                    self._service.memorize(
                        resource_url=temp_path,
                        modality="conversation",
                        user={"user_id": caller_id},
                    )
                )
                os.unlink(temp_path)
        except Exception:
            pass

        # Always store locally too (for timeline tracking)
        self._local.store_session(
            caller_id, volunteer_name, conversation, extracted_memories
        )

    def get_timeline(self, caller_id: str) -> Optional[dict]:
        return self._local.get_timeline(caller_id)

    def list_callers(self) -> list:
        return self._local.list_callers()

    def clear_caller(self, caller_id: str):
        self._local.clear_caller(caller_id)


class HybridMemoryStore(BaseMemoryStore):
    """
    Hybrid memory store: LocalMemoryStore for structured data,
    memU as supplementary semantic retrieval layer.

    - get_caller_memory() returns the same dict shape as LocalMemoryStore
      plus an optional 'memu_supplementary' key with memU's semantic context.
    - store_session() writes to local first, then feeds raw conversation to memU.
    - All other methods delegate to LocalMemoryStore.
    """

    def __init__(self):
        self._local = LocalMemoryStore()
        self._mode = None  # "cloud" or "self_hosted" or None
        self._cloud_api_key = None
        self._cloud_base_url = None
        self._service = None
        self._init_memu()

    def _init_memu(self):
        try:
            api_key = os.getenv("MEMU_API_KEY")
            if api_key:
                # Cloud mode — use REST API directly (v3 endpoints)
                import httpx  # already a dependency of memu-py

                self._mode = "cloud"
                self._cloud_api_key = api_key
                self._cloud_base_url = os.getenv(
                    "MEMU_BASE_URL", "https://api.memu.so"
                )
                print(f"memU: cloud mode ({self._cloud_base_url})")
            else:
                llm_key = os.getenv("MEMU_LLM_API_KEY")
                if llm_key:
                    # Self-hosted mode — use MemoryService from SDK
                    from memu.app.service import MemoryService

                    self._service = MemoryService(
                        llm_profiles={
                            "default": {
                                "base_url": os.getenv(
                                    "MEMU_LLM_BASE_URL",
                                    "https://api.openai.com/v1",
                                ),
                                "api_key": llm_key,
                                "chat_model": os.getenv(
                                    "MEMU_CHAT_MODEL", "gpt-4o"
                                ),
                                "embed_model": os.getenv(
                                    "MEMU_EMBED_MODEL",
                                    "text-embedding-3-small",
                                ),
                            }
                        },
                        database_config={
                            "metadata_store": {"provider": "inmemory"}
                        },
                    )
                    self._mode = "self_hosted"
                    print("memU: self-hosted mode")
        except Exception as e:
            print(
                f"WARNING: memU init failed ({e}), running without semantic layer"
            )
            self._mode = None

    @property
    def _memu_available(self) -> bool:
        return self._mode is not None

    def _query_memu(self, caller_id: str) -> Optional[str]:
        if not self._memu_available:
            return None
        try:
            query = (
                f"Get all known information about caller {caller_id}: "
                "triggers, effective strategies, safety plan, warnings, situation, "
                "emotional patterns, and anything else relevant for a counselor."
            )
            if self._mode == "cloud":
                import httpx

                resp = httpx.post(
                    f"{self._cloud_base_url}/api/v3/memory/retrieve",
                    headers={
                        "Authorization": f"Bearer {self._cloud_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "user_id": caller_id,
                        "agent_id": "crisis-memory-bridge",
                        "query": query,
                    },
                    timeout=30.0,
                )
                resp.raise_for_status()
                data = resp.json()
                # Build a readable summary from memU's structured response
                return self._format_memu_response(data)
            else:
                result = self._service.retrieve(
                    queries=[
                        {"role": "user", "content": {"text": query}}
                    ],
                    where={"user_id": caller_id},
                )
                if isinstance(result, dict):
                    return self._format_memu_response(result)
                return str(result) if result else None
        except Exception as e:
            print(f"WARNING: memU retrieval failed ({e}), continuing without")
            return None

    def _format_memu_response(self, data: dict) -> Optional[str]:
        """Format memU retrieval response into readable context for LLM prompts."""
        if not data:
            return None
        parts = []
        # Items: extracted facts and profiles
        items = data.get("items", [])
        if items:
            facts = [item.get("content", "") for item in items if item.get("content")]
            if facts:
                parts.append("Key facts: " + "; ".join(facts))
        # Categories: topic summaries
        categories = data.get("categories", [])
        for cat in categories:
            summary = cat.get("summary", "")
            if summary:
                parts.append(summary)
        # Resources: conversation captions
        resources = data.get("resources", [])
        for res in resources:
            caption = res.get("caption", "")
            if caption:
                parts.append(f"Session note: {caption}")
        return "\n".join(parts) if parts else None

    def _store_to_memu(
        self, caller_id: str, volunteer_name: str, conversation: list
    ):
        if not self._memu_available:
            return
        try:
            formatted = []
            for msg in conversation:
                formatted.append({
                    "role": "user" if msg["role"] == "caller" else "assistant",
                    "content": msg["content"],
                })

            if self._mode == "cloud":
                import httpx

                resp = httpx.post(
                    f"{self._cloud_base_url}/api/v3/memory/memorize",
                    headers={
                        "Authorization": f"Bearer {self._cloud_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "user_id": caller_id,
                        "agent_id": f"volunteer_{volunteer_name}",
                        "conversation": formatted,
                    },
                    timeout=60.0,
                )
                resp.raise_for_status()
                result = resp.json()
                task_id = result.get("task_id", "unknown")
                print(f"memU: memorize task {task_id} ({result.get('status', '')})")
            else:
                import tempfile

                memu_formatted = []
                for msg in conversation:
                    memu_formatted.append({
                        "role": "user" if msg["role"] == "caller" else "assistant",
                        "content": {"text": msg["content"]},
                        "created_at": datetime.now().isoformat(),
                    })

                with tempfile.NamedTemporaryFile(
                    mode="w", suffix=".json", delete=False
                ) as f:
                    json.dump(memu_formatted, f)
                    temp_path = f.name

                self._service.memorize(
                    resource_url=temp_path,
                    modality="conversation",
                    user={"user_id": caller_id},
                )
                os.unlink(temp_path)
        except Exception as e:
            print(
                f"WARNING: memU store failed ({e}), structured data saved locally"
            )

    def get_caller_memory(self, caller_id: str) -> Optional[dict]:
        memory = self._local.get_caller_memory(caller_id)
        if memory is None:
            return None

        memu_result = self._query_memu(caller_id)
        if memu_result:
            memory["memu_supplementary"] = memu_result

        return memory

    def store_session(
        self,
        caller_id: str,
        volunteer_name: str,
        conversation: list,
        extracted_memories: dict,
    ):
        self._local.store_session(
            caller_id, volunteer_name, conversation, extracted_memories
        )
        self._store_to_memu(caller_id, volunteer_name, conversation)

    def get_timeline(self, caller_id: str) -> Optional[dict]:
        return self._local.get_timeline(caller_id)

    def list_callers(self) -> list:
        return self._local.list_callers()

    def clear_caller(self, caller_id: str):
        self._local.clear_caller(caller_id)


def create_memory_store() -> BaseMemoryStore:
    """Factory: returns hybrid store (local + memU) if configured, otherwise local JSON."""
    if os.getenv("MEMU_API_KEY") or os.getenv("MEMU_LLM_API_KEY"):
        try:
            return HybridMemoryStore()
        except ImportError:
            print("memu-py not installed, falling back to local store")
    return LocalMemoryStore()


# Default export — used by app.py
MemoryStore = create_memory_store
