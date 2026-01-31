"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLeaderboard, getTrackedTraders, trackTrader, untrackTrader } from "@/lib/api";
import type { LeaderboardEntry, TrackedTrader } from "@/lib/types";
import { TraderCard } from "@/components/trader-card";
import { formatCurrency, cn } from "@/lib/utils";

export default function TradersPage() {
  const router = useRouter();
  const [searchAddress, setSearchAddress] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tracked, setTracked] = useState<TrackedTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState("");

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      getLeaderboard(30).catch((err) => {
        setLeaderboardError("Leaderboard API unavailable — search by address instead.");
        return { entries: [], total: 0 };
      }),
      getTrackedTraders().catch(() => []),
    ]).then(([lb, tr]) => {
      setLeaderboard(lb.entries || []);
      setTracked(tr);
      setLoading(false);
    });
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const addr = searchAddress.trim();
    if (addr) {
      router.push(`/traders/${addr}`);
    }
  }

  function toggleCompare(address: string) {
    setSelectedAddresses((prev) =>
      prev.includes(address)
        ? prev.filter((a) => a !== address)
        : prev.length < 5
        ? [...prev, address]
        : prev
    );
  }

  function goCompare() {
    if (selectedAddresses.length >= 2) {
      const params = selectedAddresses.map((a) => `addresses[]=${a}`).join("&");
      router.push(`/traders?compare=true&${params}`);
    }
  }

  async function handleTrack(address: string) {
    try {
      const t = await trackTrader({ address });
      setTracked((prev) => [t, ...prev]);
    } catch {}
  }

  async function handleUntrack(address: string) {
    try {
      await untrackTrader(address);
      setTracked((prev) => prev.filter((t) => t.address !== address));
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trader Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Analyze any Polymarket trader — search by address or explore the leaderboard
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
          placeholder="Enter trader address (0x...)"
          className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Analyze
        </button>
        <button
          type="button"
          onClick={() => setCompareMode(!compareMode)}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
            compareMode
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:bg-accent"
          )}
        >
          {compareMode ? `Compare (${selectedAddresses.length})` : "Compare"}
        </button>
      </form>

      {compareMode && selectedAddresses.length >= 2 && (
        <button
          onClick={goCompare}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Compare {selectedAddresses.length} Traders →
        </button>
      )}

      {/* Tracked Traders */}
      {tracked.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">📌 Tracked Traders</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tracked.map((t) => (
              <div key={t.id} className="relative group">
                <TraderCard
                  address={t.address}
                  displayName={t.alias || null}
                  profitLoss={t.total_pnl}
                  compact
                />
                <button
                  onClick={() => handleUntrack(t.address)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive transition-opacity"
                >
                  Untrack
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h2 className="text-lg font-semibold mb-3">🏆 Leaderboard</h2>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground animate-pulse">
            Loading leaderboard...
          </div>
        ) : leaderboardError ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">{leaderboardError}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              You can still analyze any trader by entering their address above.
            </p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No leaderboard data available.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {compareMode && <th className="px-3 py-2 w-8" />}
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Rank</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Trader</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">P&L</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Volume</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Markets</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Win Rate</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.address} className="border-t border-border hover:bg-muted/30">
                    {compareMode && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedAddresses.includes(entry.address)}
                          onChange={() => toggleCompare(entry.address)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 text-muted-foreground font-medium">
                      #{entry.rank}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={`/traders/${entry.address}`}
                        className="text-primary hover:underline"
                      >
                        {entry.display_name || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                      </a>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        entry.profit_loss > 0 ? "text-green-400" : "text-red-400"
                      )}
                    >
                      {formatCurrency(entry.profit_loss)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {formatCurrency(entry.volume)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {entry.markets_traded}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {entry.win_rate != null ? `${entry.win_rate.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleTrack(entry.address)}
                        className="rounded bg-muted px-2 py-0.5 text-xs hover:bg-primary/10 hover:text-primary"
                      >
                        Track
                      </button>
                    </td>
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
