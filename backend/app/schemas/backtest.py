from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class BacktestRequest(BaseModel):
    strategy_id: int
    token_id: str
    market_name: str = ""
    initial_capital: float = 1000.0
    fee_rate: Optional[float] = None
    interval: str = "max"
    fidelity: int = 60


class BacktestMetrics(BaseModel):
    total_pnl: float
    roi_pct: float
    sharpe_ratio: float
    max_drawdown_pct: float
    win_rate_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_win: float
    avg_loss: float
    profit_factor: float
    max_consecutive_wins: int
    max_consecutive_losses: int


class BacktestResponse(BaseModel):
    id: int
    strategy_id: int
    token_id: str
    market_name: str
    equity_curve: list[float]
    timestamps: list[Any]
    prices: list[float]
    trades: list[dict[str, Any]]
    metrics: BacktestMetrics
    initial_capital: float
    final_equity: float
    data_points: int
    duration_seconds: float
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class BacktestSummary(BaseModel):
    id: int
    strategy_id: int
    token_id: str
    market_name: str
    total_pnl: float
    roi_pct: float
    sharpe_ratio: float
    max_drawdown_pct: float
    win_rate_pct: float
    total_trades: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
