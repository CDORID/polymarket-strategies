"use client";

import { formatCurrency } from "@/lib/utils";

interface MarketCardProps {
  market: {
    id?: string;
    question?: string;
    slug?: string;
    volume?: number;
    volume24hr?: number;
    liquidity?: number;
    outcomePrices?: string;
    outcomes?: string;
    clobTokenIds?: string;
    bestBid?: number;
    bestAsk?: number;
    active?: boolean;
  };
  onSelect?: (tokenId: string, question: string) => void;
}

export function MarketCard({ market, onSelect }: MarketCardProps) {
  let prices: number[] = [];
  let outcomes: string[] = [];
  let tokenIds: string[] = [];

  try {
    if (market.outcomePrices) {
      const parsed = JSON.parse(market.outcomePrices);
      prices = parsed.map((p: string) => parseFloat(p));
    }
  } catch {}

  try {
    if (market.outcomes) {
      outcomes = JSON.parse(market.outcomes);
    }
  } catch {}

  try {
    if (market.clobTokenIds) {
      tokenIds = JSON.parse(market.clobTokenIds);
    }
  } catch {}

  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all">
      <h3 className="font-medium text-sm text-foreground line-clamp-2">
        {market.question || "Unknown Market"}
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {outcomes.map((outcome, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded bg-muted px-2 py-1"
          >
            <span className="text-xs text-muted-foreground">{outcome}</span>
            <span className="text-xs font-semibold text-foreground">
              {prices[i] !== undefined ? `${(prices[i] * 100).toFixed(1)}¢` : "—"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex gap-3">
          {market.volume24hr !== undefined && (
            <span>24h Vol: {formatCurrency(market.volume24hr)}</span>
          )}
          {market.liquidity !== undefined && (
            <span>Liq: {formatCurrency(market.liquidity)}</span>
          )}
        </div>

        {tokenIds.length > 0 && onSelect && (
          <button
            onClick={() => onSelect(tokenIds[0], market.question || "")}
            className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            Backtest
          </button>
        )}
      </div>
    </div>
  );
}
