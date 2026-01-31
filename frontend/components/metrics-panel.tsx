"use client";

import { cn } from "@/lib/utils";
import { formatCurrency, formatPct } from "@/lib/utils";
import type { BacktestMetrics } from "@/lib/types";

interface MetricsPanelProps {
  metrics: BacktestMetrics;
  initialCapital?: number;
  finalEquity?: number;
}

function MetricCard({
  label,
  value,
  subtext,
  positive,
}: {
  label: string;
  value: string;
  subtext?: string;
  positive?: boolean | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          positive === true && "text-green-400",
          positive === false && "text-red-400"
        )}
      >
        {value}
      </p>
      {subtext && (
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      )}
    </div>
  );
}

export function MetricsPanel({
  metrics,
  initialCapital = 1000,
  finalEquity,
}: MetricsPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <MetricCard
        label="Total P&L"
        value={formatCurrency(metrics.total_pnl)}
        positive={metrics.total_pnl > 0 ? true : metrics.total_pnl < 0 ? false : null}
      />
      <MetricCard
        label="ROI"
        value={formatPct(metrics.roi_pct)}
        positive={metrics.roi_pct > 0 ? true : metrics.roi_pct < 0 ? false : null}
      />
      <MetricCard
        label="Sharpe Ratio"
        value={metrics.sharpe_ratio.toFixed(3)}
        positive={metrics.sharpe_ratio > 1 ? true : metrics.sharpe_ratio < 0 ? false : null}
      />
      <MetricCard
        label="Max Drawdown"
        value={`${metrics.max_drawdown_pct.toFixed(2)}%`}
        positive={metrics.max_drawdown_pct < 5 ? true : false}
      />
      <MetricCard
        label="Win Rate"
        value={`${metrics.win_rate_pct.toFixed(1)}%`}
        positive={metrics.win_rate_pct > 50 ? true : metrics.win_rate_pct < 40 ? false : null}
      />
      <MetricCard
        label="Total Trades"
        value={metrics.total_trades.toString()}
      />
      <MetricCard
        label="Profit Factor"
        value={metrics.profit_factor.toFixed(2)}
        positive={metrics.profit_factor > 1 ? true : metrics.profit_factor < 1 ? false : null}
      />
      {finalEquity !== undefined && (
        <MetricCard
          label="Final Equity"
          value={formatCurrency(finalEquity)}
          subtext={`from ${formatCurrency(initialCapital)}`}
          positive={finalEquity > initialCapital ? true : finalEquity < initialCapital ? false : null}
        />
      )}
    </div>
  );
}
