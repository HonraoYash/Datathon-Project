"""LangGraph executor service with Ollama integration."""
from typing import List, Dict, Any, Optional, AsyncIterator, Annotated, TypedDict
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from app.core.config import settings
from app.models.database_models import Agent, Tool
from sqlalchemy.orm import Session


class LangGraphExecutor:
    """Executor for running LangGraph agents with Ollama."""
    
    def __init__(self, db: Session):
        """Initialize the executor with database session."""
        self.db = db
        self._llm_cache: Dict[str, ChatOllama] = {}
    
    def _get_llm(self, model: str, temperature: float = 0.7) -> ChatOllama:
        """Get or create Ollama LLM instance."""
        cache_key = f"{model}_{temperature}"
        if cache_key not in self._llm_cache:
            self._llm_cache[cache_key] = ChatOllama(
                model=model,
                base_url=settings.OLLAMA_BASE_URL,
                temperature=temperature
            )
        return self._llm_cache[cache_key]
    
    def _build_agent_graph(self, agent: Agent, tools: List[Tool]):
        """Build LangGraph agent workflow."""
        # Define state schema
        class State(TypedDict):
            messages: Annotated[list[BaseMessage], add_messages]
        
        # Create state graph
        workflow = StateGraph(State)
        
        # Add nodes
        workflow.add_node("agent", self._agent_node(agent, tools))
        workflow.add_node("tools", self._tools_node(tools))
        
        # Define edges
        workflow.set_entry_point("agent")
        workflow.add_conditional_edges(
            "agent",
            self._should_use_tools,
            {
                "tools": "tools",
                "end": END
            }
        )
        workflow.add_edge("tools", "agent")
        
        return workflow.compile()
    
    def _agent_node(self, agent: Agent, tools: List[Tool]):
        """Agent node that processes messages."""
        async def node(state: Dict[str, Any]) -> Dict[str, Any]:
            try:
                llm = self._get_llm(agent.model, float(agent.temperature))
                
                # Build messages with system prompt
                # Format: System prompt + separator instruction + user messages
                messages = state.get("messages", []) if isinstance(state, dict) else (state if isinstance(state, list) else [])
                
                # Ensure all messages are proper BaseMessage objects
                clean_messages = []
                for msg in messages:
                    if isinstance(msg, dict):
                        # Convert dict to proper message type
                        role = msg.get("type", msg.get("role", "user"))
                        content = msg.get("content", "")
                        if role == "user" or role == "human":
                            clean_messages.append(HumanMessage(content=content))
                        elif role == "assistant" or role == "ai":
                            clean_messages.append(AIMessage(content=content))
                        elif role == "system":
                            clean_messages.append(SystemMessage(content=content))
                    elif isinstance(msg, BaseMessage):
                        clean_messages.append(msg)
                
                # Create enhanced system prompt with separator instruction
                enhanced_system_prompt = f"""{agent.system_prompt}

Based on the above instructions, answer the user's questions below."""
                
                # Ensure system message is first
                if not clean_messages or not isinstance(clean_messages[0], SystemMessage):
                    clean_messages = [SystemMessage(content=enhanced_system_prompt)] + clean_messages
                else:
                    # Replace existing system message with enhanced one
                    clean_messages[0] = SystemMessage(content=enhanced_system_prompt)
                
                # Invoke LLM
                response = await llm.ainvoke(clean_messages)
                
                # Ensure response is a proper message object
                if not isinstance(response, BaseMessage):
                    response = AIMessage(content=str(response))
                
                return {"messages": [response]}
            except Exception as e:
                # Return error message if LLM call fails
                import traceback
                error_content = f"I apologize, but I encountered an error: {str(e)}"
                print(f"Agent node error: {error_content}\n{traceback.format_exc()}")
                error_msg = AIMessage(content=error_content)
                return {"messages": [error_msg]}
        return node
    
    def _tools_node(self, tools: List[Tool]):
        """Tools node that executes tools."""
        async def node(state: Dict[str, Any]) -> Dict[str, Any]:
            # Placeholder for tool execution
            # In a full implementation, this would execute the actual tools
            messages = state.get("messages", []) if isinstance(state, dict) else (state if isinstance(state, list) else [])
            # Ensure all are BaseMessage objects
            clean_messages = []
            for msg in messages:
                if isinstance(msg, BaseMessage):
                    clean_messages.append(msg)
            return {"messages": clean_messages if clean_messages else messages}
        return node
    
    def _should_use_tools(self, state: Dict[str, Any]) -> str:
        """Determine if tools should be used."""
        # Simple logic: for now, always go to end
        # In full implementation, analyze LLM response for tool calls
        return "end"
    
    async def execute(
        self,
        agent: Agent,
        messages: List[BaseMessage],
        stream: bool = False
    ) -> AsyncIterator[str]:
        """Execute agent with given messages."""
        # Get tools for this agent
        tools = self.db.query(Tool).filter(Tool.agent_id == agent.id).all()
        
        # Build graph
        graph = self._build_agent_graph(agent, tools)
        
        # Prepare initial state - ensure all are BaseMessage objects
        clean_messages = []
        for msg in messages:
            if isinstance(msg, BaseMessage):
                clean_messages.append(msg)
            elif isinstance(msg, dict):
                # Convert dict to proper message type
                role = msg.get("type", msg.get("role", "user"))
                content = msg.get("content", "")
                if role == "user" or role == "human":
                    clean_messages.append(HumanMessage(content=content))
                elif role == "assistant" or role == "ai":
                    clean_messages.append(AIMessage(content=content))
                elif role == "system":
                    clean_messages.append(SystemMessage(content=content))
        
        initial_state = {"messages": clean_messages}
        
        if stream:
            # Stream responses
            try:
                async for chunk in graph.astream(initial_state):
                    # Handle different chunk formats
                    if isinstance(chunk, dict):
                        # Format: {"agent": {"messages": [...]}} or {"messages": [...]}
                        if "agent" in chunk:
                            agent_messages = chunk["agent"].get("messages", [])
                        elif "messages" in chunk:
                            agent_messages = chunk["messages"]
                        else:
                            agent_messages = []
                    elif isinstance(chunk, list):
                        # Direct list format
                        agent_messages = chunk
                    else:
                        agent_messages = []
                    
                    for msg in agent_messages:
                            # Handle both message objects and dicts
                            if isinstance(msg, dict):
                                content = msg.get("content", "")
                            elif hasattr(msg, "content"):
                                content = msg.content
                            else:
                                continue
                            
                            # If content is None or empty, skip
                            if not content:
                                continue
                            
                            # Convert to string if not already
                            if not isinstance(content, str):
                                content = str(content)
                            
                            # Yield content in smaller chunks if it's a long string
                            if len(content) > 100:
                                # Split into smaller chunks for streaming
                                chunk_size = 50
                                for i in range(0, len(content), chunk_size):
                                    yield content[i:i + chunk_size]
                            else:
                                yield content
            except Exception as e:
                import traceback
                error_str = f"Error: {str(e)}"
                print(f"Streaming error: {error_str}\n{traceback.format_exc()}")
                yield error_str
        else:
            # Get final result
            try:
                result = await graph.ainvoke(initial_state)
                # Handle different result formats
                if isinstance(result, list):
                    final_message = result[-1] if result else None
                elif isinstance(result, dict):
                    final_message = result.get("messages", [])[-1] if result.get("messages") else None
                else:
                    final_message = None
                
                if final_message:
                    # Handle both message objects and dicts
                    if isinstance(final_message, dict):
                        content = final_message.get("content", "")
                    elif hasattr(final_message, "content"):
                        content = final_message.content
                    else:
                        content = str(final_message)
                    
                    if content:
                        yield content if isinstance(content, str) else str(content)
                    else:
                        yield "No response generated"
                else:
                    yield "No response generated"
            except Exception as e:
                import traceback
                error_str = f"Error: {str(e)}"
                print(f"Execution error: {error_str}\n{traceback.format_exc()}")
                yield error_str
    
    async def execute_async(
        self,
        agent: Agent,
        messages: List[BaseMessage]
    ) -> str:
        """Execute agent asynchronously and return full response."""
        response = ""
        async for chunk in self.execute(agent, messages, stream=False):
            response += chunk
        return response

