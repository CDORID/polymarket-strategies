"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStrategies } from "@/lib/api";
import type { Strategy } from "@/lib/types";
import { StrategyCard } from "@/components/strategy-card";

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStrategies()
      .then(setStrategies)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Strategies</h1>
          <p className="text-sm text-muted-foreground">
            Manage your trading strategies
          </p>
        </div>
        <Link
          href="/strategies/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Strategy
        </Link>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground animate-pulse">
          Loading strategies...
        </div>
      ) : strategies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No strategies yet.</p>
          <Link
            href="/strategies/new"
            className="mt-3 inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Create your first strategy
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {strategies.map((s) => (
            <StrategyCard key={s.id} strategy={s} />
          ))}
        </div>
      )}
    </div>
  );
}
