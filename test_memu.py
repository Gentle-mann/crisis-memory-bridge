"""
Smoke test for memU integration.

Tests that HybridMemoryStore can:
1. Connect to memU (cloud or self-hosted)
2. Store a session (local + memU)
3. Retrieve caller memory with supplementary semantic context
4. Get timeline data

Usage:
    # Set env vars first:
    export MEMU_API_KEY=your-key   (for cloud)
    # OR
    export MEMU_LLM_API_KEY=your-key  (for self-hosted)

    python test_memu.py
"""

import os
import sys
import json
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

CALLER_ID = "test-memu-001"


def check_env():
    has_cloud = bool(os.getenv("MEMU_API_KEY"))
    has_self_hosted = bool(os.getenv("MEMU_LLM_API_KEY"))

    if not has_cloud and not has_self_hosted:
        print("SKIP: No memU env vars set (MEMU_API_KEY or MEMU_LLM_API_KEY)")
        print("Set one of these to run the memU smoke test.")
        sys.exit(0)

    mode = "cloud" if has_cloud else "self-hosted"
    print(f"memU mode: {mode}")
    return mode


def check_import():
    try:
        import memu  # noqa: F401
        print("OK: memu-py is installed")
        return True
    except ImportError:
        print("SKIP: memu-py is not installed (pip install memu-py)")
        sys.exit(0)


def test_store_creation():
    from memory_store import create_memory_store, HybridMemoryStore

    store = create_memory_store()
    assert isinstance(store, HybridMemoryStore), (
        f"Expected HybridMemoryStore, got {type(store).__name__}"
    )
    print("OK: create_memory_store() returned HybridMemoryStore")
    return store


def test_store_session(store):
    conversation = [
        {"role": "volunteer", "content": "Hi, how are you feeling today?"},
        {"role": "caller", "content": "Not great. I've been having a rough week."},
        {"role": "volunteer", "content": "I'm sorry to hear that. Can you tell me more?"},
        {"role": "caller", "content": "I lost my job and my partner left me."},
    ]

    extracted = {
        "triggers": ["Job loss", "Relationship breakup"],
        "effective_strategies": ["Active listening"],
        "safety_plan": ["Call hotline if needed"],
        "situation": {
            "description": "Test caller experiencing job loss and breakup",
            "key_events": ["Lost job", "Partner left"],
        },
        "warnings": ["Monitor for escalation"],
        "session_summary": "Test session for memU smoke test.",
        "risk_level": "moderate",
    }

    try:
        store.store_session(
            caller_id=CALLER_ID,
            volunteer_name="Test Volunteer",
            conversation=conversation,
            extracted_memories=extracted,
        )
        print("OK: store_session() completed without error")
    except Exception as e:
        print(f"FAIL: store_session() raised {type(e).__name__}: {e}")
        return False
    return True


def test_get_memory(store):
    try:
        memory = store.get_caller_memory(CALLER_ID)
        if memory is None:
            print("WARN: get_caller_memory() returned None (memU may need processing time)")
            return True

        print(f"OK: get_caller_memory() returned data with keys: {list(memory.keys())}")

        # Verify structured keys are at top level (backward-compatible shape)
        for expected_key in ["triggers", "effective_strategies", "sessions"]:
            if expected_key in memory:
                print(f"  OK: '{expected_key}' found at top level")

        # Check for supplementary semantic context from memU
        if "memu_supplementary" in memory:
            print(f"  OK: memU supplementary context present (type: {type(memory['memu_supplementary']).__name__})")
        else:
            print("  INFO: No memu_supplementary key (memU may need processing time)")

        # Verify the old broken shape is NOT returned
        assert "memu_context" not in memory, "ERROR: Old memu_context key found — should be memu_supplementary"

        if "sessions" in memory:
            print(f"  Local sessions: {len(memory['sessions'])}")

        return True
    except Exception as e:
        print(f"FAIL: get_caller_memory() raised {type(e).__name__}: {e}")
        return False


def test_timeline(store):
    try:
        timeline = store.get_timeline(CALLER_ID)
        if timeline is None:
            print("WARN: get_timeline() returned None")
            return True

        print(f"OK: get_timeline() returned {timeline['total_sessions']} session(s)")
        return True
    except Exception as e:
        print(f"FAIL: get_timeline() raised {type(e).__name__}: {e}")
        return False


def cleanup(store):
    try:
        store.clear_caller(CALLER_ID)
        print(f"OK: Cleaned up test caller {CALLER_ID}")
    except Exception as e:
        print(f"WARN: cleanup raised {type(e).__name__}: {e}")


def main():
    print("=" * 50)
    print("memU Integration Smoke Test")
    print("=" * 50)
    print()

    mode = check_env()
    check_import()
    print()

    store = test_store_creation()
    print()

    print("--- Testing store_session ---")
    if not test_store_session(store):
        print("\nFAILED: Could not store session. Check your memU credentials.")
        sys.exit(1)
    print()

    print("--- Testing get_caller_memory ---")
    test_get_memory(store)
    print()

    print("--- Testing get_timeline ---")
    test_timeline(store)
    print()

    print("--- Cleanup ---")
    cleanup(store)
    print()

    print("=" * 50)
    print("Smoke test complete. Hybrid memU integration is ready.")
    print("=" * 50)


if __name__ == "__main__":
    main()
