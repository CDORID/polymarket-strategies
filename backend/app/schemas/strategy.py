from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class StrategyCreate(BaseModel):
    name: str
    description: str = ""
    code: str
    params: dict[str, Any] = {}
    template_key: Optional[str] = None
    is_active: bool = False


class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    params: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None


class StrategyResponse(BaseModel):
    id: int
    name: str
    description: str
    code: str
    params: dict[str, Any]
    template_key: Optional[str]
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class StrategyTemplate(BaseModel):
    key: str
    name: str
    description: str
    code: str
    params: dict[str, Any]
