"""Strategy performance metrics calculations."""

import math
from typing import Any


def calculate_metrics(
    equity_curve: list[float],
    trades: list[dict[str, Any]],
    initial_capital: float = 1000.0,
) -> dict[str, Any]:
    """Calculate comprehensive strategy performance metrics."""
    if not equity_curve or len(equity_curve) < 2:
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
            "max_consecutive_wins": 0,
            "max_consecutive_losses": 0,
        }

    final_equity = equity_curve[-1]
    total_pnl = final_equity - initial_capital
    roi_pct = (total_pnl / initial_capital) * 100 if initial_capital > 0 else 0.0

    # Returns for Sharpe ratio
    returns = []
    for i in range(1, len(equity_curve)):
        if equity_curve[i - 1] > 0:
            returns.append((equity_curve[i] - equity_curve[i - 1]) / equity_curve[i - 1])

    sharpe_ratio = 0.0
    if returns:
        avg_return = sum(returns) / len(returns)
        std_return = math.sqrt(
            sum((r - avg_return) ** 2 for r in returns) / max(len(returns) - 1, 1)
        )
        if std_return > 0:
            # Annualized assuming hourly data (8760 hours/year)
            sharpe_ratio = (avg_return / std_return) * math.sqrt(8760)

    # Max drawdown
    peak = equity_curve[0]
    max_drawdown = 0.0
    for eq in equity_curve:
        if eq > peak:
            peak = eq
        drawdown = (peak - eq) / peak if peak > 0 else 0
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    # Trade stats
    winning_trades = [t for t in trades if t.get("pnl", 0) > 0]
    losing_trades = [t for t in trades if t.get("pnl", 0) < 0]

    total_trades = len(trades)
    win_count = len(winning_trades)
    loss_count = len(losing_trades)

    win_rate_pct = (win_count / total_trades * 100) if total_trades > 0 else 0.0
    avg_win = (sum(t["pnl"] for t in winning_trades) / win_count) if win_count > 0 else 0.0
    avg_loss = (sum(t["pnl"] for t in losing_trades) / loss_count) if loss_count > 0 else 0.0

    gross_profit = sum(t["pnl"] for t in winning_trades) if winning_trades else 0
    gross_loss = abs(sum(t["pnl"] for t in losing_trades)) if losing_trades else 0
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else float("inf") if gross_profit > 0 else 0.0

    # Consecutive wins/losses
    max_consec_wins = 0
    max_consec_losses = 0
    curr_wins = 0
    curr_losses = 0
    for t in trades:
        if t.get("pnl", 0) > 0:
            curr_wins += 1
            curr_losses = 0
            max_consec_wins = max(max_consec_wins, curr_wins)
        elif t.get("pnl", 0) < 0:
            curr_losses += 1
            curr_wins = 0
            max_consec_losses = max(max_consec_losses, curr_losses)
        else:
            curr_wins = 0
            curr_losses = 0

    return {
        "total_pnl": round(total_pnl, 4),
        "roi_pct": round(roi_pct, 2),
        "sharpe_ratio": round(sharpe_ratio, 4),
        "max_drawdown_pct": round(max_drawdown * 100, 2),
        "win_rate_pct": round(win_rate_pct, 2),
        "total_trades": total_trades,
        "winning_trades": win_count,
        "losing_trades": loss_count,
        "avg_win": round(avg_win, 4),
        "avg_loss": round(avg_loss, 4),
        "profit_factor": round(profit_factor, 4) if profit_factor != float("inf") else 999.99,
        "max_consecutive_wins": max_consec_wins,
        "max_consecutive_losses": max_consec_losses,
    }
