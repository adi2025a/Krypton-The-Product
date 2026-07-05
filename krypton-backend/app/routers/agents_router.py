import asyncio
import time
import uuid

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.agents.graph import run_agent_task
from app.models import AgentRunRequest, AgentTask, LLMCredentials

router = APIRouter(tags=["agents"])

AGENT_ORDER = ["MarketScanner", "SentimentAgent", "RiskAnalyzer", "OnChainAgent"]


@router.post("/api/agents/run", response_model=AgentTask)
async def run_single_agent(payload: AgentRunRequest):
    try:
        result = await run_agent_task(payload.agent_name, payload.credentials, payload.pair)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Agent error: {exc}") from exc

    return AgentTask(
        id=str(uuid.uuid4()),
        agentName=result["agentName"],
        status="completed",
        task=result["task"],
        result=result["result"],
        timestamp=time.strftime("%H:%M"),
        duration=result["duration"],
    )


@router.websocket("/ws/agents")
async def agents_live_feed(ws: WebSocket):
    """
    Protocol:
      client -> {"provider": "...", "model": "...", "api_key": "...", "pair": "BTC/USDT"}
      server -> a stream of AgentTask-shaped JSON objects, one per status
                transition (pending -> running -> completed/error), in the
                same order the frontend's mock feed originally used.
    """
    await ws.accept()
    try:
        init = await ws.receive_json()
        credentials = LLMCredentials(
            provider=init["provider"], model=init["model"], api_key=init["api_key"],
        )
        pair = init.get("pair", "BTC/USDT")

        for agent_name in AGENT_ORDER:
            task_id = str(uuid.uuid4())
            await ws.send_json({
                "id": task_id,
                "agentName": agent_name,
                "status": "running",
                "task": f"Running {agent_name}...",
                "result": None,
                "timestamp": time.strftime("%H:%M"),
                "duration": None,
            })
            try:
                result = await run_agent_task(agent_name, credentials, pair)
                await ws.send_json({
                    "id": task_id,
                    "agentName": agent_name,
                    "status": "completed",
                    "task": result["task"],
                    "result": result["result"],
                    "timestamp": time.strftime("%H:%M"),
                    "duration": result["duration"],
                })
            except Exception as exc:
                await ws.send_json({
                    "id": task_id,
                    "agentName": agent_name,
                    "status": "error",
                    "task": f"Running {agent_name}...",
                    "result": f"Agent failed: {exc}",
                    "timestamp": time.strftime("%H:%M"),
                    "duration": None,
                })
            await asyncio.sleep(0.2)  # small stagger so the UI can animate transitions

        await ws.close()
    except WebSocketDisconnect:
        return
    except Exception:
        try:
            await ws.close()
        except Exception:
            pass
