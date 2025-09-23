"""Common schemas and mixins"""
from pydantic import BaseModel
from datetime import datetime


class TimestampMixin(BaseModel):
    """Mixin for timestamp fields"""
    created_at: datetime
    updated_at: datetime