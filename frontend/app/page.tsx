"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStrategies, getBacktests, getPortfolioSummary } from "@/lib/api";
import type { Strategy, BacktestSummary, PortfolioSummary } from "@/lib/types";
import { formatCurrency, formatPct, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [backtests, setBacktests] = useState<BacktestSummary[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStrategies().catch(() => []),
      getBacktests().catch(() => []),
      getPortfolioSummary().catch(() => null),
    ]).then(([s, b, p]) => {
      setStrategies(s);
      setBacktests(b);
      setPortfolio(p);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your Polymarket trading strategies
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Strategies"
          value={strategies.length.toString()}
          href="/strategies"
        />
        <SummaryCard
          label="Backtests"
          value={(portfolio?.total_backtests ?? backtests.length).toString()}
        />
        <SummaryCard
          label="Avg ROI"
          value={portfolio ? formatPct(portfolio.avg_roi_pct) : "—"}
          positive={portfolio ? portfolio.avg_roi_pct > 0 : undefined}
        />
        <SummaryCard
          label="Total P&L"
          value={portfolio ? formatCurrency(portfolio.total_pnl) : "—"}
          positive={portfolio ? portfolio.total_pnl > 0 : undefined}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link
          href="/strategies/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New Strategy
        </Link>
        <Link
          href="/markets"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Explore Markets
        </Link>
        <Link
          href="/traders"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          🔍 Analyze Traders
        </Link>
      </div>

      {/* Recent Backtests */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Backtests</h2>
        {backtests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No backtests yet. Create a strategy and run your first backtest!
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Market</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">P&L</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">ROI</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Sharpe</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Win Rate</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Trades</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {backtests.slice(0, 10).map((bt) => (
                  <tr key={bt.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <Link
                        href={`/backtest/${bt.id}`}
                        className="text-primary hover:underline"
                      >
                        {bt.market_name || bt.token_id.slice(0, 12) + "..."}
                      </Link>
                    </td>
                    <td className={cn("px-4 py-2 text-right font-mono", bt.total_pnl > 0 ? "text-green-400" : "text-red-400")}>
                      {formatCurrency(bt.total_pnl)}
                    </td>
                    <td className={cn("px-4 py-2 text-right", bt.roi_pct > 0 ? "text-green-400" : "text-red-400")}>
                      {formatPct(bt.roi_pct)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{bt.sharpe_ratio.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{bt.win_rate_pct.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{bt.total_trades}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">{formatDate(bt.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  href,
  positive,
}: {
  label: string;
  value: string;
  href?: string;
  positive?: boolean;
}) {
  const content = (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          positive === true && "text-green-400",
          positive === false && "text-red-400"
        )}
      >
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
