"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getTraderProfile,
  getTraderPerformance,
  getTraderStrategy,
  getTraderTrades,
  trackTrader,
} from "@/lib/api";
import type {
  TraderProfile,
  TraderPerformance,
  StrategyDetection,
} from "@/lib/types";
import {
  TraderEquityCurve,
  MonthlyReturnsChart,
  TraderMetricsGrid,
} from "@/components/trader-performance-chart";
import { StrategyDetectorPanel } from "@/components/strategy-detector-panel";
import { formatCurrency, formatPct, formatDate, cn } from "@/lib/utils";

type Tab = "overview" | "strategy" | "trades";

export default function TraderProfilePage() {
  const params = useParams();
  const address = params.address as string;
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [performance, setPerformance] = useState<TraderPerformance | null>(null);
  const [strategy, setStrategy] = useState<StrategyDetection | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      getTraderProfile(address).catch(() => null),
      getTraderPerformance(address).catch(() => null),
      getTraderStrategy(address).catch(() => null),
      getTraderTrades(address, 1, 100)
        .then((r) => r.trades)
        .catch(() => []),
    ])
      .then(([prof, perf, strat, trd]) => {
        if (!prof && !perf) {
          setError(
            "No data found for this address. Make sure it's a valid Polymarket trader address."
          );
        }
        setProfile(prof);
        setPerformance(perf);
        setStrategy(strat);
        setTrades(trd);
      })
      .finally(() => setLoading(false));
  }, [address]);

  async function handleTrack() {
    setTracking(true);
    try {
      await trackTrader({ address });
    } catch {}
    setTracking(false);
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground animate-pulse">
        Analyzing trader {shortAddr}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-destructive">{error}</p>
        <Link
          href="/traders"
          className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          ← Back to Traders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trader Profile</h1>
          <p className="font-mono text-sm text-muted-foreground">{address}</p>
          {profile && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{profile.total_trades} trades</span>
              <span>{profile.unique_markets} markets</span>
              {profile.first_trade && (
                <span>Since {new Date(profile.first_trade).toLocaleDateString()}</span>
              )}
              <span>{profile.active_positions} open positions</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTrack}
            disabled={tracking}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            {tracking ? "Tracking..." : "📌 Track"}
          </button>
          <a
            href={`https://polymarket.com/profile/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            View on Polymarket ↗
          </a>
        </div>
      </div>

      {/* Summary Stats */}
      {profile && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard
            label="Total P&L"
            value={formatCurrency(profile.total_pnl)}
            positive={profile.total_pnl > 0}
          />
          <StatCard
            label="ROI"
            value={formatPct(profile.roi_pct)}
            positive={profile.roi_pct > 0}
          />
          <StatCard
            label="Win Rate"
            value={`${profile.win_rate_pct.toFixed(1)}%`}
            positive={profile.win_rate_pct > 50}
          />
          <StatCard
            label="Volume"
            value={formatCurrency(profile.total_volume)}
          />
          <StatCard
            label="Avg Position"
            value={profile.avg_position_size.toFixed(2)}
          />
          <StatCard
            label="Markets"
            value={profile.unique_markets.toString()}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["overview", "strategy", "trades"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-4">
          {performance && (
            <>
              <TraderMetricsGrid performance={performance} />
              <div className="grid gap-4 lg:grid-cols-2">
                <TraderEquityCurve performance={performance} />
                <MonthlyReturnsChart performance={performance} />
              </div>
            </>
          )}

          {/* Markets Breakdown */}
          {profile && profile.markets_breakdown.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Top Markets ({profile.markets_breakdown.length})
              </h2>
              <div className="rounded-lg border border-border overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-muted-foreground">Market</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">Trades</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">Buys</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">Sells</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">Est. P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.markets_breakdown.map((m, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-1.5 font-mono text-xs truncate max-w-[200px]">
                          {m.asset_ticker || m.market_id.slice(0, 16) + "..."}
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">
                          {m.total_trades}
                        </td>
                        <td className="px-3 py-1.5 text-right text-green-400/70">
                          {m.buys}
                        </td>
                        <td className="px-3 py-1.5 text-right text-red-400/70">
                          {m.sells}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-1.5 text-right font-mono",
                            m.estimated_pnl > 0
                              ? "text-green-400"
                              : m.estimated_pnl < 0
                              ? "text-red-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatCurrency(m.estimated_pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "strategy" && (
        <div>
          {strategy ? (
            <StrategyDetectorPanel detection={strategy} />
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              Could not detect strategy patterns.
            </div>
          )}
        </div>
      )}

      {tab === "trades" && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Trade History ({trades.length} trades)
          </h2>
          {trades.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No trades found.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Time</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Market</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Side</th>
                    <th className="px-3 py-2 text-right text-xs text-muted-foreground">Price</th>
                    <th className="px-3 py-2 text-right text-xs text-muted-foreground">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, i) => {
                    const side = (trade.side || "").toLowerCase();
                    const isBuy = side === "buy" || side === "b";
                    return (
                      <tr key={i} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">
                          {trade.timestamp || trade.created_at
                            ? new Date(
                                (trade.timestamp || trade.created_at) * 1000 ||
                                  trade.created_at
                              ).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-xs font-mono truncate max-w-[200px]">
                          {trade.asset_ticker || trade.market?.slice(0, 16) || "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-xs font-medium",
                              isBuy
                                ? "bg-green-500/10 text-green-400"
                                : "bg-red-500/10 text-red-400"
                            )}
                          >
                            {isBuy ? "BUY" : "SELL"}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {parseFloat(trade.price || 0).toFixed(4)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                          {parseFloat(trade.size || trade.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
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
