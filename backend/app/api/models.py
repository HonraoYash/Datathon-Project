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
    """Return all locally available models (from Ollama)."""
    import httpx
    from fastapi import HTTPException

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=10.0)

            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch Ollama models")

            data = response.json()
            ollama_models = [
                {
                    "id": model.get("name", "").strip(),
                    "name": model.get("name", "").title(),
                    "provider": "Ollama"
                }
                for model in data.get("models", [])
            ]

            # Add curated external ones
            external_models = [
                {"id": "claude-sonnet-3.5", "name": "Claude Sonnet 3.5", "provider": "Anthropic"},
                {"id": "gpt-4", "name": "GPT-4", "provider": "OpenAI"},
            ]

            # Combine Ollama + External
            all_models = ollama_models + external_models

            # Deduplicate by ID
            seen = set()
            unique_models = []
            for m in all_models:
                if m["id"] not in seen:
                    seen.add(m["id"])
                    unique_models.append(m)

            return {"models": unique_models}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching models: {str(e)}")



