"""API endpoints for agent management."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.pydantic_models import AgentCreate, AgentUpdate, AgentResponse
from app.services.agent_service import AgentService

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(agent: AgentCreate, db: Session = Depends(get_db)):
    """Create a new agent."""
    # Check if agent with same name exists
    existing = AgentService.get_agent_by_name(db, agent.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent with name '{agent.name}' already exists"
        )
    
    return AgentService.create_agent(db, agent)


@router.get("/", response_model=List[AgentResponse])
async def get_agents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all agents."""
    return AgentService.get_all_agents(db, skip=skip, limit=limit)


@router.get("/active", response_model=List[AgentResponse])
async def get_active_agents(db: Session = Depends(get_db)):
    """Get all active agents."""
    return AgentService.get_active_agents(db)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: int, db: Session = Depends(get_db)):
    """Get agent by ID."""
    agent = AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID {agent_id} not found"
        )
    return agent


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    agent_update: AgentUpdate,
    db: Session = Depends(get_db)
):
    """Update an agent."""
    agent = AgentService.update_agent(db, agent_id, agent_update)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID {agent_id} not found"
        )
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    """Delete an agent."""
    success = AgentService.delete_agent(db, agent_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID {agent_id} not found"
        )



