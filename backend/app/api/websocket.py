"""WebSocket endpoints for real-time chat."""
import json
from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.agent_service import AgentService
from app.services.langgraph_executor import LangGraphExecutor
from app.schemas.pydantic_models import ChatMessage
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage


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


async def websocket_endpoint(websocket: WebSocket, db: Session):
    """WebSocket endpoint for real-time chat streaming."""
    await websocket.accept()
    
    try:
        # Wait for initial message with agent_id and messages
        data = await websocket.receive_text()
        request = json.loads(data)
        
        agent_id = request.get("agent_id")
        messages_data = request.get("messages", [])
        stream = request.get("stream", True)
        
        if not agent_id:
            await websocket.send_json({
                "type": "error",
                "message": "agent_id is required"
            })
            await websocket.close()
            return
        
        # Get agent
        agent = AgentService.get_agent(db, agent_id)
        if not agent:
            await websocket.send_json({
                "type": "error",
                "message": f"Agent with ID {agent_id} not found"
            })
            await websocket.close()
            return
        
        if not agent.is_active:
            await websocket.send_json({
                "type": "error",
                "message": f"Agent '{agent.name}' is not active"
            })
            await websocket.close()
            return
        
        # Convert messages_data (list of dicts) to ChatMessage objects, then to LangChain messages
        from app.schemas.pydantic_models import ChatMessage
        
        chat_messages = []
        for msg_dict in messages_data:
            # Handle both dict format and ChatMessage format
            if isinstance(msg_dict, dict):
                # Ensure it has required fields
                if "role" in msg_dict and "content" in msg_dict:
                    chat_messages.append(ChatMessage(role=msg_dict["role"], content=msg_dict["content"]))
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Invalid message format: missing 'role' or 'content'"
                    })
                    await websocket.close()
                    return
            elif hasattr(msg_dict, "role") and hasattr(msg_dict, "content"):
                # Already a ChatMessage-like object
                chat_messages.append(msg_dict)
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Invalid message format"
                })
                await websocket.close()
                return
        
        # Convert to LangChain messages
        messages = _convert_messages(chat_messages)
        
        # Execute agent with streaming
        executor = LangGraphExecutor(db)
        
        async for chunk in executor.execute(agent, messages, stream=stream):
            await websocket.send_json({
                "type": "chunk",
                "content": chunk
            })
        
        # Send done message
        await websocket.send_json({
            "type": "done"
        })
        
    except json.JSONDecodeError:
        await websocket.send_json({
            "type": "error",
            "message": "Invalid JSON format"
        })
    except WebSocketDisconnect:
        # Client disconnected, that's okay
        pass
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
    finally:
        await websocket.close()

