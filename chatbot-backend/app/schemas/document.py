from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentBase(BaseModel):
    """Base document schema."""
    title: str
    content: str
    content_type: str = "text/plain"


class DocumentCreate(DocumentBase):
    """Document creation schema."""
    pass


class DocumentUpdate(BaseModel):
    """Document update schema."""
    title: Optional[str] = None
    content: Optional[str] = None
    content_type: Optional[str] = None


class DocumentResponse(DocumentBase):
    """Document response schema."""
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True