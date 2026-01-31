"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLeaderboard, getTrackedTraders } from "@/lib/api";
import type { LeaderboardEntry, TrackedTrader } from "@/lib/types";
import { TraderCard } from "@/components/trader-card";
import { formatCurrency, cn } from "@/lib/utils";

export default function TradersPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tracked, setTracked] = useState<TrackedTrader[]>([]);
  const [searchAddr, setSearchAddr] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "tracked">("leaderboard");

  useEffect(() => {
    Promise.all([
      getLeaderboard(50).catch(() => ({ entries: [], total: 0 })),
      getTrackedTraders().catch(() => []),
    ]).then(([lb, tr]) => {
      setLeaderboard(lb.entries);
      setTracked(tr);
      setLoading(false);
    });
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const addr = searchAddr.trim();
    if (addr) {
      router.push(`/traders/${addr}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trader Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Analyze trader performance, detect strategies, and track top performers
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={searchAddr}
          onChange={(e) => setSearchAddr(e.target.value)}
          placeholder="Enter wallet address (0x...)"
          className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Analyze
        </button>
      </form>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "leaderboard"
              ? "bg-background text-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={() => setActiveTab("tracked")}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "tracked"
              ? "bg-background text-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          ⭐ Tracked ({tracked.length})
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground animate-pulse">
          Loading traders...
        </div>
      ) : activeTab === "leaderboard" ? (
        <LeaderboardView entries={leaderboard} />
      ) : (
        <TrackedView traders={tracked} />
      )}
    </div>
  );
}

function LeaderboardView({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        <p className="text-lg">No leaderboard data available</p>
        <p className="mt-2 text-sm">
          The Polymarket leaderboard API may be unavailable. Try searching for a specific trader address above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table view */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Trader</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">P&L</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Volume</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Markets</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.address} className="border-t border-border hover:bg-muted/30 cursor-pointer">
                <td className="px-4 py-3">
                  <span className="font-bold text-primary">#{entry.rank}</span>
                </td>
                <td className="px-4 py-3">
                  <a href={`/traders/${entry.address}`} className="hover:text-primary transition-colors">
                    <span className="font-medium">
                      {entry.display_name || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                    </span>
                    {entry.display_name && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                      </span>
                    )}
                  </a>
                </td>
                <td className={cn("px-4 py-3 text-right font-mono font-medium", entry.profit_loss > 0 ? "text-green-400" : "text-red-400")}>
                  {formatCurrency(entry.profit_loss)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {formatCurrency(entry.volume)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {entry.markets_traded}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {entry.win_rate !== null ? `${entry.win_rate.toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrackedView({ traders }: { traders: TrackedTrader[] }) {
  if (traders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        <p className="text-lg">No tracked traders yet</p>
        <p className="mt-2 text-sm">
          Search for a trader above and add them to your tracking list.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {traders.map((t) => (
        <TraderCard
          key={t.id}
          address={t.address}
          displayName={t.alias || undefined}
          totalTrades={t.total_trades}
          totalPnl={t.total_pnl}
          winRate={t.win_rate}
          strategy={t.detected_strategy !== "unknown" ? t.detected_strategy : undefined}
        />
      ))}
    </div>
  );
}
