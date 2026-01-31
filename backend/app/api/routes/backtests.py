"""Backtest routes — run and view backtests."""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models.strategy import Strategy
from app.models.backtest import BacktestResult
from app.schemas.backtest import BacktestRequest, BacktestResponse, BacktestSummary, BacktestMetrics
from app.core.backtester import run_backtest

router = APIRouter()


@router.post("/run", response_model=BacktestResponse, status_code=201)
async def run_backtest_endpoint(
    req: BacktestRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run a backtest for a strategy against a market."""
    strategy = await db.get(Strategy, req.strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    params = {}
    try:
        params = json.loads(strategy.params) if strategy.params else {}
    except json.JSONDecodeError:
        pass

    try:
        result = await run_backtest(
            strategy_code=strategy.code,
            strategy_params=params,
            token_id=req.token_id,
            initial_capital=req.initial_capital,
            fee_rate=req.fee_rate,
            interval=req.interval,
            fidelity=req.fidelity,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

    metrics = result["metrics"]

    # Save to DB
    bt = BacktestResult(
        strategy_id=req.strategy_id,
        token_id=req.token_id,
        market_name=req.market_name,
        equity_curve=json.dumps(result["equity_curve"]),
        timestamps=json.dumps(result["timestamps"]),
        prices=json.dumps(result["prices"]),
        trades=json.dumps(result["trades"]),
        initial_capital=req.initial_capital,
        final_equity=result["final_equity"],
        total_pnl=metrics["total_pnl"],
        roi_pct=metrics["roi_pct"],
        sharpe_ratio=metrics["sharpe_ratio"],
        max_drawdown_pct=metrics["max_drawdown_pct"],
        win_rate_pct=metrics["win_rate_pct"],
        total_trades=metrics["total_trades"],
        profit_factor=metrics["profit_factor"],
        data_points=result["data_points"],
        duration_seconds=result["duration_seconds"],
    )
    db.add(bt)
    await db.commit()
    await db.refresh(bt)

    return _backtest_to_response(bt, result)


@router.get("/", response_model=list[BacktestSummary])
async def list_backtests(
    strategy_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List backtest results, optionally filtered by strategy."""
    query = select(BacktestResult).offset(skip).limit(limit).order_by(BacktestResult.created_at.desc())
    if strategy_id is not None:
        query = query.where(BacktestResult.strategy_id == strategy_id)
    result = await db.execute(query)
    backtests = result.scalars().all()
    return [
        BacktestSummary(
            id=bt.id,
            strategy_id=bt.strategy_id,
            token_id=bt.token_id,
            market_name=bt.market_name or "",
            total_pnl=bt.total_pnl or 0,
            roi_pct=bt.roi_pct or 0,
            sharpe_ratio=bt.sharpe_ratio or 0,
            max_drawdown_pct=bt.max_drawdown_pct or 0,
            win_rate_pct=bt.win_rate_pct or 0,
            total_trades=bt.total_trades or 0,
            created_at=bt.created_at,
        )
        for bt in backtests
    ]


@router.get("/{backtest_id}", response_model=BacktestResponse)
async def get_backtest(backtest_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed backtest result."""
    bt = await db.get(BacktestResult, backtest_id)
    if not bt:
        raise HTTPException(status_code=404, detail="Backtest not found")
    return _backtest_to_response(bt)


@router.delete("/{backtest_id}", status_code=204)
async def delete_backtest(backtest_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a backtest result."""
    bt = await db.get(BacktestResult, backtest_id)
    if not bt:
        raise HTTPException(status_code=404, detail="Backtest not found")
    await db.delete(bt)
    await db.commit()


def _backtest_to_response(bt: BacktestResult, result: dict | None = None) -> BacktestResponse:
    """Convert ORM to response."""
    if result:
        equity_curve = result["equity_curve"]
        timestamps = result["timestamps"]
        prices = result["prices"]
        trades = result["trades"]
    else:
        equity_curve = json.loads(bt.equity_curve) if bt.equity_curve else []
        timestamps = json.loads(bt.timestamps) if bt.timestamps else []
        prices = json.loads(bt.prices) if bt.prices else []
        trades = json.loads(bt.trades) if bt.trades else []

    return BacktestResponse(
        id=bt.id,
        strategy_id=bt.strategy_id,
        token_id=bt.token_id,
        market_name=bt.market_name or "",
        equity_curve=equity_curve,
        timestamps=timestamps,
        prices=prices,
        trades=trades,
        metrics=BacktestMetrics(
            total_pnl=bt.total_pnl or 0,
            roi_pct=bt.roi_pct or 0,
            sharpe_ratio=bt.sharpe_ratio or 0,
            max_drawdown_pct=bt.max_drawdown_pct or 0,
            win_rate_pct=bt.win_rate_pct or 0,
            total_trades=bt.total_trades or 0,
            winning_trades=0,
            losing_trades=0,
            avg_win=0,
            avg_loss=0,
            profit_factor=bt.profit_factor or 0,
            max_consecutive_wins=0,
            max_consecutive_losses=0,
        ),
        initial_capital=bt.initial_capital or 1000,
        final_equity=bt.final_equity or 0,
        data_points=bt.data_points or 0,
        duration_seconds=bt.duration_seconds or 0,
        created_at=bt.created_at,
    )
