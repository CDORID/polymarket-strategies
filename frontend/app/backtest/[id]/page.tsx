"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getBacktest } from "@/lib/api";
import type { BacktestResult } from "@/lib/types";
import { MetricsPanel } from "@/components/metrics-panel";
import { EquityCurveChart, PriceChart } from "@/components/backtest-chart";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export default function BacktestDetailPage() {
  const params = useParams();
  const backtestId = Number(params.id);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBacktest(backtestId)
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [backtestId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground animate-pulse">
        Loading backtest...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Backtest not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Backtest #{result.id}
          </h1>
          <p className="text-sm text-muted-foreground">
            {result.market_name || result.token_id}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Strategy #{result.strategy_id} • {result.data_points} data points • {result.duration_seconds}s
          </p>
        </div>
        <Link
          href={`/strategies/${result.strategy_id}`}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          View Strategy
        </Link>
      </div>

      {/* Metrics */}
      <MetricsPanel
        metrics={result.metrics}
        initialCapital={result.initial_capital}
        finalEquity={result.final_equity}
      />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EquityCurveChart
          equityCurve={result.equity_curve}
          prices={result.prices}
          timestamps={result.timestamps}
          initialCapital={result.initial_capital}
        />
        <PriceChart
          prices={result.prices}
          timestamps={result.timestamps}
        />
      </div>

      {/* Trade Log */}
      {result.trades.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Trade Log ({result.trades.length} trades)
          </h2>
          <div className="rounded-lg border border-border overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Price</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Size</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">P&L</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Fee</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((trade, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-xs font-medium",
                          trade.type.includes("buy") || trade.type === "close_short"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        )}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {trade.price.toFixed(4)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                      {trade.size.toFixed(2)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-1.5 text-right font-mono",
                        trade.pnl > 0
                          ? "text-green-400"
                          : trade.pnl < 0
                          ? "text-red-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {trade.pnl !== 0 ? formatCurrency(trade.pnl) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">
                      {formatCurrency(trade.fee)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">
                      {trade.timestamp
                        ? new Date(trade.timestamp * 1000).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
