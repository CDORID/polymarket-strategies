"""Trader analysis routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from typing import Optional

from app.db.base import get_db
from app.models.trader import TrackedTrader
from app.schemas.trader import (
    TraderProfileResponse,
    TraderTradesResponse,
    TraderPerformanceResponse,
    StrategyDetectionResult,
    LeaderboardResponse,
    LeaderboardEntry,
    TraderComparisonResponse,
    TrackedTraderCreate,
    TrackedTraderResponse,
)
from app.core.trader_analyzer import trader_analyzer

router = APIRouter()


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    limit: int = Query(20, ge=1, le=100),
):
    """Get trader leaderboard."""
    try:
        data = await trader_analyzer.get_leaderboard(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch leaderboard: {str(e)}")

    entries = [
        LeaderboardEntry(
            rank=entry["rank"],
            address=entry["address"],
            display_name=entry.get("display_name"),
            profit_loss=entry.get("profit_loss", 0),
            volume=entry.get("volume", 0),
            markets_traded=entry.get("markets_traded", 0),
            win_rate=entry.get("win_rate"),
        )
        for entry in data.get("entries", [])
    ]

    return LeaderboardResponse(entries=entries, total=data.get("total", len(entries)))


@router.get("/compare")
async def compare_traders(
    addresses: str = Query(..., description="Comma-separated list of trader addresses"),
):
    """Compare multiple traders side by side."""
    addr_list = [a.strip() for a in addresses.split(",") if a.strip()]
    if not addr_list:
        raise HTTPException(status_code=400, detail="No addresses provided")
    if len(addr_list) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 addresses for comparison")

    try:
        traders = await trader_analyzer.compare_traders(addr_list)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Comparison failed: {str(e)}")

    return TraderComparisonResponse(traders=traders)


@router.get("/tracked", response_model=list[TrackedTraderResponse])
async def list_tracked_traders(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all tracked traders."""
    result = await db.execute(
        select(TrackedTrader).offset(skip).limit(limit).order_by(TrackedTrader.tracked_since.desc())
    )
    return result.scalars().all()


@router.post("/tracked", response_model=TrackedTraderResponse, status_code=201)
async def track_trader(
    data: TrackedTraderCreate,
    db: AsyncSession = Depends(get_db),
):
    """Start tracking a trader."""
    existing = await db.execute(
        select(TrackedTrader).where(TrackedTrader.address == data.address.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Trader already tracked")

    trader = TrackedTrader(
        address=data.address.lower(),
        alias=data.alias,
        notes=data.notes,
    )
    db.add(trader)
    await db.commit()
    await db.refresh(trader)
    return trader


@router.delete("/tracked/{address}", status_code=204)
async def untrack_trader(address: str, db: AsyncSession = Depends(get_db)):
    """Stop tracking a trader."""
    result = await db.execute(
        select(TrackedTrader).where(TrackedTrader.address == address.lower())
    )
    trader = result.scalar_one_or_none()
    if not trader:
        raise HTTPException(status_code=404, detail="Tracked trader not found")
    await db.delete(trader)
    await db.commit()


@router.get("/{address}/profile", response_model=TraderProfileResponse)
async def get_trader_profile(address: str):
    """Get comprehensive trader profile."""
    try:
        profile = await trader_analyzer.get_profile(address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch profile: {str(e)}")

    return TraderProfileResponse(**profile)


@router.get("/{address}/trades", response_model=TraderTradesResponse)
async def get_trader_trades(
    address: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    """Get paginated trades for a trader."""
    offset = (page - 1) * per_page
    try:
        trades = await trader_analyzer.fetch_trades(
            address, limit=per_page, offset=offset
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch trades: {str(e)}")

    return TraderTradesResponse(
        address=address.lower(),
        trades=trades,
        total=len(trades),
        page=page,
        per_page=per_page,
    )


@router.get("/{address}/performance", response_model=TraderPerformanceResponse)
async def get_trader_performance(address: str):
    """Get detailed performance metrics and equity curve for a trader."""
    try:
        performance = await trader_analyzer.get_performance(address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to calculate performance: {str(e)}")

    return TraderPerformanceResponse(**performance)


@router.get("/{address}/strategy", response_model=StrategyDetectionResult)
async def get_trader_strategy(address: str):
    """Detect trading strategy patterns for a trader."""
    try:
        strategy = await trader_analyzer.detect_strategy(address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Strategy detection failed: {str(e)}")

    return StrategyDetectionResult(**strategy)
