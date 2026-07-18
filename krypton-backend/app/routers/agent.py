import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.security import get_current_user_id
from app.schemas.agent import ChatRequest, AgentResponse
from app.services.agent_service import run_trading_assistant

router = APIRouter()


@router.post("/chat", response_model=AgentResponse)
async def chat_with_agent(
    payload: ChatRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    The chatbot in the popup. user_question is set -> synthesis_node
    answers that specific question using gathered market/sentiment/risk
    context, instead of giving a generic overview.
    """
    result = await run_trading_assistant(db, user_id, user_question=payload.message)
    return AgentResponse(**result)


@router.post("/strategy", response_model=AgentResponse)
async def get_strategy(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    The "Strategy" button. No user_question -> synthesis_node produces
    a general strategic read on the current symbol instead of answering
    a specific question. Same graph, same data gathering, different
    final instruction to the LLM.
    """
    result = await run_trading_assistant(db, user_id, user_question=None)
    return AgentResponse(**result)