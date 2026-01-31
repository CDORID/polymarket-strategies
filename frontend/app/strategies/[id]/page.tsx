"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getStrategy, getBacktests, runBacktest, deleteStrategy } from "@/lib/api";
import type { Strategy, BacktestSummary, BacktestResult } from "@/lib/types";
import { MetricsPanel } from "@/components/metrics-panel";
import { EquityCurveChart, PriceChart } from "@/components/backtest-chart";
import { formatCurrency, formatPct, formatDate, cn } from "@/lib/utils";

export default function StrategyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const strategyId = Number(params.id);

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [backtests, setBacktests] = useState<BacktestSummary[]>([]);
  const [latestResult, setLatestResult] = useState<BacktestResult | null>(null);
  const [tokenId, setTokenId] = useState("");
  const [marketName, setMarketName] = useState("");
  const [capital, setCapital] = useState("1000");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStrategy(strategyId),
      getBacktests(strategyId),
    ])
      .then(([s, b]) => {
        setStrategy(s);
        setBacktests(b);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [strategyId]);

  async function handleRunBacktest(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenId.trim()) return;
    setError("");
    setRunning(true);

    try {
      const result = await runBacktest({
        strategy_id: strategyId,
        token_id: tokenId.trim(),
        market_name: marketName.trim(),
        initial_capital: parseFloat(capital) || 1000,
      });
      setLatestResult(result);
      // Refresh backtest list
      getBacktests(strategyId).then(setBacktests).catch(() => {});
    } catch (err: any) {
      setError(err.message || "Backtest failed");
    } finally {
      setRunning(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this strategy?")) return;
    try {
      await deleteStrategy(strategyId);
      router.push("/strategies");
    } catch {}
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground animate-pulse">
        Loading strategy...
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Strategy not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{strategy.name}</h1>
          <p className="text-sm text-muted-foreground">{strategy.description}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/strategies/new`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Duplicate
          </Link>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-destructive/50 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Strategy Code */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">Strategy Code</h2>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs font-mono text-foreground">
          {strategy.code}
        </pre>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span>Parameters: {JSON.stringify(strategy.params)}</span>
          {strategy.template_key && <span>Template: {strategy.template_key}</span>}
        </div>
      </div>

      {/* Run Backtest */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Run Backtest</h2>
        <form onSubmit={handleRunBacktest} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-muted-foreground mb-1">Token ID</label>
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="Polymarket CLOB token ID"
              required
              className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="w-48">
            <label className="block text-xs text-muted-foreground mb-1">Market Name</label>
            <input
              type="text"
              value={marketName}
              onChange={(e) => setMarketName(e.target.value)}
              placeholder="Optional label"
              className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs text-muted-foreground mb-1">Capital ($)</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={running}
            className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {running ? "Running..." : "Run Backtest"}
          </button>
        </form>
        {error && (
          <div className="mt-3 rounded bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Latest Result */}
      {latestResult && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Latest Result</h2>
          <MetricsPanel
            metrics={latestResult.metrics}
            initialCapital={latestResult.initial_capital}
            finalEquity={latestResult.final_equity}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <EquityCurveChart
              equityCurve={latestResult.equity_curve}
              prices={latestResult.prices}
              timestamps={latestResult.timestamps}
              initialCapital={latestResult.initial_capital}
            />
            <PriceChart
              prices={latestResult.prices}
              timestamps={latestResult.timestamps}
            />
          </div>
        </div>
      )}

      {/* Backtest History */}
      {backtests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Backtest History</h2>
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
                {backtests.map((bt) => (
                  <tr key={bt.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link href={`/backtest/${bt.id}`} className="text-primary hover:underline">
                        {bt.market_name || bt.token_id.slice(0, 16) + "..."}
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
    </div>
  );
}
