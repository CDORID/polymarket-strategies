# PolyStrat — Polymarket Strategy Platform

A full-stack web application for backtesting, evaluating, and monitoring trading strategies on [Polymarket](https://polymarket.com) prediction markets.

![Stack](https://img.shields.io/badge/FastAPI-Backend-green) ![Stack](https://img.shields.io/badge/Next.js_14-Frontend-blue) ![Stack](https://img.shields.io/badge/SQLite-Database-orange)

## Features

### 📊 Strategy Builder
- Create and edit trading strategies with Python code
- Built-in templates: Moving Average Crossover, Mean Reversion, Momentum Breakout
- Configurable parameters (JSON)

### 🔬 Backtesting Engine
- Fetch historical price data from Polymarket CLOB API
- Sandboxed strategy execution
- Calculate PnL, Sharpe ratio, max drawdown, win rate, ROI
- Equity curve and trade log visualization

### 🔍 Trader Analyzer
- Analyze any Polymarket trader by their address
- Performance metrics: PnL, win rate, Sharpe ratio, volume
- **Strategy Detection**: automatically identify trading patterns (momentum, mean reversion, diversified, concentrated, early mover)
- Position sizing and trading frequency analysis
- Leaderboard and trader comparison
- Track favorite traders

### 🌐 Market Explorer
- Browse live Polymarket markets via Gamma API
- Filter by volume, liquidity
- One-click backtest from market explorer

### 💼 Portfolio Dashboard
- Aggregated performance across all strategies
- Strategy comparison equity curves
- Best/worst performing strategies

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python FastAPI, SQLAlchemy, httpx |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Database | SQLite (async via aiosqlite) |
| Charts | Recharts |
| APIs | Polymarket CLOB, Gamma, Data APIs (no key required) |

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python run.py
```

Backend starts at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at `http://localhost:3000`. It proxies `/api/*` to the backend.

### Docker Compose

```bash
docker-compose up --build
```

## API Endpoints

### Strategies
- `GET /api/strategies/` — List strategies
- `POST /api/strategies/` — Create strategy
- `GET /api/strategies/{id}` — Get strategy
- `PUT /api/strategies/{id}` — Update strategy
- `DELETE /api/strategies/{id}` — Delete strategy
- `GET /api/strategies/templates` — List built-in templates

### Backtests
- `POST /api/backtests/run` — Run a backtest
- `GET /api/backtests/` — List backtests
- `GET /api/backtests/{id}` — Get backtest details

### Markets
- `GET /api/markets/events` — List Polymarket events
- `GET /api/markets/markets` — List markets
- `GET /api/markets/price/{token_id}` — Current price
- `GET /api/markets/orderbook/{token_id}` — Orderbook
- `GET /api/markets/prices-history/{token_id}` — Price history

### Traders
- `GET /api/traders/{address}/profile` — Trader overview + metrics
- `GET /api/traders/{address}/trades` — Paginated trade history
- `GET /api/traders/{address}/performance` — Equity curve + metrics
- `GET /api/traders/{address}/strategy` — Detected strategy patterns
- `GET /api/traders/leaderboard` — Top traders
- `GET /api/traders/compare?addresses[]=...` — Compare traders
- `POST /api/traders/track` — Track a trader
- `GET /api/traders/tracked` — List tracked traders

### Portfolio
- `GET /api/portfolio/summary` — Aggregated portfolio metrics
- `GET /api/portfolio/equity-curve` — Combined equity curves

## Strategy Format

Strategies are Python functions that return a signal:

```python
def signal(prices, position, params):
    """
    Args:
        prices: list of historical prices up to current point
        position: current position size (positive=long, negative=short)
        params: strategy parameters dict

    Returns:
        1 (buy), -1 (sell), or 0 (hold)
    """
    lookback = params.get('lookback', 20)
    if len(prices) < lookback:
        return 0

    ma = sum(prices[-lookback:]) / lookback
    if prices[-1] < ma * 0.95:
        return 1   # Buy when price is 5% below MA
    elif prices[-1] > ma * 1.05:
        return -1  # Sell when price is 5% above MA
    return 0
```

## Project Structure

```
polymarket-strategies/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app
│   │   ├── core/
│   │   │   ├── config.py           # Settings
│   │   │   ├── polymarket.py       # Polymarket API client
│   │   │   ├── backtester.py       # Backtesting engine
│   │   │   ├── metrics.py          # Performance metrics
│   │   │   └── trader_analyzer.py  # Trader analysis engine
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── api/routes/             # API routes
│   │   └── db/                     # Database setup
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── app/                        # Next.js pages
│   │   ├── strategies/             # Strategy CRUD
│   │   ├── markets/                # Market explorer
│   │   ├── traders/                # Trader analysis
│   │   ├── backtest/               # Backtest details
│   │   └── portfolio/              # Portfolio dashboard
│   ├── components/                 # React components
│   └── lib/                        # API client, types, utils
├── docker-compose.yml
└── README.md
```

## License

MIT
