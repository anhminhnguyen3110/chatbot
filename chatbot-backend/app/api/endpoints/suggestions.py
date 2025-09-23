"""Suggestions API endpoints - simplified"""
from fastapi import APIRouter
router = APIRouter(prefix="/suggestions", tags=["suggestions"])

@router.get("/")
async def get_suggestions():
    return {"suggestions": []}