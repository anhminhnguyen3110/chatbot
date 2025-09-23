from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings configuration."""
    
    # Basic App Settings
    DEBUG: bool = True
    ENV: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://username:password@localhost:5432/chatbot_db"
    
    # JWT Security
    SECRET_KEY: str = "your-super-secret-jwt-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # AI Configuration  
    OPENAI_API_KEY: Optional[str] = None
    DEFAULT_MODEL: str = "gpt-4o-mini"
    MAX_TOKENS: int = 4096
    TEMPERATURE: float = 0.7
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60
    RATE_LIMIT_MESSAGES_PER_DAY_GUEST: int = 10
    RATE_LIMIT_MESSAGES_PER_DAY_USER: int = 100
    
    # File Upload
    MAX_FILE_SIZE_MB: int = 10
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_FILE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Redis (Optional)
    REDIS_URL: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()