from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.base import init_db
from app.api.routes import strategies, backtests, markets, portfolio, traders, traders


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="PolyStrat — Polymarket Strategy Platform",
    description="Backtest and evaluate trading strategies on Polymarket prediction markets",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(strategies.router, prefix="/api/strategies", tags=["strategies"])
app.include_router(backtests.router, prefix="/api/backtests", tags=["backtests"])
app.include_router(markets.router, prefix="/api/markets", tags=["markets"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(traders.router, prefix="/api/traders", tags=["traders"])
app.include_router(traders.router, prefix="/api/traders", tags=["traders"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "polystrat"}
