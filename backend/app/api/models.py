"""API endpoints for model management."""
from fastapi import APIRouter, HTTPException
from app.core.config import settings
import httpx

router = APIRouter(prefix="/models", tags=["models"])


@router.get("/ollama")
async def get_ollama_models():
    """Get available Ollama models."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=10.0)
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch models from Ollama")
            
            data = response.json()
            models = [model.get("name", "").split(":")[0] for model in data.get("models", [])]
            return {"models": list(set(models))}  # Remove duplicates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching models: {str(e)}")


@router.get("/available")
async def get_available_models():
    """Get curated list of available models."""
    # Predefined list of recommended models
    models = [
        {"id": "llama3.2", "name": "Llama 3.2", "provider": "Ollama"},
        {"id": "claude-sonnet-3.5", "name": "Claude Sonnet 3.5", "provider": "Anthropic"},
        {"id": "gpt-4", "name": "GPT-4", "provider": "OpenAI"},
    ]
    
    # Try to fetch Ollama models and update the list
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                ollama_models = [model.get("name", "") for model in data.get("models", [])]
                # Check if llama3.2 or similar exists
                for model_name in ollama_models:
                    if "llama" in model_name.lower():
                        models[0]["id"] = model_name.split(":")[0]
                        models[0]["name"] = model_name.split(":")[0].replace("-", " ").title()
                        break
    except:
        pass  # If Ollama is not available, use defaults
    
    return {"models": models}



