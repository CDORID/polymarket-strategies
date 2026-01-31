"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getTraderProfile,
  getTraderPerformance,
  getTraderStrategy,
  getTraderTrades,
} from "@/lib/api";
import type {
  TraderProfile,
  TraderPerformance,
  StrategyDetection,
} from "@/lib/types";
import {
  TraderEquityCurveChart,
  MonthlyReturnsChart,
  CumulativePnlChart,
} from "@/components/trader-performance-chart";
import { StrategyDetectorPanel } from "@/components/strategy-detector-panel";
import { formatCurrency, formatPct, formatDate, cn } from "@/lib/utils";

export default function TraderProfilePage() {
  const params = useParams();
  const address = params.address as string;

  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [performance, setPerformance] = useState<TraderPerformance | null>(null);
  const [strategy, setStrategy] = useState<StrategyDetection | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "performance" | "strategy" | "trades">("overview");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTraderProfile(address).catch(() => null),
      getTraderPerformance(address).catch(() => null),
      getTraderStrategy(address).catch(() => null),
      getTraderTrades(address, 1, 100).catch(() => ({ trades: [] })),
    ]).then(([p, perf, strat, t]) => {
      setProfile(p);
      setPerformance(perf);
      setStrategy(strat);
      setTrades(t?.trades ?? []);
      setLoading(false);
    });
  }, [address]);

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground animate-pulse">
        Analyzing trader {address.slice(0, 6)}...{address.slice(-4)}...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <p className="text-lg">Could not load trader profile</p>
        <p className="mt-2 text-sm">Make sure the backend is running and the address is valid.</p>
        <Link href="/traders" className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground">
          Back to Traders
        </Link>
      </div>
    );
  }

  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{shortAddr}</h1>
          <p className="text-xs text-muted-foreground font-mono break-all">{address}</p>
        </div>
        <Link
          href="/traders"
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          ← Back
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Total P&L" value={formatCurrency(profile.total_pnl)} positive={profile.total_pnl > 0} />
        <StatCard label="ROI" value={formatPct(profile.roi_pct)} positive={profile.roi_pct > 0} />
        <StatCard label="Win Rate" value={`${profile.win_rate_pct.toFixed(1)}%`} positive={profile.win_rate_pct > 50} />
        <StatCard label="Total Trades" value={profile.total_trades.toString()} />
        <StatCard label="Volume" value={formatCurrency(profile.total_volume)} />
        <StatCard label="Markets" value={profile.unique_markets.toString()} />
      </div>

      {/* Activity Info */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {profile.first_trade && <span>First trade: {profile.first_trade}</span>}
        {profile.last_trade && <span>Last trade: {profile.last_trade}</span>}
        <span>Active positions: {profile.active_positions}</span>
        <span>Avg position: {formatCurrency(profile.avg_position_size)}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["overview", "performance", "strategy", "trades"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab profile={profile} performance={performance} strategy={strategy} />
      )}
      {activeTab === "performance" && (
        <PerformanceTab performance={performance} />
      )}
      {activeTab === "strategy" && (
        <StrategyTab strategy={strategy} />
      )}
      {activeTab === "trades" && (
        <TradesTab trades={trades} />
      )}
    </div>
  );
}

function OverviewTab({
  profile,
  performance,
  strategy,
}: {
  profile: TraderProfile;
  performance: TraderPerformance | null;
  strategy: StrategyDetection | null;
}) {
  return (
    <div className="space-y-6">
      {/* Equity curve if available */}
      {performance && performance.equity_curve.length > 1 && (
        <TraderEquityCurveChart
          equityCurve={performance.equity_curve}
          timestamps={performance.timestamps}
          cumulativePnl={performance.cumulative_pnl}
        />
      )}

      {/* Strategy summary */}
      {strategy && strategy.primary_strategy !== "unknown" && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Detected Strategy</h3>
          <div className="flex items-center gap-3">
            <span className="rounded bg-primary/10 px-3 py-1 text-sm font-bold text-primary capitalize">
              {strategy.primary_strategy.replace(/_/g, " ")}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(strategy.confidence * 100)}% confidence
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{strategy.summary}</p>
        </div>
      )}

      {/* Markets Breakdown */}
      {profile.markets_breakdown.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Top Markets</h3>
          <div className="space-y-2">
            {profile.markets_breakdown.slice(0, 10).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {m.market_id.length > 20 ? `${m.market_id.slice(0, 20)}...` : m.market_id}
                </span>
                <div className="flex gap-4 text-xs">
                  <span>{m.trades} trades</span>
                  <span className="text-green-400">{m.buys} buys</span>
                  <span className="text-red-400">{m.sells} sells</span>
                  <span className="font-medium">{formatCurrency(m.volume)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PerformanceTab({ performance }: { performance: TraderPerformance | null }) {
  if (!performance || performance.equity_curve.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        Insufficient data for performance analysis.
      </div>
    );
  }

  const metrics = performance.metrics;

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total P&L" value={formatCurrency(metrics.total_pnl ?? 0)} positive={(metrics.total_pnl ?? 0) > 0} />
        <StatCard label="ROI" value={formatPct(metrics.roi_pct ?? 0)} positive={(metrics.roi_pct ?? 0) > 0} />
        <StatCard label="Sharpe" value={(metrics.sharpe_ratio ?? 0).toFixed(3)} />
        <StatCard label="Max DD" value={`${(metrics.max_drawdown_pct ?? 0).toFixed(2)}%`} />
        <StatCard label="Win Rate" value={`${(metrics.win_rate_pct ?? 0).toFixed(1)}%`} positive={(metrics.win_rate_pct ?? 0) > 50} />
        <StatCard label="Profit Factor" value={(metrics.profit_factor ?? 0).toFixed(2)} positive={(metrics.profit_factor ?? 0) > 1} />
        <StatCard label="Avg Win" value={formatCurrency(metrics.avg_win ?? 0)} />
        <StatCard label="Avg Loss" value={formatCurrency(metrics.avg_loss ?? 0)} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TraderEquityCurveChart
          equityCurve={performance.equity_curve}
          timestamps={performance.timestamps}
          cumulativePnl={performance.cumulative_pnl}
        />
        <CumulativePnlChart
          cumulativePnl={performance.cumulative_pnl}
          timestamps={performance.timestamps}
        />
      </div>

      <MonthlyReturnsChart monthlyReturns={performance.monthly_returns} />

      {/* Market Performance */}
      {performance.market_performance.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Performance by Market</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Market</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Trades</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">P&L</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Wins</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Losses</th>
                </tr>
              </thead>
              <tbody>
                {performance.market_performance.map((mp, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">
                      {mp.market_id.length > 20 ? `${mp.market_id.slice(0, 20)}...` : mp.market_id}
                    </td>
                    <td className="px-3 py-2 text-right">{mp.trades}</td>
                    <td className={cn("px-3 py-2 text-right font-mono", mp.pnl > 0 ? "text-green-400" : "text-red-400")}>
                      {formatCurrency(mp.pnl)}
                    </td>
                    <td className="px-3 py-2 text-right text-green-400">{mp.wins}</td>
                    <td className="px-3 py-2 text-right text-red-400">{mp.losses}</td>
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

function StrategyTab({ strategy }: { strategy: StrategyDetection | null }) {
  if (!strategy) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        Strategy detection unavailable.
      </div>
    );
  }

  return <StrategyDetectorPanel detection={strategy} />;
}

function TradesTab({ trades }: { trades: any[] }) {
  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        No trades found.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden max-h-[600px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left text-xs text-muted-foreground">#</th>
            <th className="px-3 py-2 text-left text-xs text-muted-foreground">Side</th>
            <th className="px-3 py-2 text-left text-xs text-muted-foreground">Market</th>
            <th className="px-3 py-2 text-right text-xs text-muted-foreground">Price</th>
            <th className="px-3 py-2 text-right text-xs text-muted-foreground">Size</th>
            <th className="px-3 py-2 text-right text-xs text-muted-foreground">Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, i) => {
            const side = String(trade.side || "").toLowerCase();
            const isBuy = side === "buy" || side === "b";
            const ts = trade.timestamp || trade.created_at || trade.time;
            const timeStr = ts
              ? typeof ts === "number"
                ? new Date(ts * 1000).toLocaleString()
                : new Date(ts).toLocaleString()
              : "—";
            const market = String(trade.market || trade.asset_id || "");

            return (
              <tr key={i} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={cn(
                      "inline-block rounded px-1.5 py-0.5 text-xs font-medium",
                      isBuy ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    )}
                  >
                    {isBuy ? "BUY" : "SELL"}
                  </span>
                </td>
                <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  {market.length > 16 ? `${market.slice(0, 16)}...` : market}
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {parseFloat(trade.price || 0).toFixed(4)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                  {parseFloat(trade.size || trade.amount || 0).toFixed(2)}
                </td>
                <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">
                  {timeStr}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-bold",
          positive === true && "text-green-400",
          positive === false && "text-red-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}
