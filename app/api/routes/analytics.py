from fastapi import APIRouter, Depends
from app.services.analytics_engine import get_analytics_engine, AnalyticsEngine

router = APIRouter()


@router.get("/dashboard")
async def get_analytics_dashboard(engine: AnalyticsEngine = Depends(get_analytics_engine)):
    return engine.get_dashboard_data()


@router.get("/projection")
async def get_revenue_projection(
    days: int = 30, engine: AnalyticsEngine = Depends(get_analytics_engine)
):
    return engine.get_revenue_projection(days)


@router.get("/export")
async def export_analytics(engine: AnalyticsEngine = Depends(get_analytics_engine)):
    return engine.export_stats()
