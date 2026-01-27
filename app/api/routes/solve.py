from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.services.solver_router import get_solver_router, UnifiedSolution

router = APIRouter()

class ImageSolveRequest(BaseModel):
    image_base64: str
    captcha_type: str = "auto"
    use_cache: bool = True

class TextSolveRequest(BaseModel):
    question: str
    use_cache: bool = True

@router.post("/image/base64", response_model=UnifiedSolution)
async def solve_image_base64(request: ImageSolveRequest):
    router = await get_solver_router()
    return await router.solve_image(request.image_base64, request.captcha_type, request.use_cache)

@router.post("/text", response_model=UnifiedSolution)
async def solve_text(request: TextSolveRequest):
    router = await get_solver_router()
    return await router.solve_text(request.question, request.use_cache)

@router.get("/stats")
async def get_stats():
    router = await get_solver_router()
    if hasattr(router, 'get_stats'):
        return await router.get_stats()
    return {"mode": "remote"}
