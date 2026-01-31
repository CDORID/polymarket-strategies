"""Async Polymarket API client using httpx."""

import httpx
from typing import Any, Optional
from app.core.config import settings


class PolymarketClient:
    """Read-only client for Polymarket APIs (no API key required)."""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={"Accept": "application/json"},
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ── CLOB API ──────────────────────────────────────────────

    async def get_prices_history(
        self, token_id: str, interval: str = "max", fidelity: int = 60
    ) -> list[dict[str, Any]]:
        """Fetch historical price data for a market token."""
        client = await self._get_client()
        resp = await client.get(
            f"{settings.CLOB_API_BASE}/prices-history",
            params={"market": token_id, "interval": interval, "fidelity": fidelity},
        )
        resp.raise_for_status()
        data = resp.json()
        # Returns list of {t: timestamp, p: price}
        if isinstance(data, dict) and "history" in data:
            return data["history"]
        return data if isinstance(data, list) else []

    async def get_price(self, token_id: str) -> dict[str, Any]:
        """Get current price for a market token."""
        client = await self._get_client()
        resp = await client.get(
            f"{settings.CLOB_API_BASE}/price",
            params={"token_id": token_id},
        )
        resp.raise_for_status()
        return resp.json()

    async def get_orderbook(self, token_id: str) -> dict[str, Any]:
        """Get the orderbook for a market token."""
        client = await self._get_client()
        resp = await client.get(
            f"{settings.CLOB_API_BASE}/book",
            params={"token_id": token_id},
        )
        resp.raise_for_status()
        return resp.json()

    async def get_midpoint(self, token_id: str) -> dict[str, Any]:
        """Get midpoint price for a market token."""
        client = await self._get_client()
        resp = await client.get(
            f"{settings.CLOB_API_BASE}/midpoint",
            params={"token_id": token_id},
        )
        resp.raise_for_status()
        return resp.json()

    # ── Gamma API ─────────────────────────────────────────────

    async def get_events(
        self,
        limit: int = 20,
        offset: int = 0,
        slug: Optional[str] = None,
        active: bool = True,
    ) -> list[dict[str, Any]]:
        """List prediction market events."""
        client = await self._get_client()
        params: dict[str, Any] = {"limit": limit, "offset": offset, "active": active}
        if slug:
            params["slug"] = slug
        resp = await client.get(f"{settings.GAMMA_API_BASE}/events", params=params)
        resp.raise_for_status()
        return resp.json()

    async def get_markets(
        self,
        limit: int = 20,
        offset: int = 0,
        active: bool = True,
        order: str = "volume24hr",
        ascending: bool = False,
    ) -> list[dict[str, Any]]:
        """List prediction markets."""
        client = await self._get_client()
        params: dict[str, Any] = {
            "limit": limit,
            "offset": offset,
            "active": active,
            "order": order,
            "ascending": ascending,
        }
        resp = await client.get(f"{settings.GAMMA_API_BASE}/markets", params=params)
        resp.raise_for_status()
        return resp.json()

    async def get_market(self, condition_id: str) -> dict[str, Any]:
        """Get a single market by condition ID."""
        client = await self._get_client()
        resp = await client.get(f"{settings.GAMMA_API_BASE}/markets/{condition_id}")
        resp.raise_for_status()
        return resp.json()

    # ── Data API ──────────────────────────────────────────────

    async def get_trades(
        self, market: Optional[str] = None, limit: int = 100
    ) -> list[dict[str, Any]]:
        """Get recent trades."""
        client = await self._get_client()
        params: dict[str, Any] = {"limit": limit}
        if market:
            params["market"] = market
        resp = await client.get(f"{settings.DATA_API_BASE}/trades", params=params)
        resp.raise_for_status()
        return resp.json()


# Singleton
polymarket = PolymarketClient()
