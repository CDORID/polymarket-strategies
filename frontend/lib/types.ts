export interface Strategy {
  id: number;
  name: string;
  description: string;
  code: string;
  params: Record<string, any>;
  template_key: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface StrategyTemplate {
  key: string;
  name: string;
  description: string;
  code: string;
  params: Record<string, any>;
}

export interface BacktestMetrics {
  total_pnl: number;
  roi_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  max_consecutive_wins: number;
  max_consecutive_losses: number;
}

export interface BacktestResult {
  id: number;
  strategy_id: number;
  token_id: string;
  market_name: string;
  equity_curve: number[];
  timestamps: number[];
  prices: number[];
  trades: TradeRecord[];
  metrics: BacktestMetrics;
  initial_capital: number;
  final_equity: number;
  data_points: number;
  duration_seconds: number;
  created_at: string | null;
}

export interface BacktestSummary {
  id: number;
  strategy_id: number;
  token_id: string;
  market_name: string;
  total_pnl: number;
  roi_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  total_trades: number;
  created_at: string | null;
}

export interface TradeRecord {
  type: string;
  timestamp: number;
  price: number;
  size: number;
  pnl: number;
  fee: number;
}

export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  markets: PolymarketMarket[];
  active: boolean;
  closed: boolean;
  volume: number;
  liquidity: number;
  startDate: string;
  endDate: string;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  active: boolean;
  closed: boolean;
  volume: number;
  volume24hr: number;
  liquidity: number;
  outcomePrices: string;
  outcomes: string;
  clobTokenIds: string;
  bestBid: number;
  bestAsk: number;
}

// ── Trader Types ──────────────────────────────────────────

export interface TraderProfile {
  address: string;
  total_trades: number;
  total_volume: number;
  total_pnl: number;
  roi_pct: number;
  win_rate_pct: number;
  avg_position_size: number;
  unique_markets: number;
  first_trade: string | null;
  last_trade: string | null;
  active_positions: number;
  markets_breakdown: { market_id: string; trades: number; volume: number; buys: number; sells: number }[];
}

export interface TraderPerformance {
  address: string;
  equity_curve: number[];
  timestamps: number[];
  cumulative_pnl: number[];
  monthly_returns: { month: string; pnl: number }[];
  market_performance: { market_id: string; trades: number; pnl: number; wins: number; losses: number; roi_pct: number }[];
  metrics: Record<string, number>;
}

export interface StrategyDetection {
  address: string;
  primary_strategy: string;
  confidence: number;
  patterns: Record<string, any>;
  category_focus: { market_id: string; trade_count: number; pct: number }[];
  timing_analysis: Record<string, any>;
  position_sizing: Record<string, any>;
  summary: string;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  display_name: string | null;
  profit_loss: number;
  volume: number;
  markets_traded: number;
  win_rate: number | null;
}

export interface TraderComparison {
  traders: Record<string, any>[];
}

export interface TrackedTrader {
  id: number;
  address: string;
  alias: string;
  notes: string;
  total_trades: number;
  total_pnl: number;
  win_rate: number;
  avg_position_size: number;
  detected_strategy: string;
  last_analyzed: string | null;
  tracked_since: string | null;
  is_favorite: boolean;
}

// ── Portfolio Types ───────────────────────────────────────

export interface PortfolioSummary {
  total_backtests: number;
  total_pnl: number;
  avg_roi_pct: number;
  avg_sharpe: number;
  avg_win_rate: number;
  best_strategy: {
    backtest_id: number;
    strategy_id: number;
    market: string;
    roi_pct: number;
  } | null;
  worst_strategy: {
    backtest_id: number;
    strategy_id: number;
    market: string;
    roi_pct: number;
  } | null;
  recent_backtests: {
    id: number;
    strategy_id: number;
    market_name: string;
    total_pnl: number;
    roi_pct: number;
    sharpe_ratio: number;
    created_at: string | null;
  }[];
}
