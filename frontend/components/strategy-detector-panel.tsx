"use client";

import { cn } from "@/lib/utils";
import type { StrategyDetection } from "@/lib/types";

interface StrategyDetectorPanelProps {
  detection: StrategyDetection;
}

const STRATEGY_COLORS: Record<string, string> = {
  momentum: "text-orange-400 bg-orange-400/10",
  mean_reversion: "text-blue-400 bg-blue-400/10",
  trend_following: "text-green-400 bg-green-400/10",
  market_making: "text-purple-400 bg-purple-400/10",
  event_driven: "text-yellow-400 bg-yellow-400/10",
  unknown: "text-muted-foreground bg-muted",
};

const STRATEGY_ICONS: Record<string, string> = {
  momentum: "🚀",
  mean_reversion: "🔄",
  trend_following: "📈",
  market_making: "⚖️",
  event_driven: "📰",
  unknown: "❓",
};

export function StrategyDetectorPanel({ detection }: StrategyDetectorPanelProps) {
  const strategyClass = STRATEGY_COLORS[detection.primary_strategy] || STRATEGY_COLORS.unknown;
  const strategyIcon = STRATEGY_ICONS[detection.primary_strategy] || STRATEGY_ICONS.unknown;
  const confidencePct = Math.round(detection.confidence * 100);

  return (
    <div className="space-y-4">
      {/* Primary Strategy */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{strategyIcon}</span>
            <div>
              <h3 className="text-lg font-semibold">
                <span className={cn("rounded px-2 py-0.5 text-sm font-bold", strategyClass)}>
                  {detection.primary_strategy.replace(/_/g, " ").toUpperCase()}
                </span>
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{detection.summary}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className={cn("text-2xl font-bold", confidencePct > 60 ? "text-green-400" : "text-yellow-400")}>
              {confidencePct}%
            </p>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                confidencePct > 60 ? "bg-green-500" : confidencePct > 30 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Pattern Scores */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Trading Patterns</h4>
          <div className="space-y-3">
            <PatternBar label="Momentum" value={detection.patterns.momentum_score ?? 0} color="bg-orange-500" />
            <PatternBar label="Mean Reversion" value={detection.patterns.mean_reversion_score ?? 0} color="bg-blue-500" />
            <PatternBar label="Concentration" value={detection.patterns.market_concentration ?? 0} color="bg-purple-500" />
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span>Trend signals: {detection.patterns.trend_following_signals ?? 0}</span>
            <span>Contrarian signals: {detection.patterns.contrarian_signals ?? 0}</span>
          </div>
        </div>

        {/* Timing Analysis */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Timing Analysis</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Holding Style</span>
              <span className="font-medium capitalize">
                {(detection.patterns.holding_style ?? "unknown").replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Holding</span>
              <span className="font-medium">{detection.timing_analysis.avg_holding_human ?? "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Peak Hour (UTC)</span>
              <span className="font-medium">{detection.timing_analysis.peak_hour_utc ?? "N/A"}:00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Peak Day</span>
              <span className="font-medium">{detection.timing_analysis.peak_day ?? "N/A"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Position Sizing */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Position Sizing</h4>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <SizingStat label="Strategy" value={detection.position_sizing.strategy?.replace(/_/g, " ") ?? "N/A"} />
          <SizingStat label="Avg Size" value={detection.position_sizing.avg_size?.toFixed(2) ?? "0"} />
          <SizingStat label="Max Size" value={detection.position_sizing.max_size?.toFixed(2) ?? "0"} />
          <SizingStat label="Min Size" value={detection.position_sizing.min_size?.toFixed(2) ?? "0"} />
          <SizingStat label="CV" value={detection.position_sizing.coefficient_of_variation?.toFixed(3) ?? "0"} />
        </div>
      </div>

      {/* Market Focus */}
      {detection.category_focus.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Top Markets</h4>
          <div className="space-y-2">
            {detection.category_focus.map((cat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      {cat.market_id.length > 16 ? `${cat.market_id.slice(0, 16)}...` : cat.market_id}
                    </span>
                    <span className="text-xs">
                      {cat.trade_count} trades ({cat.pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${Math.min(cat.pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PatternBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-1.5 rounded-full", color)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function SizingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
