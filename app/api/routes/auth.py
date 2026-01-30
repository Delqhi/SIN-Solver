from fastapi import APIRouter, HTTPException, Depends
from app.core.config import settings

router = APIRouter()


@router.post("/login")
async def login():
    return {"message": "Auth system in maintenance"}
