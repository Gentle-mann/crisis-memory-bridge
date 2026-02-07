import uuid
import asyncio

from dotenv import load_dotenv

load_dotenv()

import json

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

from memory_store import MemoryStore
from llm_service import LLMService

app = FastAPI(title="Crisis Memory Bridge")
memory = MemoryStore()
llm = LLMService()

# Active sessions in memory
sessions: dict = {}


class StartSessionRequest(BaseModel):
    caller_id: str
    volunteer_name: str
    language: str = "en"


class MessageRequest(BaseModel):
    session_id: str
    message: str


class EndSessionRequest(BaseModel):
    session_id: str


@app.post("/api/sessions/start")
async def start_session(req: StartSessionRequest):
    session_id = uuid.uuid4().hex[:8]

    caller_memory = memory.get_caller_memory(req.caller_id)
    briefing = None
    session_diff = None
    initial_suggestions = []
    if caller_memory:
        briefing_task = asyncio.create_task(llm.generate_briefing(caller_memory, req.language))
        opener_task = asyncio.create_task(llm.generate_opener_suggestions(caller_memory, req.language))
        briefing = await briefing_task
        initial_suggestions = await opener_task
        session_diff = memory.get_session_diff(req.caller_id)
    else:
        if req.language == "ja":
            initial_suggestions = [
                "お電話ありがとうございます。今日はどのような調子ですか？",
                "こんにちは、お話を聞かせてください。何か気になることはありますか？",
                "こんにちは。ゆっくりで大丈夫ですよ。お話を聞かせてください。",
            ]
        else:
            initial_suggestions = [
                "Hi, thanks for calling. How are you doing today?",
                "Hello, I'm here to listen. What's on your mind?",
                "Hi there. Take your time — I'm here for you.",
            ]

    # Determine initial risk level from prior sessions
    initial_risk = None
    if session_diff and session_diff.get("risk_level"):
        initial_risk = session_diff["risk_level"]

    sessions[session_id] = {
        "caller_id": req.caller_id,
        "volunteer_name": req.volunteer_name,
        "language": req.language,
        "messages": [],
        "caller_memory": caller_memory,
        "prev_risk": initial_risk,
    }

    return {
        "session_id": session_id,
        "is_returning": caller_memory is not None,
        "briefing": briefing,
        "caller_memory": caller_memory,
        "session_diff": session_diff,
        "suggestions": initial_suggestions,
    }


@app.post("/api/messages/send")
async def send_message(req: MessageRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session["messages"].append({"role": "volunteer", "content": req.message})

    caller_response = await llm.generate_caller_response(
        session["messages"], session["caller_memory"]
    )
    session["messages"].append({"role": "caller", "content": caller_response})

    live_context = await llm.extract_live_context(session["messages"], session.get("language", "en"))

    return {
        "caller_response": caller_response,
        "live_context": live_context,
    }


@app.get("/api/messages/stream")
async def stream_message(
    session_id: str = Query(...),
    message: str = Query(...),
):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session["messages"].append({"role": "volunteer", "content": message})

    async def event_generator():
        full_response = ""
        async for chunk in llm.generate_caller_response_stream(
            session["messages"], session["caller_memory"], session.get("language", "en")
        ):
            full_response += chunk
            payload = json.dumps({"type": "token", "content": chunk})
            yield f"data: {payload}\n\n"

        # Store the complete caller message in the session
        session["messages"].append({"role": "caller", "content": full_response})

        # Signal caller response complete — frontend re-enables input immediately
        stream_end_payload = json.dumps({
            "type": "stream_end",
            "caller_response": full_response,
        })
        yield f"data: {stream_end_payload}\n\n"

        # Extract live context, coaching, and suggestions in parallel
        lang = session.get("language", "en")
        live_context_task = asyncio.create_task(llm.extract_live_context(session["messages"], lang))
        coaching_task = asyncio.create_task(llm.score_volunteer_response(session["messages"], lang))
        suggestions_task = asyncio.create_task(llm.generate_reply_suggestions(session["messages"], session["caller_memory"], session.get("language", "en")))
        live_context = await live_context_task
        coaching = await coaching_task
        suggestions = await suggestions_task

        # Detect risk escalation
        risk_alert = None
        risk_order = {"low": 0, "moderate": 1, "high": 2}
        curr_risk = live_context.get("risk_level", "unknown")
        prev_risk = session.get("prev_risk")
        if prev_risk and curr_risk in risk_order and prev_risk in risk_order:
            if risk_order[curr_risk] > risk_order[prev_risk]:
                risk_alert = {"from": prev_risk, "to": curr_risk}
        if curr_risk in risk_order:
            session["prev_risk"] = curr_risk

        done_payload = json.dumps({
            "type": "done",
            "caller_response": full_response,
            "live_context": live_context,
            "coaching": coaching,
            "risk_alert": risk_alert,
            "suggestions": suggestions,
        })
        yield f"data: {done_payload}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/sessions/end")
async def end_session(req: EndSessionRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    extracted = await llm.extract_memories(session["messages"], session.get("language", "en"))

    memory.store_session(
        caller_id=session["caller_id"],
        volunteer_name=session["volunteer_name"],
        conversation=session["messages"],
        extracted_memories=extracted,
    )

    del sessions[req.session_id]

    return {"status": "ok", "extracted_memories": extracted}


@app.get("/api/callers/{caller_id}/timeline")
async def get_timeline(caller_id: str):
    timeline = memory.get_timeline(caller_id)
    if not timeline:
        raise HTTPException(status_code=404, detail="No timeline data for this caller")
    return timeline


@app.get("/api/callers")
async def list_callers():
    return {"callers": memory.list_callers()}


@app.get("/api/callers/summary")
async def callers_summary():
    """Return summary data for all callers — powers the supervisor dashboard."""
    callers = memory.list_callers()
    summaries = []
    for cid in callers:
        timeline = memory.get_timeline(cid)
        if not timeline or not timeline.get("sessions"):
            continue
        sess = timeline["sessions"]
        latest = sess[-1]
        summaries.append({
            "caller_id": cid,
            "total_sessions": len(sess),
            "risk_level": latest.get("risk_level", "unknown"),
            "last_volunteer": latest.get("volunteer", ""),
            "last_date": latest.get("date", ""),
            "last_summary": latest.get("summary", ""),
            "escalations": any(
                len(s.get("escalations", [])) > 0 for s in sess
            ),
        })
    return {"callers": summaries}


@app.get("/api/callers/{caller_id}/sessions/{session_number}")
async def get_session_detail(caller_id: str, session_number: int):
    """Return full session data including conversation for replay."""
    caller_mem = memory.get_caller_memory(caller_id)
    if not caller_mem or "sessions" not in caller_mem:
        raise HTTPException(status_code=404, detail="Caller not found")
    for sess in caller_mem["sessions"]:
        if sess.get("session_number") == session_number:
            return sess
    raise HTTPException(status_code=404, detail="Session not found")


@app.get("/api/callers/{caller_id}/analytics")
async def get_analytics(caller_id: str):
    """Return analytics data for charts."""
    timeline = memory.get_timeline(caller_id)
    if not timeline:
        raise HTTPException(status_code=404, detail="No data")
    risk_map = {"low": 1, "moderate": 2, "high": 3, "unknown": 0}
    sessions = timeline["sessions"]
    return {
        "caller_id": caller_id,
        "risk_trend": [
            {"session": s["session_number"], "risk": s["risk_level"], "risk_value": risk_map.get(s["risk_level"], 0)}
            for s in sessions
        ],
        "trigger_counts": [
            {"session": s["session_number"], "count": len(s.get("new_info", []))}
            for s in sessions
        ],
        "session_dates": [
            {"session": s["session_number"], "date": s.get("date", "")}
            for s in sessions
        ],
    }


@app.get("/supervisor")
async def supervisor():
    return FileResponse("static/supervisor.html")


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return FileResponse("static/index.html")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
