"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Agent Schemas
class AgentBase(BaseModel):
    """Base agent schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    system_prompt: str = Field(..., min_length=1)
    model: str = "llama3.2"
    temperature: str = "0.7"
    is_active: bool = True


class AgentCreate(AgentBase):
    """Schema for creating an agent."""
    pass


class AgentUpdate(BaseModel):
    """Schema for updating an agent."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    system_prompt: Optional[str] = Field(None, min_length=1)
    model: Optional[str] = None
    temperature: Optional[str] = None
    is_active: Optional[bool] = None


class AgentResponse(AgentBase):
    """Schema for agent response."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Tool Schemas
class ToolBase(BaseModel):
    """Base tool schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)
    tool_type: str = Field(..., pattern="^(builtin|custom)$")
    implementation: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class ToolCreate(ToolBase):
    """Schema for creating a tool."""
    agent_id: Optional[int] = None


class ToolUpdate(BaseModel):
    """Schema for updating a tool."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1)
    tool_type: Optional[str] = Field(None, pattern="^(builtin|custom)$")
    implementation: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    agent_id: Optional[int] = None


class ToolResponse(ToolBase):
    """Schema for tool response."""
    id: int
    agent_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Chat Schemas
class ChatMessage(BaseModel):
    """Schema for chat message."""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    """Schema for chat request."""
    agent_id: int
    messages: List[ChatMessage]
    stream: bool = False


class ChatResponse(BaseModel):
    """Schema for chat response."""
    response: str
    agent_id: int



