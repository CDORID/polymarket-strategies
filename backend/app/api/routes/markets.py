"""Market routes — proxy to Polymarket APIs."""

from fastapi import APIRouter, Query
from typing import Any, Optional
from app.core.polymarket import polymarket

router = APIRouter()


@router.get("/events")
async def list_events(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    active: bool = True,
    slug: Optional[str] = None,
) -> list[dict[str, Any]]:
    """List Polymarket events via Gamma API."""
    return await polymarket.get_events(limit=limit, offset=offset, active=active, slug=slug)


@router.get("/markets")
async def list_markets(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    active: bool = True,
    order: str = "volume24hr",
    ascending: bool = False,
) -> list[dict[str, Any]]:
    """List Polymarket markets via Gamma API."""
    return await polymarket.get_markets(
        limit=limit, offset=offset, active=active, order=order, ascending=ascending
    )


@router.get("/markets/{condition_id}")
async def get_market(condition_id: str) -> dict[str, Any]:
    """Get a single market."""
    return await polymarket.get_market(condition_id)


@router.get("/price/{token_id}")
async def get_price(token_id: str) -> dict[str, Any]:
    """Get current price for a token."""
    return await polymarket.get_price(token_id)


@router.get("/orderbook/{token_id}")
async def get_orderbook(token_id: str) -> dict[str, Any]:
    """Get orderbook for a token."""
    return await polymarket.get_orderbook(token_id)


@router.get("/midpoint/{token_id}")
async def get_midpoint(token_id: str) -> dict[str, Any]:
    """Get midpoint price for a token."""
    return await polymarket.get_midpoint(token_id)


@router.get("/prices-history/{token_id}")
async def get_prices_history(
    token_id: str,
    interval: str = "max",
    fidelity: int = 60,
) -> list[dict[str, Any]]:
    """Get historical prices for a token."""
    return await polymarket.get_prices_history(
        token_id=token_id, interval=interval, fidelity=fidelity
    )


@router.get("/trades")
async def get_trades(
    market: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
) -> list[dict[str, Any]]:
    """Get recent trades."""
    return await polymarket.get_trades(market=market, limit=limit)
