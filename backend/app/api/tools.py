"""API endpoints for tool management."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.pydantic_models import ToolCreate, ToolUpdate, ToolResponse
from app.services.tool_service import ToolService

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("/", response_model=ToolResponse, status_code=status.HTTP_201_CREATED)
async def create_tool(tool: ToolCreate, db: Session = Depends(get_db)):
    """Create a new tool."""
    # Check if tool with same name exists
    existing = ToolService.get_tool_by_name(db, tool.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tool with name '{tool.name}' already exists"
        )
    
    return ToolService.create_tool(db, tool)


@router.get("/", response_model=List[ToolResponse])
async def get_tools(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all tools."""
    return ToolService.get_all_tools(db, skip=skip, limit=limit)


@router.get("/builtin", response_model=List[ToolResponse])
async def get_builtin_tools(db: Session = Depends(get_db)):
    """Get all builtin tools."""
    return ToolService.get_builtin_tools(db)


@router.get("/agent/{agent_id}", response_model=List[ToolResponse])
async def get_tools_by_agent(agent_id: int, db: Session = Depends(get_db)):
    """Get all tools for a specific agent."""
    return ToolService.get_tools_by_agent(db, agent_id)


@router.get("/{tool_id}", response_model=ToolResponse)
async def get_tool(tool_id: int, db: Session = Depends(get_db)):
    """Get tool by ID."""
    tool = ToolService.get_tool(db, tool_id)
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool with ID {tool_id} not found"
        )
    return tool


@router.put("/{tool_id}", response_model=ToolResponse)
async def update_tool(
    tool_id: int,
    tool_update: ToolUpdate,
    db: Session = Depends(get_db)
):
    """Update a tool."""
    tool = ToolService.update_tool(db, tool_id, tool_update)
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool with ID {tool_id} not found"
        )
    return tool


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool(tool_id: int, db: Session = Depends(get_db)):
    """Delete a tool."""
    success = ToolService.delete_tool(db, tool_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool with ID {tool_id} not found"
        )



