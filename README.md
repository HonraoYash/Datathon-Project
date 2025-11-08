Prompt Engineering
Prompt Tree
Prompt Chaining
Reinforcement Learning
Human in the Loop
Chain of Thought
Until the prompt matures and captures all the testcases.
Focus on using existing models, rather than fine-tuning, 
UI/UX - very less weightage (10%)



Agent - Classifier (uses Reasoning and based on the Prompt) multiple iteratinos of Reasoning - 

Tree of Thought - the main Reasoning process 

System Prompt - to refine we will RLHD (Prompt Optimization)



# Agentic Chatbot

A full-stack agentic chatbot system built with FastAPI, LangGraph, and Ollama.

## Project Structure

```
agentic-system/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/       # API endpoints
│   │   ├── core/      # Configuration and database
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/ # Business logic
│   └── tools/         # Tool implementations
└── frontend/          # React frontend (coming soon)
```

## Backend Features

- ✅ FastAPI REST API
- ✅ SQLAlchemy database models
- ✅ Alembic migrations
- ✅ CRUD operations for Agents and Tools
- ✅ Ollama LLM integration
- ✅ LangGraph agent executor
- ✅ Streaming chat responses

## Quick Start

### Prerequisites

- Python 3.11+
- Ollama installed and running (see [Ollama Setup](#ollama-setup))
- Docker (optional, for containerized deployment)

### Installation

1. **Navigate to backend directory:**
   ```bash
   cd agentic-system/backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Initialize database:**
   ```bash
   alembic upgrade head
   ```

6. **Run the server:**
   ```bash
   uvicorn main:app --reload
   ```

The API will be available at `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

### Ollama Setup

1. **Install Ollama:**
   - Visit https://ollama.ai and follow installation instructions

2. **Pull a model:**
   ```bash
   ollama pull llama3.2
   ```

3. **Verify Ollama is running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

### Docker Setup

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Pull Ollama model (inside container):**
   ```bash
   docker exec -it agentic-system-ollama-1 ollama pull llama3.2
   ```

## API Endpoints

### Agents
- `POST /api/v1/agents/` - Create agent
- `GET /api/v1/agents/` - List all agents
- `GET /api/v1/agents/active` - List active agents
- `GET /api/v1/agents/{id}` - Get agent by ID
- `PUT /api/v1/agents/{id}` - Update agent
- `DELETE /api/v1/agents/{id}` - Delete agent

### Tools
- `POST /api/v1/tools/` - Create tool
- `GET /api/v1/tools/` - List all tools
- `GET /api/v1/tools/builtin` - List builtin tools
- `GET /api/v1/tools/agent/{id}` - Get tools for agent
- `GET /api/v1/tools/{id}` - Get tool by ID
- `PUT /api/v1/tools/{id}` - Update tool
- `DELETE /api/v1/tools/{id}` - Delete tool

### Chat
- `POST /api/v1/chat/` - Chat with agent (non-streaming)
- `POST /api/v1/chat/stream` - Chat with agent (streaming)

## Example Usage

### Create an Agent

```bash
curl -X POST "http://localhost:8000/api/v1/agents/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "assistant",
    "description": "Helpful assistant",
    "system_prompt": "You are a helpful assistant.",
    "model": "llama3.2",
    "temperature": "0.7"
  }'
```

### Chat with Agent

```bash
curl -X POST "http://localhost:8000/api/v1/chat/" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": 1,
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

## Development

### Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Structure

- **models/**: SQLAlchemy database models
- **schemas/**: Pydantic models for validation
- **services/**: Business logic and CRUD operations
- **api/**: FastAPI route handlers
- **core/**: Configuration and database setup

## Next Steps

- [ ] Frontend React application
- [ ] Enhanced tool execution
- [ ] Agent memory/history
- [ ] User authentication
- [ ] Multi-agent workflows

## License

MIT



