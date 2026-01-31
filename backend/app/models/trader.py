from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean
from sqlalchemy.sql import func
from app.db.base import Base


class TrackedTrader(Base):
    __tablename__ = "tracked_traders"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String(255), unique=True, nullable=False, index=True)
    alias = Column(String(255), default="")
    notes = Column(Text, default="")
    total_trades = Column(Integer, default=0)
    total_pnl = Column(Float, default=0.0)
    win_rate = Column(Float, default=0.0)
    avg_position_size = Column(Float, default=0.0)
    detected_strategy = Column(String(100), default="unknown")
    last_analyzed = Column(DateTime(timezone=True), nullable=True)
    tracked_since = Column(DateTime(timezone=True), server_default=func.now())
    is_favorite = Column(Boolean, default=False)
