"use client";

import Link from "next/link";
import { formatCurrency, formatPct, cn } from "@/lib/utils";

interface TraderCardProps {
  address: string;
  displayName?: string | null;
  totalTrades?: number;
  totalPnl?: number;
  volume?: number;
  winRate?: number | null;
  marketsTraded?: number;
  rank?: number;
  strategy?: string;
}

export function TraderCard({
  address,
  displayName,
  totalTrades,
  totalPnl = 0,
  volume = 0,
  winRate,
  marketsTraded,
  rank,
  strategy,
}: TraderCardProps) {
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <Link href={`/traders/${address}`}>
      <div className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {rank !== undefined && (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                #{rank}
              </span>
            )}
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {displayName || shortAddr}
              </h3>
              {displayName && (
                <p className="text-xs text-muted-foreground font-mono">{shortAddr}</p>
              )}
            </div>
          </div>
          <span
            className={cn(
              "text-lg font-bold",
              totalPnl > 0 ? "text-green-400" : totalPnl < 0 ? "text-red-400" : "text-muted-foreground"
            )}
          >
            {formatCurrency(totalPnl)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {volume > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Volume</p>
              <p className="text-sm font-medium">{formatCurrency(volume)}</p>
            </div>
          )}
          {winRate !== undefined && winRate !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className={cn("text-sm font-medium", winRate > 50 ? "text-green-400" : "text-muted-foreground")}>
                {winRate.toFixed(1)}%
              </p>
            </div>
          )}
          {marketsTraded !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground">Markets</p>
              <p className="text-sm font-medium">{marketsTraded}</p>
            </div>
          )}
          {totalTrades !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground">Trades</p>
              <p className="text-sm font-medium">{totalTrades}</p>
            </div>
          )}
        </div>

        {strategy && (
          <div className="mt-3">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {strategy.replace(/_/g, " ")}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
