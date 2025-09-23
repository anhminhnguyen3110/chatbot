"""Files API endpoints - simplified"""
from fastapi import APIRouter
router = APIRouter(prefix="/files", tags=["files"])

@router.get("/")
async def list_files():
    return {"files": []}