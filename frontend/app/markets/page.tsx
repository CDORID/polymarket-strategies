"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMarkets } from "@/lib/api";
import type { PolymarketMarket } from "@/lib/types";
import { MarketCard } from "@/components/market-card";

export default function MarketsPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    getMarkets(limit, offset)
      .then(setMarkets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [offset]);

  function handleSelect(tokenId: string, question: string) {
    // Navigate to strategy list with pre-selected market info
    const params = new URLSearchParams({ token_id: tokenId, market_name: question });
    router.push(`/strategies?${params}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Market Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Browse Polymarket prediction markets — click "Backtest" to test a strategy
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <p className="mt-1 text-xs">Make sure the backend is running on port 8000.</p>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-muted-foreground animate-pulse">
          Loading markets...
        </div>
      ) : markets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No markets found. The Polymarket API may be unavailable.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {markets.map((m, i) => (
              <MarketCard
                key={m.id || i}
                market={m}
                onSelect={handleSelect}
              />
            ))}
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded border border-border px-4 py-1.5 text-sm disabled:opacity-30"
            >
              ← Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-muted-foreground">
              Page {Math.floor(offset / limit) + 1}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={markets.length < limit}
              className="rounded border border-border px-4 py-1.5 text-sm disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
