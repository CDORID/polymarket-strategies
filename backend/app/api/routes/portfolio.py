"""Portfolio routes — track positions and overall performance."""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.db.base import get_db
from app.models.portfolio import Portfolio, Position
from app.models.backtest import BacktestResult

router = APIRouter()


@router.get("/summary")
async def portfolio_summary(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Get portfolio summary with aggregated metrics from all backtests."""
    result = await db.execute(select(BacktestResult).order_by(BacktestResult.created_at.desc()))
    backtests = result.scalars().all()

    if not backtests:
        return {
            "total_backtests": 0,
            "total_pnl": 0,
            "avg_roi_pct": 0,
            "avg_sharpe": 0,
            "avg_win_rate": 0,
            "best_strategy": None,
            "worst_strategy": None,
            "recent_backtests": [],
        }

    total_pnl = sum(bt.total_pnl or 0 for bt in backtests)
    avg_roi = sum(bt.roi_pct or 0 for bt in backtests) / len(backtests)
    avg_sharpe = sum(bt.sharpe_ratio or 0 for bt in backtests) / len(backtests)
    avg_win_rate = sum(bt.win_rate_pct or 0 for bt in backtests) / len(backtests)

    best = max(backtests, key=lambda b: b.roi_pct or 0)
    worst = min(backtests, key=lambda b: b.roi_pct or 0)

    return {
        "total_backtests": len(backtests),
        "total_pnl": round(total_pnl, 2),
        "avg_roi_pct": round(avg_roi, 2),
        "avg_sharpe": round(avg_sharpe, 4),
        "avg_win_rate": round(avg_win_rate, 2),
        "best_strategy": {
            "backtest_id": best.id,
            "strategy_id": best.strategy_id,
            "market": best.market_name,
            "roi_pct": best.roi_pct,
        },
        "worst_strategy": {
            "backtest_id": worst.id,
            "strategy_id": worst.strategy_id,
            "market": worst.market_name,
            "roi_pct": worst.roi_pct,
        },
        "recent_backtests": [
            {
                "id": bt.id,
                "strategy_id": bt.strategy_id,
                "market_name": bt.market_name or "",
                "total_pnl": bt.total_pnl or 0,
                "roi_pct": bt.roi_pct or 0,
                "sharpe_ratio": bt.sharpe_ratio or 0,
                "created_at": str(bt.created_at) if bt.created_at else None,
            }
            for bt in backtests[:10]
        ],
    }


@router.get("/equity-curve")
async def combined_equity_curve(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Get a combined equity curve from the most recent backtest per strategy."""
    result = await db.execute(
        select(BacktestResult).order_by(BacktestResult.created_at.desc())
    )
    backtests = result.scalars().all()

    # Get most recent backtest per strategy
    seen: set[int] = set()
    curves: list[dict[str, Any]] = []
    for bt in backtests:
        if bt.strategy_id in seen:
            continue
        seen.add(bt.strategy_id)
        try:
            eq = json.loads(bt.equity_curve) if bt.equity_curve else []
            ts = json.loads(bt.timestamps) if bt.timestamps else []
        except json.JSONDecodeError:
            eq, ts = [], []
        curves.append({
            "strategy_id": bt.strategy_id,
            "market_name": bt.market_name or "",
            "equity_curve": eq,
            "timestamps": ts,
        })

    return {"curves": curves}


@router.get("/positions")
async def list_positions(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """List all open positions."""
    result = await db.execute(select(Position).where(Position.is_open == True))
    positions = result.scalars().all()
    return [
        {
            "id": p.id,
            "portfolio_id": p.portfolio_id,
            "strategy_id": p.strategy_id,
            "token_id": p.token_id,
            "market_name": p.market_name or "",
            "side": p.side,
            "entry_price": p.entry_price,
            "current_price": p.current_price,
            "size": p.size,
            "unrealized_pnl": p.unrealized_pnl,
            "opened_at": str(p.opened_at) if p.opened_at else None,
        }
        for p in positions
    ]
