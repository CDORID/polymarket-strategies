"""Strategy CRUD routes."""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models.strategy import Strategy
from app.schemas.strategy import StrategyCreate, StrategyUpdate, StrategyResponse, StrategyTemplate
from app.core.backtester import STRATEGY_TEMPLATES

router = APIRouter()


@router.get("/templates", response_model=list[StrategyTemplate])
async def list_templates():
    """Get all built-in strategy templates."""
    return [
        StrategyTemplate(key=key, **template)
        for key, template in STRATEGY_TEMPLATES.items()
    ]


@router.get("/", response_model=list[StrategyResponse])
async def list_strategies(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all strategies."""
    result = await db.execute(
        select(Strategy).offset(skip).limit(limit).order_by(Strategy.created_at.desc())
    )
    strategies = result.scalars().all()
    return [_strategy_to_response(s) for s in strategies]


@router.post("/", response_model=StrategyResponse, status_code=201)
async def create_strategy(
    data: StrategyCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new strategy."""
    strategy = Strategy(
        name=data.name,
        description=data.description,
        code=data.code,
        params=json.dumps(data.params),
        template_key=data.template_key,
        is_active=data.is_active,
    )
    db.add(strategy)
    await db.commit()
    await db.refresh(strategy)
    return _strategy_to_response(strategy)


@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(strategy_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single strategy."""
    strategy = await db.get(Strategy, strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return _strategy_to_response(strategy)


@router.put("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: int,
    data: StrategyUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a strategy."""
    strategy = await db.get(Strategy, strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    if data.name is not None:
        strategy.name = data.name
    if data.description is not None:
        strategy.description = data.description
    if data.code is not None:
        strategy.code = data.code
    if data.params is not None:
        strategy.params = json.dumps(data.params)
    if data.is_active is not None:
        strategy.is_active = data.is_active

    await db.commit()
    await db.refresh(strategy)
    return _strategy_to_response(strategy)


@router.delete("/{strategy_id}", status_code=204)
async def delete_strategy(strategy_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a strategy."""
    strategy = await db.get(Strategy, strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    await db.delete(strategy)
    await db.commit()


def _strategy_to_response(strategy: Strategy) -> StrategyResponse:
    """Convert ORM model to response schema."""
    params = {}
    try:
        params = json.loads(strategy.params) if strategy.params else {}
    except json.JSONDecodeError:
        pass
    return StrategyResponse(
        id=strategy.id,
        name=strategy.name,
        description=strategy.description or "",
        code=strategy.code or "",
        params=params,
        template_key=strategy.template_key,
        is_active=strategy.is_active or False,
        created_at=strategy.created_at,
        updated_at=strategy.updated_at,
    )
