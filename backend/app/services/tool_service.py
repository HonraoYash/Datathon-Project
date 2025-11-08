"""Service for tool CRUD operations."""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.database_models import Tool
from app.schemas.pydantic_models import ToolCreate, ToolUpdate


class ToolService:
    """Service class for tool operations."""
    
    @staticmethod
    def create_tool(db: Session, tool: ToolCreate) -> Tool:
        """Create a new tool."""
        db_tool = Tool(**tool.model_dump())
        db.add(db_tool)
        db.commit()
        db.refresh(db_tool)
        return db_tool
    
    @staticmethod
    def get_tool(db: Session, tool_id: int) -> Optional[Tool]:
        """Get tool by ID."""
        return db.query(Tool).filter(Tool.id == tool_id).first()
    
    @staticmethod
    def get_tool_by_name(db: Session, name: str) -> Optional[Tool]:
        """Get tool by name."""
        return db.query(Tool).filter(Tool.name == name).first()
    
    @staticmethod
    def get_all_tools(db: Session, skip: int = 0, limit: int = 100) -> List[Tool]:
        """Get all tools."""
        return db.query(Tool).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_tools_by_agent(db: Session, agent_id: int) -> List[Tool]:
        """Get all tools for a specific agent."""
        return db.query(Tool).filter(Tool.agent_id == agent_id).all()
    
    @staticmethod
    def get_builtin_tools(db: Session) -> List[Tool]:
        """Get all builtin tools."""
        return db.query(Tool).filter(Tool.tool_type == "builtin").all()
    
    @staticmethod
    def update_tool(db: Session, tool_id: int, tool_update: ToolUpdate) -> Optional[Tool]:
        """Update a tool."""
        db_tool = db.query(Tool).filter(Tool.id == tool_id).first()
        if not db_tool:
            return None
        
        update_data = tool_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_tool, field, value)
        
        db.commit()
        db.refresh(db_tool)
        return db_tool
    
    @staticmethod
    def delete_tool(db: Session, tool_id: int) -> bool:
        """Delete a tool."""
        db_tool = db.query(Tool).filter(Tool.id == tool_id).first()
        if not db_tool:
            return False
        
        db.delete(db_tool)
        db.commit()
        return True



