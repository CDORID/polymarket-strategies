# PolyStrat — Polymarket Strategy Platform

A full-stack platform for backtesting trading strategies, analyzing trader behavior, and exploring prediction markets on [Polymarket](https://polymarket.com).

## Features

- **Strategy Builder** — Create custom Python-based trading strategies or use built-in templates (Moving Average Crossover, Mean Reversion, Momentum Breakout)
- **Backtesting Engine** — Run strategies against historical Polymarket price data with detailed equity curves, trade logs, and performance metrics
- **Trader Analysis** — Analyze any Polymarket trader by wallet address:
  - Full trade history and positions
  - Performance metrics (PnL, Sharpe ratio, win rate, max drawdown)
  - Strategy pattern detection (momentum, mean reversion, trend following, etc.)
  - Position sizing and timing analysis
- **Market Explorer** — Browse live Polymarket markets with prices, volume, and liquidity
- **Portfolio Dashboard** — Aggregated view of all backtests and strategy performance
- **Leaderboard** — Top Polymarket traders ranked by performance

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Python, FastAPI, SQLAlchemy, httpx  |
| Frontend | Next.js 14, React 18, TypeScript   |
| Styling  | Tailwind CSS                        |
| Charts   | Recharts                            |
| Database | SQLite (async via aiosqlite)        |
| APIs     | Polymarket CLOB, Gamma, Data APIs   |

## Project Structure

```
polymarket-strategies/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route handlers
│   │   ├── core/             # Business logic (backtester, polymarket client, trader analyzer)
│   │   ├── db/               # Database setup
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── main.py           # FastAPI app entry
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── app/                  # Next.js pages (App Router)
│   ├── components/           # React components
│   ├── lib/                  # API client, types, utilities
│   ├── package.json
│   └── next.config.js
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python run.py
```

The API server starts at `http://localhost:8000`. API docs available at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:3000` and proxies API requests to the backend.

### Docker (both services)

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
- `GET /api/backtests/` — List backtest results
- `GET /api/backtests/{id}` — Get backtest detail

### Markets
- `GET /api/markets/events` — List prediction events
- `GET /api/markets/markets` — List markets
- `GET /api/markets/prices-history/{token_id}` — Historical prices
- `GET /api/markets/orderbook/{token_id}` — Order book

### Traders
- `GET /api/traders/{address}/profile` — Trader profile
- `GET /api/traders/{address}/trades` — Trade history
- `GET /api/traders/{address}/performance` — Performance metrics & equity curve
- `GET /api/traders/{address}/strategy` — Detected strategy patterns
- `GET /api/traders/leaderboard` — Top traders
- `GET /api/traders/compare?addresses=addr1,addr2` — Compare traders

### Portfolio
- `GET /api/portfolio/summary` — Aggregated portfolio metrics
- `GET /api/portfolio/equity-curve` — Combined equity curves

## Strategy Code Format

Strategies are Python functions that return a trading signal:

```python
def signal(prices, position, params):
    """
    Args:
        prices: list of historical prices up to current bar
        position: current position (positive=long, negative=short, 0=flat)
        params: dict of strategy parameters

    Returns:
        1 = buy, -1 = sell, 0 = hold
    """
    short_ma = sum(prices[-10:]) / 10
    long_ma = sum(prices[-30:]) / 30

    if short_ma > long_ma:
        return 1
    elif short_ma < long_ma:
        return -1
    return 0
```

## License

MIT
