"""API endpoints for OCR functionality with Databricks integration."""
from fastapi import APIRouter, File, UploadFile, HTTPException, status
import requests
import os
from app.core.config import settings

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/")
async def perform_ocr(file: UploadFile = File(...)):
    """
    Upload a PDF file and trigger OCR processing in Databricks.
    
    Args:
        file: The PDF file to upload
        
    Returns:
        Status and Databricks run information
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    # Validate Databricks configuration
    if not settings.DATABRICKS_URL or not settings.DATABRICKS_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Databricks configuration is missing. Please check your environment variables."
        )
    
    if not settings.DATABRICKS_NOTEBOOK_PATH or not settings.DATABRICKS_VOLUME_PATH:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Databricks notebook or volume path is missing. Please check your environment variables."
        )
    
    try:
        # Step 1: Save uploaded file locally
        local_path = f"/tmp/{file.filename}"
        os.makedirs("/tmp", exist_ok=True)
        
        with open(local_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Step 2: Upload file to Databricks Volume
        upload_endpoint = f"{settings.DATABRICKS_URL}/api/2.0/fs/files{settings.DATABRICKS_VOLUME_PATH}/{file.filename}"
        headers = {"Authorization": f"Bearer {settings.DATABRICKS_TOKEN}"}
        
        with open(local_path, "rb") as f:
            resp = requests.put(upload_endpoint, headers=headers, data=f, timeout=60)
        
        if resp.status_code != 200:
            # Clean up local file
            if os.path.exists(local_path):
                os.remove(local_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload to Databricks Volume: {resp.text}"
            )
        
        # Step 3: Trigger Databricks Notebook job
        run_endpoint = f"{settings.DATABRICKS_URL}/api/2.1/jobs/runs/submit"
        payload = {
            "run_name": f"OCR_{file.filename}",
            "tasks": [{
                "task_key": "ocr_task",
                "notebook_task": {
                    "notebook_path": settings.DATABRICKS_NOTEBOOK_PATH,
                    "base_parameters": {"pdf_path": f"{settings.DATABRICKS_VOLUME_PATH}/{file.filename}"}
                }
            }]
        }
        
        r = requests.post(run_endpoint, headers=headers, json=payload, timeout=60)
        
        # Clean up local file
        if os.path.exists(local_path):
            os.remove(local_path)
        
        if r.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to trigger Databricks job: {r.text}"
            )
        
        return {
            "status": "success",
            "message": f"PDF '{file.filename}' uploaded and OCR job triggered successfully",
            "filename": file.filename,
            "databricks_run": r.json()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up local file on error
        local_path = f"/tmp/{file.filename}"
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except:
                pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing PDF: {str(e)}"
        )

