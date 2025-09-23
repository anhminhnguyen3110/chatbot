"""Chat API endpoints - simplified"""
from fastapi import APIRouter
router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/")
async def list_chats():
    return {"chats": []}