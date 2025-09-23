"""Votes API endpoints - simplified"""
from fastapi import APIRouter
router = APIRouter(prefix="/votes", tags=["votes"])

@router.get("/")
async def get_votes():
    return {"votes": []}