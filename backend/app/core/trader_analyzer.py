"""Trader analysis engine — fetches and analyzes trader activity from Polymarket Data API."""

import math
from datetime import datetime, timezone
from typing import Any, Optional
from collections import defaultdict

import httpx
from app.core.config import settings


class TraderAnalyzer:
    """Analyze trader behavior, performance, and strategy patterns."""

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

    # ── Data Fetching ─────────────────────────────────────────

    async def fetch_trades(
        self, address: str, limit: int = 500, offset: int = 0
    ) -> list[dict[str, Any]]:
        """Fetch trades for a user from the Polymarket Data API."""
        client = await self._get_client()
        all_trades: list[dict[str, Any]] = []
        current_offset = offset
        page_size = min(limit, 100)

        while len(all_trades) < limit:
            try:
                resp = await client.get(
                    f"{settings.DATA_API_BASE}/trades",
                    params={
                        "user": address.lower(),
                        "limit": page_size,
                        "offset": current_offset,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                if not data:
                    break
                batch = data if isinstance(data, list) else []
                if not batch:
                    break
                all_trades.extend(batch)
                if len(batch) < page_size:
                    break
                current_offset += page_size
            except httpx.HTTPError:
                break

        return all_trades[:limit]

    async def fetch_positions(self, address: str) -> list[dict[str, Any]]:
        """Fetch current positions for a user."""
        client = await self._get_client()
        try:
            resp = await client.get(
                f"{settings.DATA_API_BASE}/positions",
                params={"user": address.lower()},
            )
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else []
        except httpx.HTTPError:
            return []

    # ── Profile Building ──────────────────────────────────────

    async def get_profile(self, address: str) -> dict[str, Any]:
        """Build a comprehensive trader profile from trades and positions."""
        trades = await self.fetch_trades(address, limit=1000)
        positions = await self.fetch_positions(address)

        if not trades:
            return {
                "address": address.lower(),
                "total_trades": 0,
                "total_volume": 0.0,
                "total_pnl": 0.0,
                "roi_pct": 0.0,
                "win_rate_pct": 0.0,
                "avg_position_size": 0.0,
                "unique_markets": 0,
                "first_trade": None,
                "last_trade": None,
                "active_positions": len(positions),
                "markets_breakdown": [],
            }

        total_volume = 0.0
        markets: dict[str, dict[str, Any]] = {}

        for trade in trades:
            price = _safe_float(trade.get("price", 0))
            size = _safe_float(trade.get("size", trade.get("amount", 0)))
            volume = price * size
            total_volume += volume

            market_id = str(trade.get("market", trade.get("asset_id", "unknown")))
            if market_id not in markets:
                markets[market_id] = {
                    "market_id": market_id,
                    "trades": 0,
                    "volume": 0.0,
                    "buys": 0,
                    "sells": 0,
                }
            markets[market_id]["trades"] += 1
            markets[market_id]["volume"] += volume
            side = str(trade.get("side", "")).lower()
            if side == "buy" or side == "b":
                markets[market_id]["buys"] += 1
            else:
                markets[market_id]["sells"] += 1

        # Calculate PnL from closed trade pairs
        pnl_data = self._calculate_pnl(trades)
        total_pnl = pnl_data["total_pnl"]
        win_rate = pnl_data["win_rate_pct"]
        avg_position_size = total_volume / len(trades) if trades else 0.0

        timestamps = []
        for t in trades:
            ts = t.get("timestamp", t.get("created_at", t.get("time", "")))
            if ts:
                timestamps.append(str(ts))

        timestamps_sorted = sorted(timestamps) if timestamps else []
        invested = total_volume / 2 if total_volume > 0 else 1
        roi_pct = (total_pnl / invested) * 100 if invested > 0 else 0.0

        markets_breakdown = sorted(
            markets.values(), key=lambda m: m["volume"], reverse=True
        )[:20]

        return {
            "address": address.lower(),
            "total_trades": len(trades),
            "total_volume": round(total_volume, 2),
            "total_pnl": round(total_pnl, 2),
            "roi_pct": round(roi_pct, 2),
            "win_rate_pct": round(win_rate, 2),
            "avg_position_size": round(avg_position_size, 2),
            "unique_markets": len(markets),
            "first_trade": timestamps_sorted[0] if timestamps_sorted else None,
            "last_trade": timestamps_sorted[-1] if timestamps_sorted else None,
            "active_positions": len(positions),
            "markets_breakdown": markets_breakdown,
        }

    # ── Performance Analysis ──────────────────────────────────

    async def get_performance(self, address: str) -> dict[str, Any]:
        """Calculate detailed performance metrics for a trader."""
        trades = await self.fetch_trades(address, limit=1000)

        if not trades:
            return {
                "address": address.lower(),
                "equity_curve": [],
                "timestamps": [],
                "cumulative_pnl": [],
                "monthly_returns": [],
                "market_performance": [],
                "metrics": _empty_metrics(),
            }

        pnl_data = self._calculate_pnl(trades)
        round_trips = pnl_data["round_trips"]

        # Build equity curve from round-trip PnLs
        equity = 1000.0  # Normalized starting equity
        equity_curve = [equity]
        cumulative_pnl = [0.0]
        timestamps = [0]
        running_pnl = 0.0

        for rt in round_trips:
            running_pnl += rt["pnl"]
            equity += rt["pnl"]
            equity_curve.append(round(equity, 4))
            cumulative_pnl.append(round(running_pnl, 4))
            timestamps.append(rt.get("close_time", 0))

        # Monthly returns
        monthly: dict[str, float] = defaultdict(float)
        for rt in round_trips:
            ts = rt.get("close_time", 0)
            if isinstance(ts, (int, float)) and ts > 0:
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                key = dt.strftime("%Y-%m")
            elif isinstance(ts, str) and ts:
                key = ts[:7]
            else:
                key = "unknown"
            monthly[key] += rt["pnl"]

        monthly_returns = [
            {"month": k, "pnl": round(v, 2)} for k, v in sorted(monthly.items())
        ]

        # Per-market performance
        market_perf: dict[str, dict[str, Any]] = {}
        for rt in round_trips:
            mid = rt.get("market_id", "unknown")
            if mid not in market_perf:
                market_perf[mid] = {"market_id": mid, "trades": 0, "pnl": 0.0, "wins": 0, "losses": 0}
            market_perf[mid]["trades"] += 1
            market_perf[mid]["pnl"] += rt["pnl"]
            if rt["pnl"] > 0:
                market_perf[mid]["wins"] += 1
            elif rt["pnl"] < 0:
                market_perf[mid]["losses"] += 1

        market_performance = sorted(
            [
                {**mp, "pnl": round(mp["pnl"], 2), "roi_pct": round((mp["pnl"] / max(mp["trades"], 1)) * 100, 2)}
                for mp in market_perf.values()
            ],
            key=lambda x: x["pnl"],
            reverse=True,
        )[:20]

        # Metrics
        metrics = self._compute_metrics(equity_curve, round_trips)

        return {
            "address": address.lower(),
            "equity_curve": equity_curve,
            "timestamps": timestamps,
            "cumulative_pnl": cumulative_pnl,
            "monthly_returns": monthly_returns,
            "market_performance": market_performance,
            "metrics": metrics,
        }

    # ── Strategy Detection ────────────────────────────────────

    async def detect_strategy(self, address: str) -> dict[str, Any]:
        """Detect trading strategy patterns from historical trades."""
        trades = await self.fetch_trades(address, limit=1000)

        if not trades:
            return {
                "address": address.lower(),
                "primary_strategy": "unknown",
                "confidence": 0.0,
                "patterns": {},
                "category_focus": [],
                "timing_analysis": {},
                "position_sizing": {},
                "summary": "Insufficient trade data for analysis.",
            }

        pnl_data = self._calculate_pnl(trades)
        round_trips = pnl_data["round_trips"]

        # ── Pattern detection ──

        # 1. Momentum vs Mean Reversion
        momentum_score = 0.0
        mean_reversion_score = 0.0
        trend_following_count = 0
        contrarian_count = 0

        for i in range(1, len(trades)):
            prev_price = _safe_float(trades[i - 1].get("price", 0))
            curr_price = _safe_float(trades[i].get("price", 0))
            side = str(trades[i].get("side", "")).lower()

            if prev_price > 0 and curr_price > 0:
                price_change = (curr_price - prev_price) / prev_price
                is_buy = side in ("buy", "b")

                if (price_change > 0.01 and is_buy) or (price_change < -0.01 and not is_buy):
                    trend_following_count += 1
                elif (price_change < -0.01 and is_buy) or (price_change > 0.01 and not is_buy):
                    contrarian_count += 1

        total_signals = trend_following_count + contrarian_count
        if total_signals > 0:
            momentum_score = trend_following_count / total_signals
            mean_reversion_score = contrarian_count / total_signals

        # 2. Timing patterns
        hour_distribution: dict[int, int] = defaultdict(int)
        day_distribution: dict[int, int] = defaultdict(int)
        for trade in trades:
            ts = trade.get("timestamp", trade.get("created_at", trade.get("time", "")))
            if isinstance(ts, (int, float)) and ts > 0:
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            elif isinstance(ts, str) and ts:
                try:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    continue
            else:
                continue
            hour_distribution[dt.hour] += 1
            day_distribution[dt.weekday()] += 1

        peak_hour = max(hour_distribution, key=hour_distribution.get) if hour_distribution else 0
        peak_day = max(day_distribution, key=day_distribution.get) if day_distribution else 0
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

        # 3. Position sizing patterns
        sizes = [_safe_float(t.get("size", t.get("amount", 0))) for t in trades]
        sizes = [s for s in sizes if s > 0]
        avg_size = sum(sizes) / len(sizes) if sizes else 0
        max_size = max(sizes) if sizes else 0
        min_size = min(sizes) if sizes else 0
        size_std = math.sqrt(sum((s - avg_size) ** 2 for s in sizes) / max(len(sizes) - 1, 1)) if len(sizes) > 1 else 0
        size_cv = (size_std / avg_size) if avg_size > 0 else 0

        # Classify sizing strategy
        if size_cv < 0.3:
            sizing_strategy = "fixed"
        elif size_cv < 0.7:
            sizing_strategy = "moderate_variation"
        else:
            sizing_strategy = "highly_variable"

        # 4. Holding duration
        holding_durations = []
        for rt in round_trips:
            dur = rt.get("duration_seconds", 0)
            if dur > 0:
                holding_durations.append(dur)

        avg_holding = sum(holding_durations) / len(holding_durations) if holding_durations else 0
        if avg_holding < 3600:
            holding_style = "scalper"
        elif avg_holding < 86400:
            holding_style = "day_trader"
        elif avg_holding < 604800:
            holding_style = "swing_trader"
        else:
            holding_style = "position_trader"

        # 5. Market concentration
        market_counts: dict[str, int] = defaultdict(int)
        for t in trades:
            mid = str(t.get("market", t.get("asset_id", "unknown")))
            market_counts[mid] += 1

        total_market_trades = sum(market_counts.values())
        top_markets = sorted(market_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        concentration = (top_markets[0][1] / total_market_trades) if top_markets and total_market_trades > 0 else 0

        category_focus = [
            {"market_id": mid, "trade_count": cnt, "pct": round(cnt / total_market_trades * 100, 1)}
            for mid, cnt in top_markets
        ]

        # ── Determine primary strategy ──
        scores = {
            "momentum": momentum_score * 0.4 + (0.2 if holding_style in ("scalper", "day_trader") else 0),
            "mean_reversion": mean_reversion_score * 0.4 + (0.1 if sizing_strategy == "fixed" else 0),
            "trend_following": momentum_score * 0.3 + (0.2 if holding_style in ("swing_trader", "position_trader") else 0),
            "market_making": 0.3 if (size_cv < 0.3 and len(market_counts) < 5 and len(trades) > 50) else 0.0,
            "event_driven": 0.3 if concentration > 0.5 else 0.0,
        }

        primary_strategy = max(scores, key=scores.get)  # type: ignore
        confidence = min(scores[primary_strategy] + 0.2, 1.0)

        # Summary
        win_rate = pnl_data["win_rate_pct"]
        total_pnl = pnl_data["total_pnl"]
        summary_parts = [
            f"Primarily a {primary_strategy.replace('_', ' ')} trader",
            f"({confidence * 100:.0f}% confidence).",
            f"Trades across {len(market_counts)} markets",
            f"with a {win_rate:.1f}% win rate.",
            f"Average holding: {_format_duration(avg_holding)}.",
            f"Position sizing: {sizing_strategy.replace('_', ' ')}.",
            f"Net PnL: ${total_pnl:.2f}.",
        ]

        return {
            "address": address.lower(),
            "primary_strategy": primary_strategy,
            "confidence": round(confidence, 3),
            "patterns": {
                "momentum_score": round(momentum_score, 3),
                "mean_reversion_score": round(mean_reversion_score, 3),
                "holding_style": holding_style,
                "market_concentration": round(concentration, 3),
                "trend_following_signals": trend_following_count,
                "contrarian_signals": contrarian_count,
            },
            "category_focus": category_focus,
            "timing_analysis": {
                "peak_hour_utc": peak_hour,
                "peak_day": day_names[peak_day] if peak_day < 7 else "Unknown",
                "hour_distribution": dict(sorted(hour_distribution.items())),
                "day_distribution": {day_names[k]: v for k, v in sorted(day_distribution.items()) if k < 7},
                "avg_holding_seconds": round(avg_holding, 0),
                "avg_holding_human": _format_duration(avg_holding),
            },
            "position_sizing": {
                "avg_size": round(avg_size, 4),
                "max_size": round(max_size, 4),
                "min_size": round(min_size, 4),
                "std_dev": round(size_std, 4),
                "coefficient_of_variation": round(size_cv, 3),
                "strategy": sizing_strategy,
            },
            "summary": " ".join(summary_parts),
        }

    # ── Leaderboard ───────────────────────────────────────────

    async def get_leaderboard(self, limit: int = 20) -> dict[str, Any]:
        """
        Fetch a leaderboard of top traders.
        Uses the Polymarket data API or gamma API leaderboard endpoint.
        Falls back to aggregating known traders if the endpoint is unavailable.
        """
        client = await self._get_client()

        # Try the gamma API leaderboard
        entries: list[dict[str, Any]] = []
        try:
            resp = await client.get(
                f"{settings.GAMMA_API_BASE}/leaderboard",
                params={"limit": limit, "window": "all"},
            )
            resp.raise_for_status()
            data = resp.json()
            raw = data if isinstance(data, list) else data.get("leaderboard", data.get("results", []))
            for i, entry in enumerate(raw[:limit]):
                entries.append({
                    "rank": i + 1,
                    "address": str(entry.get("address", entry.get("user", entry.get("userAddress", "")))),
                    "display_name": entry.get("displayName", entry.get("username", None)),
                    "profit_loss": _safe_float(entry.get("profitLoss", entry.get("pnl", entry.get("profit", 0)))),
                    "volume": _safe_float(entry.get("volume", entry.get("totalVolume", 0))),
                    "markets_traded": int(entry.get("marketsTraded", entry.get("markets", 0))),
                    "win_rate": _safe_float(entry.get("winRate", 0)) if entry.get("winRate") else None,
                })
        except httpx.HTTPError:
            # If the leaderboard endpoint doesn't exist, return empty with a note
            pass

        # If we got nothing, try the data API approach
        if not entries:
            try:
                resp = await client.get(
                    f"{settings.DATA_API_BASE}/leaderboard",
                    params={"limit": limit},
                )
                resp.raise_for_status()
                data = resp.json()
                raw = data if isinstance(data, list) else data.get("data", [])
                for i, entry in enumerate(raw[:limit]):
                    entries.append({
                        "rank": i + 1,
                        "address": str(entry.get("address", entry.get("user", ""))),
                        "display_name": entry.get("displayName", None),
                        "profit_loss": _safe_float(entry.get("profitLoss", entry.get("pnl", 0))),
                        "volume": _safe_float(entry.get("volume", 0)),
                        "markets_traded": int(entry.get("marketsTraded", entry.get("markets", 0))),
                        "win_rate": None,
                    })
            except httpx.HTTPError:
                pass

        return {
            "entries": entries,
            "total": len(entries),
        }

    # ── Comparison ────────────────────────────────────────────

    async def compare_traders(self, addresses: list[str]) -> list[dict[str, Any]]:
        """Compare multiple traders side by side."""
        results = []
        for addr in addresses[:10]:  # Cap at 10
            profile = await self.get_profile(addr)
            pnl_data = self._calculate_pnl(await self.fetch_trades(addr, limit=500))
            strategy = await self.detect_strategy(addr)
            results.append({
                "address": addr.lower(),
                "total_trades": profile["total_trades"],
                "total_volume": profile["total_volume"],
                "total_pnl": profile["total_pnl"],
                "roi_pct": profile["roi_pct"],
                "win_rate_pct": profile["win_rate_pct"],
                "avg_position_size": profile["avg_position_size"],
                "unique_markets": profile["unique_markets"],
                "active_positions": profile["active_positions"],
                "primary_strategy": strategy["primary_strategy"],
                "strategy_confidence": strategy["confidence"],
            })
        return results

    # ── Internal Helpers ──────────────────────────────────────

    def _calculate_pnl(self, trades: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Calculate PnL from a list of trades by matching buys and sells per market.
        Returns total PnL, win rate, and round-trip details.
        """
        if not trades:
            return {"total_pnl": 0.0, "win_rate_pct": 0.0, "round_trips": []}

        # Group trades by market
        by_market: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for t in trades:
            mid = str(t.get("market", t.get("asset_id", "unknown")))
            by_market[mid].append(t)

        round_trips: list[dict[str, Any]] = []

        for market_id, market_trades in by_market.items():
            # Sort by time
            market_trades.sort(
                key=lambda x: x.get("timestamp", x.get("created_at", x.get("time", 0)))
            )

            buys: list[dict[str, Any]] = []
            sells: list[dict[str, Any]] = []

            for t in market_trades:
                side = str(t.get("side", "")).lower()
                if side in ("buy", "b"):
                    buys.append(t)
                else:
                    sells.append(t)

            # Match buys with sells (FIFO)
            bi, si = 0, 0
            while bi < len(buys) and si < len(sells):
                buy = buys[bi]
                sell = sells[si]
                buy_price = _safe_float(buy.get("price", 0))
                sell_price = _safe_float(sell.get("price", 0))
                buy_size = _safe_float(buy.get("size", buy.get("amount", 0)))
                sell_size = _safe_float(sell.get("size", sell.get("amount", 0)))

                matched_size = min(buy_size, sell_size)
                if matched_size <= 0:
                    bi += 1
                    si += 1
                    continue

                pnl = (sell_price - buy_price) * matched_size

                buy_ts = buy.get("timestamp", buy.get("created_at", buy.get("time", 0)))
                sell_ts = sell.get("timestamp", sell.get("created_at", sell.get("time", 0)))

                duration = 0
                if isinstance(buy_ts, (int, float)) and isinstance(sell_ts, (int, float)):
                    duration = abs(sell_ts - buy_ts)

                round_trips.append({
                    "market_id": market_id,
                    "buy_price": buy_price,
                    "sell_price": sell_price,
                    "size": matched_size,
                    "pnl": round(pnl, 4),
                    "open_time": buy_ts,
                    "close_time": sell_ts,
                    "duration_seconds": duration,
                })

                # Consume matched size
                remaining_buy = buy_size - matched_size
                remaining_sell = sell_size - matched_size

                if remaining_buy <= 0.0001:
                    bi += 1
                else:
                    buys[bi] = {**buy, "size": remaining_buy}

                if remaining_sell <= 0.0001:
                    si += 1
                else:
                    sells[si] = {**sell, "size": remaining_sell}

        total_pnl = sum(rt["pnl"] for rt in round_trips)
        wins = sum(1 for rt in round_trips if rt["pnl"] > 0)
        total = len(round_trips)
        win_rate = (wins / total * 100) if total > 0 else 0.0

        # Sort round trips by close time
        round_trips.sort(key=lambda x: x.get("close_time", 0))

        return {
            "total_pnl": round(total_pnl, 4),
            "win_rate_pct": round(win_rate, 2),
            "round_trips": round_trips,
        }

    def _compute_metrics(
        self, equity_curve: list[float], round_trips: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Compute performance metrics from equity curve and round trips."""
        if len(equity_curve) < 2:
            return _empty_metrics()

        initial = equity_curve[0]
        final = equity_curve[-1]
        total_pnl = final - initial
        roi_pct = (total_pnl / initial) * 100 if initial > 0 else 0.0

        # Returns
        returns = []
        for i in range(1, len(equity_curve)):
            if equity_curve[i - 1] > 0:
                returns.append((equity_curve[i] - equity_curve[i - 1]) / equity_curve[i - 1])

        sharpe = 0.0
        if returns:
            avg_r = sum(returns) / len(returns)
            std_r = math.sqrt(sum((r - avg_r) ** 2 for r in returns) / max(len(returns) - 1, 1))
            if std_r > 0:
                sharpe = (avg_r / std_r) * math.sqrt(252)

        # Max drawdown
        peak = equity_curve[0]
        max_dd = 0.0
        for eq in equity_curve:
            if eq > peak:
                peak = eq
            dd = (peak - eq) / peak if peak > 0 else 0
            max_dd = max(max_dd, dd)

        wins = [rt for rt in round_trips if rt["pnl"] > 0]
        losses = [rt for rt in round_trips if rt["pnl"] < 0]
        total = len(round_trips)
        win_rate = (len(wins) / total * 100) if total > 0 else 0.0
        avg_win = sum(rt["pnl"] for rt in wins) / len(wins) if wins else 0.0
        avg_loss = sum(rt["pnl"] for rt in losses) / len(losses) if losses else 0.0

        gross_profit = sum(rt["pnl"] for rt in wins) if wins else 0
        gross_loss = abs(sum(rt["pnl"] for rt in losses)) if losses else 0
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (999.99 if gross_profit > 0 else 0.0)

        return {
            "total_pnl": round(total_pnl, 2),
            "roi_pct": round(roi_pct, 2),
            "sharpe_ratio": round(sharpe, 4),
            "max_drawdown_pct": round(max_dd * 100, 2),
            "win_rate_pct": round(win_rate, 2),
            "total_trades": total,
            "winning_trades": len(wins),
            "losing_trades": len(losses),
            "avg_win": round(avg_win, 4),
            "avg_loss": round(avg_loss, 4),
            "profit_factor": round(profit_factor, 4),
        }


# ── Module-level helpers ──────────────────────────────────

def _safe_float(value: Any) -> float:
    """Safely convert a value to float."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _format_duration(seconds: float) -> str:
    """Format seconds into human-readable duration."""
    if seconds < 60:
        return f"{seconds:.0f}s"
    elif seconds < 3600:
        return f"{seconds / 60:.1f}m"
    elif seconds < 86400:
        return f"{seconds / 3600:.1f}h"
    else:
        return f"{seconds / 86400:.1f}d"


def _empty_metrics() -> dict[str, Any]:
    return {
        "total_pnl": 0.0,
        "roi_pct": 0.0,
        "sharpe_ratio": 0.0,
        "max_drawdown_pct": 0.0,
        "win_rate_pct": 0.0,
        "total_trades": 0,
        "winning_trades": 0,
        "losing_trades": 0,
        "avg_win": 0.0,
        "avg_loss": 0.0,
        "profit_factor": 0.0,
    }


# Singleton
trader_analyzer = TraderAnalyzer()
