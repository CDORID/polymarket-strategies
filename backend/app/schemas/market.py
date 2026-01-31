from pydantic import BaseModel
from typing import Optional, Any


class MarketQuery(BaseModel):
    limit: int = 20
    offset: int = 0
    active: bool = True
    order: str = "volume24hr"
    ascending: bool = False


class EventQuery(BaseModel):
    limit: int = 20
    offset: int = 0
    active: bool = True
    slug: Optional[str] = None


class OrderbookResponse(BaseModel):
    bids: list[dict[str, Any]] = []
    asks: list[dict[str, Any]] = []
    market: str = ""
    hash: str = ""
