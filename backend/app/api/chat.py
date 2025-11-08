"""API endpoints for chat functionality."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import AsyncIterator
from app.core.database import get_db
from app.schemas.pydantic_models import ChatRequest, ChatResponse, ChatMessage
from app.services.agent_service import AgentService
from app.services.langgraph_executor import LangGraphExecutor
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

router = APIRouter(prefix="/chat", tags=["chat"])


def _convert_messages(messages: list[ChatMessage]) -> list:
    """Convert Pydantic messages to LangChain messages."""
    langchain_messages = []
    for msg in messages:
        if msg.role == "user":
            langchain_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            langchain_messages.append(AIMessage(content=msg.content))
        elif msg.role == "system":
            langchain_messages.append(SystemMessage(content=msg.content))
    return langchain_messages


@router.post("/", response_model=ChatResponse)
async def chat(chat_request: ChatRequest, db: Session = Depends(get_db)):
    """Chat with an agent."""
    # Get agent
    agent = AgentService.get_agent(db, chat_request.agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID {chat_request.agent_id} not found"
        )
    
    if not agent.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent '{agent.name}' is not active"
        )
    
    # Convert messages
    messages = _convert_messages(chat_request.messages)
    
    # Execute agent
    executor = LangGraphExecutor(db)
    response_text = await executor.execute_async(agent, messages)
    
    return ChatResponse(response=response_text, agent_id=agent.id)


@router.post("/stream")
async def chat_stream(chat_request: ChatRequest, db: Session = Depends(get_db)):
    """Chat with an agent (streaming response)."""
    try:
        # Get agent
        agent = AgentService.get_agent(db, chat_request.agent_id)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent with ID {chat_request.agent_id} not found"
            )
        
        if not agent.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agent '{agent.name}' is not active"
            )
        
        # Convert messages
        messages = _convert_messages(chat_request.messages)
        
        # Execute agent with streaming
        executor = LangGraphExecutor(db)
        
        async def generate() -> AsyncIterator[str]:
            try:
                async for chunk in executor.execute(agent, messages, stream=True):
                    if chunk:  # Only yield non-empty chunks
                        yield f"data: {chunk}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                error_msg = f"Error: {str(e)}"
                yield f"data: {error_msg}\n\n"
                yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

