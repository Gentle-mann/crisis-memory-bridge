"""
Pre-seed demo data for caller-001.

Run this to create a realistic first session so the demo can start
with a returning caller handoff instead of from scratch.

Usage:
    python seed_demo.py
"""

import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "caller-001")
SESSIONS_DIR = os.path.join(DATA_DIR, "sessions")


def seed():
    os.makedirs(SESSIONS_DIR, exist_ok=True)

    triggers = [
        "Mention of partner Yumi",
        "Job loss and financial pressure",
        "Feelings of being a burden",
        "Loneliness at night (insomnia)",
        "Skipping meals due to low motivation",
    ]

    strategies = [
        "Breathing exercises (4-7-8 technique)",
        "Walking Max in the park near apartment",
        "Texting friend Mika when feeling low",
        "Active listening and validation from volunteer",
    ]

    safety_plan = [
        "Call hotline if dark thoughts intensify",
        "Reach out to Mika before isolating",
        "Walk Max daily for routine and fresh air",
        "Keep emergency contact list on fridge",
    ]

    situation = {
        "description": (
            "34-year-old male, recently separated from partner Yumi (~1 month ago). "
            "Lost job as graphic designer 2 weeks ago. Living alone with dog Max. "
            "Experiencing severe insomnia, skipping meals, and increasing hopelessness. "
            "Has support from friend Mika who checks in regularly."
        ),
        "key_events": [
            "Partner Yumi left about a month ago",
            "Lost graphic design job 2 weeks ago",
            "Severe insomnia for multiple weeks",
            "Has been skipping meals",
        ],
    }

    warnings = [
        "Reports dark thoughts but denies active suicidal ideation",
        "Avoid pushing for details about Yumi too early",
        "Self-worth tied to employment — be careful with job-search pressure",
        "May minimize severity — watch for underreporting",
    ]

    session = {
        "session_number": 1,
        "volunteer": "Volunteer A",
        "date": "2026-02-05T14:30:00",
        "summary": (
            "Takeshi called in feeling overwhelmed after losing his job two weeks ago, "
            "compounded by his partner Yumi leaving a month prior. He opened up gradually "
            "about his insomnia, skipped meals, and dark thoughts. Breathing exercises "
            "helped him feel slightly calmer. He agreed to walk Max daily and text Mika "
            "when feeling low."
        ),
        "risk_level": "moderate",
        "message_count": 12,
        "extracted": {
            "triggers": triggers,
            "effective_strategies": strategies,
            "safety_plan": safety_plan,
            "warnings": warnings,
            "situation": {
                "description": "34-year-old male, recently separated from partner Yumi. "
                "Lost job as graphic designer. Living alone with dog Max.",
                "key_events": situation["key_events"],
            },
        },
    }

    files = {
        "triggers.json": triggers,
        "effective_strategies.json": strategies,
        "safety_plan.json": safety_plan,
        "situation.json": situation,
        "warnings.json": warnings,
    }

    for filename, data in files.items():
        with open(os.path.join(DATA_DIR, filename), "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    with open(os.path.join(SESSIONS_DIR, "session_001.json"), "w") as f:
        json.dump(session, f, indent=2, ensure_ascii=False)

    print(f"Seeded demo data for caller-001 in {DATA_DIR}")
    print("  - triggers.json")
    print("  - effective_strategies.json")
    print("  - safety_plan.json")
    print("  - situation.json")
    print("  - warnings.json")
    print("  - sessions/session_001.json")
    print()
    print('Start a session with caller ID "caller-001" to see the returning caller flow.')


if __name__ == "__main__":
    seed()
