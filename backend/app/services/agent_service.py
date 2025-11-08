"""Service for agent CRUD operations."""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.database_models import Agent
from app.schemas.pydantic_models import AgentCreate, AgentUpdate


class AgentService:
    """Service class for agent operations."""
    
    @staticmethod
    def create_agent(db: Session, agent: AgentCreate) -> Agent:
        """Create a new agent."""
        db_agent = Agent(**agent.model_dump())
        db.add(db_agent)
        db.commit()
        db.refresh(db_agent)
        return db_agent
    
    @staticmethod
    def get_agent(db: Session, agent_id: int) -> Optional[Agent]:
        """Get agent by ID."""
        return db.query(Agent).filter(Agent.id == agent_id).first()
    
    @staticmethod
    def get_agent_by_name(db: Session, name: str) -> Optional[Agent]:
        """Get agent by name."""
        return db.query(Agent).filter(Agent.name == name).first()
    
    @staticmethod
    def get_all_agents(db: Session, skip: int = 0, limit: int = 100) -> List[Agent]:
        """Get all agents."""
        return db.query(Agent).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_active_agents(db: Session) -> List[Agent]:
        """Get all active agents."""
        return db.query(Agent).filter(Agent.is_active == True).all()
    
    @staticmethod
    def update_agent(db: Session, agent_id: int, agent_update: AgentUpdate) -> Optional[Agent]:
        """Update an agent."""
        db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not db_agent:
            return None
        
        update_data = agent_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_agent, field, value)
        
        db.commit()
        db.refresh(db_agent)
        return db_agent
    
    @staticmethod
    def delete_agent(db: Session, agent_id: int) -> bool:
        """Delete an agent."""
        db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not db_agent:
            return False
        
        db.delete(db_agent)
        db.commit()
        return True



