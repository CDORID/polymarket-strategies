import type {
  Strategy,
  StrategyTemplate,
  BacktestResult,
  BacktestSummary,
  PolymarketEvent,
  PolymarketMarket,
  PortfolioSummary,
  TraderProfile,
  TraderPerformance,
  StrategyDetection,
  LeaderboardEntry,
  TraderComparison,
  TrackedTrader,
} from "./types";

const API_BASE = "/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Strategies ────────────────────────────────────────────

export async function getStrategies(): Promise<Strategy[]> {
  return fetchJSON("/strategies/");
}

export async function getStrategy(id: number): Promise<Strategy> {
  return fetchJSON(`/strategies/${id}`);
}

export async function createStrategy(data: {
  name: string;
  description: string;
  code: string;
  params: Record<string, any>;
  template_key?: string;
}): Promise<Strategy> {
  return fetchJSON("/strategies/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateStrategy(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    code: string;
    params: Record<string, any>;
    is_active: boolean;
  }>
): Promise<Strategy> {
  return fetchJSON(`/strategies/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteStrategy(id: number): Promise<void> {
  await fetch(`${API_BASE}/strategies/${id}`, { method: "DELETE" });
}

export async function getTemplates(): Promise<StrategyTemplate[]> {
  return fetchJSON("/strategies/templates");
}

// ── Backtests ─────────────────────────────────────────────

export async function runBacktest(data: {
  strategy_id: number;
  token_id: string;
  market_name?: string;
  initial_capital?: number;
}): Promise<BacktestResult> {
  return fetchJSON("/backtests/run", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getBacktests(
  strategyId?: number
): Promise<BacktestSummary[]> {
  const params = strategyId ? `?strategy_id=${strategyId}` : "";
  return fetchJSON(`/backtests/${params}`);
}

export async function getBacktest(id: number): Promise<BacktestResult> {
  return fetchJSON(`/backtests/${id}`);
}

// ── Markets ───────────────────────────────────────────────

export async function getEvents(
  limit = 20,
  offset = 0
): Promise<PolymarketEvent[]> {
  return fetchJSON(`/markets/events?limit=${limit}&offset=${offset}`);
}

export async function getMarkets(
  limit = 20,
  offset = 0,
  order = "volume24hr"
): Promise<PolymarketMarket[]> {
  return fetchJSON(
    `/markets/markets?limit=${limit}&offset=${offset}&order=${order}`
  );
}

export async function getPriceHistory(
  tokenId: string
): Promise<{ t: number; p: string }[]> {
  return fetchJSON(`/markets/prices-history/${tokenId}`);
}

export async function getOrderbook(
  tokenId: string
): Promise<{ bids: any[]; asks: any[] }> {
  return fetchJSON(`/markets/orderbook/${tokenId}`);
}

// ── Portfolio ─────────────────────────────────────────────

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  return fetchJSON("/portfolio/summary");
}

export async function getEquityCurves(): Promise<{
  curves: {
    strategy_id: number;
    market_name: string;
    equity_curve: number[];
    timestamps: number[];
  }[];
}> {
  return fetchJSON("/portfolio/equity-curve");
}

// ── Traders ───────────────────────────────────────────────

export async function getTraderProfile(address: string): Promise<TraderProfile> {
  return fetchJSON(`/traders/${address}/profile`);
}

export async function getTraderTrades(
  address: string,
  page = 1,
  perPage = 50
): Promise<{ address: string; trades: any[]; total: number; page: number; per_page: number }> {
  return fetchJSON(`/traders/${address}/trades?page=${page}&per_page=${perPage}`);
}

export async function getTraderPerformance(address: string): Promise<TraderPerformance> {
  return fetchJSON(`/traders/${address}/performance`);
}

export async function getTraderStrategy(address: string): Promise<StrategyDetection> {
  return fetchJSON(`/traders/${address}/strategy`);
}

export async function getLeaderboard(
  limit = 50
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
  return fetchJSON(`/traders/leaderboard?limit=${limit}`);
}

export async function compareTraders(addresses: string[]): Promise<TraderComparison> {
  return fetchJSON(`/traders/compare?addresses=${addresses.join(",")}`);
}

export async function getTrackedTraders(): Promise<TrackedTrader[]> {
  return fetchJSON("/traders/tracked");
}

export async function trackTrader(data: {
  address: string;
  alias?: string;
  notes?: string;
}): Promise<TrackedTrader> {
  return fetchJSON("/traders/tracked", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function untrackTrader(address: string): Promise<void> {
  await fetch(`${API_BASE}/traders/tracked/${address}`, { method: "DELETE" });
}
