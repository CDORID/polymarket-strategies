from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class TraderProfileResponse(BaseModel):
    address: str
    total_trades: int
    total_volume: float
    total_pnl: float
    roi_pct: float
    win_rate_pct: float
    avg_position_size: float
    unique_markets: int
    first_trade: Optional[str] = None
    last_trade: Optional[str] = None
    active_positions: int
    markets_breakdown: list[dict[str, Any]] = []


class TraderTradesResponse(BaseModel):
    address: str
    trades: list[dict[str, Any]]
    total: int
    page: int
    per_page: int


class TraderPerformanceResponse(BaseModel):
    address: str
    equity_curve: list[float]
    timestamps: list[int]
    cumulative_pnl: list[float]
    monthly_returns: list[dict[str, Any]]
    market_performance: list[dict[str, Any]]
    metrics: dict[str, Any]


class StrategyDetectionResult(BaseModel):
    address: str
    primary_strategy: str
    confidence: float
    patterns: dict[str, Any]
    category_focus: list[dict[str, Any]]
    timing_analysis: dict[str, Any]
    position_sizing: dict[str, Any]
    summary: str


class TraderComparisonResponse(BaseModel):
    traders: list[dict[str, Any]]


class LeaderboardEntry(BaseModel):
    rank: int
    address: str
    display_name: Optional[str] = None
    profit_loss: float
    volume: float
    markets_traded: int
    win_rate: Optional[float] = None


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntry]
    total: int


class TrackedTraderCreate(BaseModel):
    address: str
    alias: str = ""
    notes: str = ""


class TrackedTraderResponse(BaseModel):
    id: int
    address: str
    alias: str
    notes: str
    total_trades: int
    total_pnl: float
    win_rate: float
    avg_position_size: float
    detected_strategy: str
    last_analyzed: Optional[datetime] = None
    tracked_since: Optional[datetime] = None
    is_favorite: bool

    class Config:
        from_attributes = True
