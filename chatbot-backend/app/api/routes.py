"""
Main API router configuration
"""
from fastapi import APIRouter
from app.api.endpoints import auth, chat, documents, files, history, suggestions, votes

router = APIRouter()

# Include all endpoint routers
router.include_router(auth.router)
router.include_router(chat.router)
router.include_router(documents.router)
router.include_router(files.router)
router.include_router(history.router)
router.include_router(suggestions.router)
router.include_router(votes.router)