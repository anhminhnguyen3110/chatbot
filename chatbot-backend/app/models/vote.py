from sqlalchemy import Column, String, Text, DateTime, ForeignKey
import uuid
from datetime import datetime

from app.core.database import Base


class Vote(Base):
    """Vote model."""
    __tablename__ = "votes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vote_type = Column(String(20), nullable=False)  # "upvote", "downvote"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Vote(id={self.id}, type={self.vote_type})>"