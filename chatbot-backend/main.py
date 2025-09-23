"""
FastAPI Backend for AI Chatbot Application
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from app.core.config import settings
from app.core.database import create_tables
from app.core.logging_config import setup_logging
from app.api.routes import router


# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan events"""
    logger.info("Starting up FastAPI application")
    
    # Create database tables
    await create_tables()
    logger.info("Database tables created/verified")
    
    yield
    
    logger.info("Shutting down FastAPI application")


# Create FastAPI application
app = FastAPI(
    title="AI Chatbot Backend",
    description="Backend API for AI-powered chatbot application using FastAPI and LangGraph",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log HTTP requests"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    logger.info(
        f"Request: {request.method} {request.url} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.2f}s"
    )
    return response


# Include API routes
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "AI Chatbot Backend is running"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Chatbot Backend API", 
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )