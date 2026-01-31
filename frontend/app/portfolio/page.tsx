"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getPortfolioSummary, getEquityCurves } from "@/lib/api";
import type { PortfolioSummary } from "@/lib/types";
import { formatCurrency, formatPct, formatDate, cn } from "@/lib/utils";

const COLORS = ["#3b82f6", "#a855f7", "#f97316", "#10b981", "#ef4444", "#eab308"];

export default function PortfolioPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [curves, setCurves] = useState<
    { strategy_id: number; market_name: string; equity_curve: number[]; timestamps: number[] }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPortfolioSummary().catch(() => null),
      getEquityCurves().catch(() => ({ curves: [] })),
    ]).then(([s, c]) => {
      setSummary(s);
      setCurves(c?.curves || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground animate-pulse">
        Loading portfolio...
      </div>
    );
  }

  // Prepare chart data
  const maxLen = Math.max(...curves.map((c) => c.equity_curve.length), 0);
  const chartData = [];
  const step = maxLen > 500 ? Math.ceil(maxLen / 500) : 1;
  for (let i = 0; i < maxLen; i += step) {
    const point: Record<string, any> = { index: i };
    curves.forEach((c, ci) => {
      if (i < c.equity_curve.length) {
        point[`strategy_${c.strategy_id}`] = c.equity_curve[i];
      }
    });
    chartData.push(point);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated performance across all strategies and backtests
        </p>
      </div>

      {!summary || summary.total_backtests === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <p>No backtest data yet.</p>
          <Link
            href="/strategies"
            className="mt-3 inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Go to Strategies
          </Link>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatCard label="Backtests" value={summary.total_backtests.toString()} />
            <StatCard
              label="Total P&L"
              value={formatCurrency(summary.total_pnl)}
              positive={summary.total_pnl > 0}
            />
            <StatCard
              label="Avg ROI"
              value={formatPct(summary.avg_roi_pct)}
              positive={summary.avg_roi_pct > 0}
            />
            <StatCard label="Avg Sharpe" value={summary.avg_sharpe.toFixed(3)} />
            <StatCard label="Avg Win Rate" value={`${summary.avg_win_rate.toFixed(1)}%`} />
          </div>

          {/* Best / Worst */}
          <div className="grid gap-4 sm:grid-cols-2">
            {summary.best_strategy && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                <p className="text-xs font-medium text-green-400">Best Performing</p>
                <p className="mt-1 font-semibold">{summary.best_strategy.market || `Strategy #${summary.best_strategy.strategy_id}`}</p>
                <p className="text-sm text-green-400">{formatPct(summary.best_strategy.roi_pct)} ROI</p>
              </div>
            )}
            {summary.worst_strategy && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-xs font-medium text-red-400">Worst Performing</p>
                <p className="mt-1 font-semibold">{summary.worst_strategy.market || `Strategy #${summary.worst_strategy.strategy_id}`}</p>
                <p className="text-sm text-red-400">{formatPct(summary.worst_strategy.roi_pct)} ROI</p>
              </div>
            )}
          </div>

          {/* Equity Curves Comparison */}
          {curves.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
                Strategy Equity Curves
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="index" tick={{ fontSize: 10, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a2e",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  {curves.map((c, i) => (
                    <Line
                      key={c.strategy_id}
                      type="monotone"
                      dataKey={`strategy_${c.strategy_id}`}
                      name={c.market_name || `Strategy #${c.strategy_id}`}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Backtests Table */}
          {summary.recent_backtests.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Recent Backtests</h2>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-muted-foreground">Market</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">P&L</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">ROI</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">Sharpe</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recent_backtests.map((bt) => (
                      <tr key={bt.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <Link href={`/backtest/${bt.id}`} className="text-primary hover:underline">
                            {bt.market_name || `Backtest #${bt.id}`}
                          </Link>
                        </td>
                        <td className={cn("px-3 py-2 text-right font-mono", bt.total_pnl > 0 ? "text-green-400" : "text-red-400")}>
                          {formatCurrency(bt.total_pnl)}
                        </td>
                        <td className={cn("px-3 py-2 text-right", bt.roi_pct > 0 ? "text-green-400" : "text-red-400")}>
                          {formatPct(bt.roi_pct)}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {bt.sharpe_ratio.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                          {formatDate(bt.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-bold",
          positive === true && "text-green-400",
          positive === false && "text-red-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}
