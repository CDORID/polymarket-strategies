"""Backtesting engine for Polymarket strategies."""

import json
import time
from typing import Any, Optional

from app.core.config import settings
from app.core.metrics import calculate_metrics
from app.core.polymarket import polymarket


# Restricted builtins for sandboxed strategy execution
SAFE_BUILTINS = {
    "abs": abs,
    "max": max,
    "min": min,
    "sum": sum,
    "len": len,
    "range": range,
    "round": round,
    "float": float,
    "int": int,
    "bool": bool,
    "list": list,
    "dict": dict,
    "tuple": tuple,
    "enumerate": enumerate,
    "zip": zip,
    "sorted": sorted,
    "reversed": reversed,
    "map": map,
    "filter": filter,
    "True": True,
    "False": False,
    "None": None,
    "print": lambda *a, **kw: None,  # no-op print
}


def execute_strategy_signal(
    code: str, prices: list[float], position: float, params: dict
) -> int:
    """Execute strategy code in a sandboxed environment and return signal."""
    restricted_globals = {"__builtins__": SAFE_BUILTINS}
    local_ns: dict[str, Any] = {}

    try:
        exec(code, restricted_globals, local_ns)
    except Exception as e:
        raise ValueError(f"Strategy code compilation error: {e}")

    signal_fn = local_ns.get("signal")
    if signal_fn is None:
        raise ValueError("Strategy code must define a 'signal(prices, position, params)' function")

    try:
        result = signal_fn(prices, position, params)
    except Exception as e:
        raise ValueError(f"Strategy signal execution error: {e}")

    if result not in (-1, 0, 1):
        return 0
    return result


async def run_backtest(
    strategy_code: str,
    strategy_params: dict,
    token_id: str,
    initial_capital: float = 1000.0,
    fee_rate: Optional[float] = None,
    interval: str = "max",
    fidelity: int = 60,
) -> dict[str, Any]:
    """
    Run a full backtest for a strategy against historical market data.

    Returns equity curve, trades, and performance metrics.
    """
    if fee_rate is None:
        fee_rate = settings.BACKTEST_FEE_RATE

    start_time = time.time()

    # Fetch historical prices
    history = await polymarket.get_prices_history(
        token_id=token_id, interval=interval, fidelity=fidelity
    )

    if not history:
        raise ValueError(f"No historical data found for token {token_id}")

    # Extract timestamps and prices
    timestamps = []
    prices = []
    for point in history:
        t = point.get("t", 0)
        p = float(point.get("p", 0))
        timestamps.append(t)
        prices.append(p)

    if len(prices) < 10:
        raise ValueError(f"Insufficient data points ({len(prices)}) for backtesting")

    # Run simulation
    capital = initial_capital
    position = 0.0  # Number of shares held
    equity_curve = [initial_capital]
    trades: list[dict[str, Any]] = []
    entry_price = 0.0

    for i in range(1, len(prices)):
        price_window = prices[: i + 1]
        current_price = prices[i]

        # Get strategy signal
        try:
            signal = execute_strategy_signal(
                strategy_code, price_window, position, strategy_params
            )
        except ValueError:
            signal = 0

        # Execute trades
        if signal == 1 and position <= 0:
            # Buy signal
            if position < 0:
                # Close short first
                pnl = (entry_price - current_price) * abs(position)
                fee = abs(position) * current_price * fee_rate
                capital += pnl - fee
                trades.append({
                    "type": "close_short",
                    "timestamp": timestamps[i],
                    "price": current_price,
                    "size": abs(position),
                    "pnl": round(pnl - fee, 4),
                    "fee": round(fee, 4),
                })
                position = 0

            # Open long
            shares = capital / current_price
            fee = capital * fee_rate
            shares = (capital - fee) / current_price
            entry_price = current_price
            position = shares
            capital = 0
            trades.append({
                "type": "buy",
                "timestamp": timestamps[i],
                "price": current_price,
                "size": round(shares, 4),
                "pnl": 0,
                "fee": round(fee, 4),
            })

        elif signal == -1 and position >= 0:
            # Sell signal
            if position > 0:
                # Close long
                pnl = (current_price - entry_price) * position
                fee = position * current_price * fee_rate
                capital = position * current_price - fee
                trades.append({
                    "type": "close_long",
                    "timestamp": timestamps[i],
                    "price": current_price,
                    "size": round(position, 4),
                    "pnl": round(pnl - fee, 4),
                    "fee": round(fee, 4),
                })
                position = 0

            # Open short (simulated)
            shares = capital / current_price
            fee = capital * fee_rate
            shares = (capital - fee) / current_price
            entry_price = current_price
            position = -shares
            capital = 0
            trades.append({
                "type": "sell_short",
                "timestamp": timestamps[i],
                "price": current_price,
                "size": round(shares, 4),
                "pnl": 0,
                "fee": round(fee, 4),
            })

        # Calculate current equity
        if position > 0:
            equity = capital + position * current_price
        elif position < 0:
            equity = capital + (2 * entry_price - current_price) * abs(position)
        else:
            equity = capital

        equity_curve.append(round(equity, 4))

    # Close any remaining position at final price
    final_price = prices[-1]
    if position > 0:
        pnl = (final_price - entry_price) * position
        fee = position * final_price * fee_rate
        capital = position * final_price - fee
        trades.append({
            "type": "close_long",
            "timestamp": timestamps[-1],
            "price": final_price,
            "size": round(position, 4),
            "pnl": round(pnl - fee, 4),
            "fee": round(fee, 4),
        })
        position = 0
    elif position < 0:
        pnl = (entry_price - final_price) * abs(position)
        fee = abs(position) * final_price * fee_rate
        capital += pnl - fee
        trades.append({
            "type": "close_short",
            "timestamp": timestamps[-1],
            "price": final_price,
            "size": round(abs(position), 4),
            "pnl": round(pnl - fee, 4),
            "fee": round(fee, 4),
        })
        position = 0

    equity_curve[-1] = round(capital, 4)

    # Calculate metrics
    metrics = calculate_metrics(equity_curve, trades, initial_capital)

    elapsed = round(time.time() - start_time, 2)

    return {
        "equity_curve": equity_curve,
        "timestamps": timestamps,
        "prices": prices,
        "trades": trades,
        "metrics": metrics,
        "data_points": len(prices),
        "duration_seconds": elapsed,
        "initial_capital": initial_capital,
        "final_equity": equity_curve[-1] if equity_curve else initial_capital,
    }


# Built-in strategy templates
STRATEGY_TEMPLATES = {
    "moving_average_crossover": {
        "name": "Moving Average Crossover",
        "description": "Generates buy/sell signals when a short-period moving average crosses above/below a long-period moving average.",
        "code": '''def signal(prices, position, params):
    short_period = params.get('short_period', 10)
    long_period = params.get('long_period', 30)

    if len(prices) < long_period:
        return 0

    short_ma = sum(prices[-short_period:]) / short_period
    long_ma = sum(prices[-long_period:]) / long_period

    prev_short_ma = sum(prices[-short_period-1:-1]) / short_period
    prev_long_ma = sum(prices[-long_period-1:-1]) / long_period

    # Bullish crossover
    if prev_short_ma <= prev_long_ma and short_ma > long_ma:
        return 1
    # Bearish crossover
    elif prev_short_ma >= prev_long_ma and short_ma < long_ma:
        return -1
    return 0
''',
        "params": {"short_period": 10, "long_period": 30},
    },
    "mean_reversion": {
        "name": "Mean Reversion",
        "description": "Buys when price drops below the moving average by a threshold, sells when it rises above. Assumes prices revert to the mean.",
        "code": '''def signal(prices, position, params):
    lookback = params.get('lookback', 20)
    threshold = params.get('threshold', 0.05)

    if len(prices) < lookback:
        return 0

    ma = sum(prices[-lookback:]) / lookback
    current = prices[-1]

    deviation = (current - ma) / ma if ma > 0 else 0

    if deviation < -threshold:
        return 1   # Buy — price below mean
    elif deviation > threshold:
        return -1  # Sell — price above mean
    return 0
''',
        "params": {"lookback": 20, "threshold": 0.05},
    },
    "momentum_breakout": {
        "name": "Momentum Breakout",
        "description": "Buys on upward momentum when price breaks above recent high. Sells when it breaks below recent low.",
        "code": '''def signal(prices, position, params):
    lookback = params.get('lookback', 15)
    breakout_pct = params.get('breakout_pct', 0.03)

    if len(prices) < lookback + 1:
        return 0

    window = prices[-lookback-1:-1]
    high = max(window)
    low = min(window)
    current = prices[-1]

    # Upward breakout
    if current > high * (1 + breakout_pct):
        return 1
    # Downward breakout
    elif current < low * (1 - breakout_pct):
        return -1
    return 0
''',
        "params": {"lookback": 15, "breakout_pct": 0.03},
    },
}
