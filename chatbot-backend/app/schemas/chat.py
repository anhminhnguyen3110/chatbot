from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    """Message role enumeration."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessagePart(BaseModel):
    """Message part for multimodal content."""
    type: str  # "text", "image_url", "file", etc.
    content: str
    metadata: Optional[dict] = None


class ChatBase(BaseModel):
    """Base chat schema."""
    title: str
    visibility: str = "private"


class ChatCreate(ChatBase):
    """Chat creation schema."""
    pass


class ChatUpdate(BaseModel):
    """Chat update schema."""
    title: Optional[str] = None
    visibility: Optional[str] = None


class ChatStreamRequest(BaseModel):
    """Chat streaming request schema."""
    content: str
    message_parts: Optional[List[MessagePart]] = None


class MessageCreate(BaseModel):
    """Message creation schema."""
    content: str
    role: MessageRole
    message_parts: Optional[List[MessagePart]] = None


class MessageResponse(BaseModel):
    """Message response schema."""
    id: str
    content: str
    role: MessageRole
    message_parts: Optional[List[MessagePart]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    """Chat response schema."""
    id: str
    title: str
    visibility: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True