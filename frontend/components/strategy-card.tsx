"use client";

import Link from "next/link";
import type { Strategy } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

interface StrategyCardProps {
  strategy: Strategy;
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  return (
    <Link href={`/strategies/${strategy.id}`}>
      <div className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {strategy.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {strategy.description || "No description"}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
              strategy.is_active
                ? "bg-green-500/10 text-green-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {strategy.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          {strategy.template_key && (
            <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
              {strategy.template_key}
            </span>
          )}
          <span>
            Params: {Object.keys(strategy.params).length}
          </span>
          <span>{formatDate(strategy.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
