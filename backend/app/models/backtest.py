from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    token_id = Column(String(255), nullable=False)
    market_name = Column(String(500), default="")

    # Results (stored as JSON text)
    equity_curve = Column(Text, default="[]")
    timestamps = Column(Text, default="[]")
    prices = Column(Text, default="[]")
    trades = Column(Text, default="[]")

    # Key metrics
    initial_capital = Column(Float, default=1000.0)
    final_equity = Column(Float, default=0.0)
    total_pnl = Column(Float, default=0.0)
    roi_pct = Column(Float, default=0.0)
    sharpe_ratio = Column(Float, default=0.0)
    max_drawdown_pct = Column(Float, default=0.0)
    win_rate_pct = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    profit_factor = Column(Float, default=0.0)
    data_points = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
