"""
User service for handling user-related business logic
"""
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate


class UserService:
    """Service class for user operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with hashed password"""
        hashed_password = get_password_hash(user_data.password)
        
        db_user = User(
            id=str(uuid.uuid4()),
            email=user_data.email,
            hashed_password=hashed_password,
            is_guest=False
        )
        
        self.db.add(db_user)
        await self.db.commit()
        await self.db.refresh(db_user)
        return db_user
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address"""
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()