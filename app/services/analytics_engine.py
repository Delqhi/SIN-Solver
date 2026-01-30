#!/usr/bin/env python3
"""
📊 REAL-TIME ANALYTICS ENGINE - CEO 2026
=========================================
Track performance, revenue, and success rates in real-time

Features:
- Live solve rate tracking
- Revenue calculations
- Success rate monitoring
- Model performance comparison
- Alert system for failures
"""

import asyncio
import time
import logging
from typing import Dict, Any, List, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import json

# Setup logging
logger = logging.getLogger(__name__)


@dataclass
class AnalyticsMetrics:
    """Real-time metrics"""

    # Performance
    total_solves: int = 0
    successful_solves: int = 0
    failed_solves: int = 0

    # Timing
    total_solve_time_ms: int = 0
    fastest_solve_ms: int = 999999
    slowest_solve_ms: int = 0

    # Revenue
    total_revenue: float = 0.0
    revenue_per_hour: float = 0.0

    # Cache
    cache_hits: int = 0
    cache_misses: int = 0

    # Models
    model_usage: Dict[str, int] = field(default_factory=dict)
    model_success: Dict[str, int] = field(default_factory=dict)

    # Errors
    rate_limit_hits: int = 0
    detection_failures: int = 0
    solver_errors: int = 0

    # Time tracking
    session_start: float = field(default_factory=time.time)
    last_solve: float = field(default_factory=time.time)


class AnalyticsEngine:
    """
    Real-time Analytics and Monitoring System
    """

    def __init__(self):
        self.metrics = AnalyticsMetrics()
        self.solve_history: List[Dict] = []
        self.max_history = 1000  # Keep last 1000 solves
        self._redis = None
        self._persistence_task = None

    async def _get_redis(self):
        if not self._redis:
            from app.core.redis_cache import RedisCache

            self._redis = await RedisCache.get_instance()
        return self._redis

    async def load_from_persistence(self):
        """Load metrics from Redis"""
        redis = await self._get_redis()
        data = await redis.get_json("analytics:metrics")
        if data:
            # Update metrics from persistent data
            for key, value in data.items():
                if hasattr(self.metrics, key):
                    setattr(self.metrics, key, value)
            logger.info("📊 Analytics metrics loaded from persistence")

        history = await redis.get_json("analytics:history")
        if history:
            self.solve_history = history
            logger.info(f"📊 {len(history)} solve history items loaded")

    async def save_to_persistence(self):
        """Save metrics to Redis"""
        redis = await self._get_redis()
        # Convert dataclass to dict
        data = {
            "total_solves": self.metrics.total_solves,
            "successful_solves": self.metrics.successful_solves,
            "failed_solves": self.metrics.failed_solves,
            "total_solve_time_ms": self.metrics.total_solve_time_ms,
            "fastest_solve_ms": self.metrics.fastest_solve_ms,
            "slowest_solve_ms": self.metrics.slowest_solve_ms,
            "total_revenue": self.metrics.total_revenue,
            "cache_hits": self.metrics.cache_hits,
            "cache_misses": self.metrics.cache_misses,
            "model_usage": self.metrics.model_usage,
            "model_success": self.metrics.model_success,
            "rate_limit_hits": self.metrics.rate_limit_hits,
            "detection_failures": self.metrics.detection_failures,
            "solver_errors": self.metrics.solver_errors,
            "session_start": self.metrics.session_start,
        }
        await redis.set_json("analytics:metrics", data)
        await redis.set_json(
            "analytics:history", self.solve_history[-100:]
        )  # Persist last 100 for recent stats

    def record_solve(
        self,
        success: bool,
        solve_time_ms: int,
        solver_used: str,
        captcha_type: str,
        from_cache: bool = False,
        revenue: float = 0.50,
    ):
        """Record a solve attempt"""

        # Update counters
        self.metrics.total_solves += 1

        if success:
            self.metrics.successful_solves += 1
            self.metrics.total_revenue += revenue
        else:
            self.metrics.failed_solves += 1

        # Timing
        self.metrics.total_solve_time_ms += solve_time_ms
        self.metrics.fastest_solve_ms = min(self.metrics.fastest_solve_ms, solve_time_ms)
        self.metrics.slowest_solve_ms = max(self.metrics.slowest_solve_ms, solve_time_ms)
        self.metrics.last_solve = time.time()

        # Cache
        if from_cache:
            self.metrics.cache_hits += 1
        else:
            self.metrics.cache_misses += 1

        # Model tracking
        if solver_used not in self.metrics.model_usage:
            self.metrics.model_usage[solver_used] = 0
            self.metrics.model_success[solver_used] = 0

        self.metrics.model_usage[solver_used] += 1
        if success:
            self.metrics.model_success[solver_used] += 1

        # History
        self.solve_history.append(
            {
                "timestamp": time.time(),
                "success": success,
                "solve_time_ms": solve_time_ms,
                "solver": solver_used,
                "type": captcha_type,
                "cached": from_cache,
                "revenue": revenue if success else 0,
            }
        )

        # Limit history size
        if len(self.solve_history) > self.max_history:
            self.solve_history.pop(0)

        # Fire and forget persistence
        asyncio.create_task(self.save_to_persistence())

    def record_error(self, error_type: str):
        """Record an error"""
        if error_type == "rate_limit":
            self.metrics.rate_limit_hits += 1
        elif error_type == "detection":
            self.metrics.detection_failures += 1
        else:
            self.metrics.solver_errors += 1

        # Persist error count
        asyncio.create_task(self.save_to_persistence())

    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get data for dashboard display"""

        # Calculate derived metrics
        session_duration_hours = (time.time() - self.metrics.session_start) / 3600

        success_rate = (self.metrics.successful_solves / max(1, self.metrics.total_solves)) * 100

        avg_solve_time = self.metrics.total_solve_time_ms / max(1, self.metrics.total_solves)

        cache_hit_rate = (self.metrics.cache_hits / max(1, self.metrics.total_solves)) * 100

        revenue_per_hour = self.metrics.total_revenue / max(0.01, session_duration_hours)

        # CAPTCHAs per hour
        captchas_per_hour = self.metrics.total_solves / max(0.01, session_duration_hours)

        # Model performance
        model_stats = {}
        for model in self.metrics.model_usage:
            total = self.metrics.model_usage[model]
            success = self.metrics.model_success[model]
            model_stats[model] = {
                "usage": total,
                "success_rate": (success / max(1, total)) * 100,
                "failures": total - success,
            }

        # Recent performance (last 100 solves)
        recent_solves = self.solve_history[-100:]
        recent_success_rate = 0
        if recent_solves:
            recent_success = sum(1 for s in recent_solves if s["success"])
            recent_success_rate = (recent_success / len(recent_solves)) * 100

        # 🔥 CEO FIX: Map history to chart format
        history_chart = []
        if self.solve_history:
            # Group by hour or just last 10 points
            for s in self.solve_history[-10:]:
                history_chart.append(
                    {
                        "name": datetime.fromtimestamp(s["timestamp"]).strftime("%H:%M"),
                        "solved": 1 if s["success"] else 0,
                        "failed": 0 if s["success"] else 1,
                    }
                )

        return {
            "overview": {
                "total_solves": self.metrics.total_solves,
                "success_rate": round(success_rate, 2),
                "recent_success_rate": round(recent_success_rate, 2),
                "total_revenue": round(self.metrics.total_revenue, 2),
                "revenue_per_hour": round(revenue_per_hour, 2),
                "captchas_per_hour": round(captchas_per_hour, 1),
            },
            "history": history_chart,
            "performance": {
                "avg_solve_time_ms": round(avg_solve_time, 0),
                "fastest_solve_ms": self.metrics.fastest_solve_ms,
                "slowest_solve_ms": self.metrics.slowest_solve_ms,
                "cache_hit_rate": round(cache_hit_rate, 2),
            },
            "models": model_stats,
            "errors": {
                "rate_limits": self.metrics.rate_limit_hits,
                "detection_failures": self.metrics.detection_failures,
                "solver_errors": self.metrics.solver_errors,
                "total_errors": (
                    self.metrics.rate_limit_hits
                    + self.metrics.detection_failures
                    + self.metrics.solver_errors
                ),
            },
            "session": {
                "duration_hours": round(session_duration_hours, 2),
                "start_time": datetime.fromtimestamp(self.metrics.session_start).isoformat(),
                "last_solve": datetime.fromtimestamp(self.metrics.last_solve).isoformat(),
            },
        }

    def get_revenue_projection(self, days: int = 30) -> Dict[str, Any]:
        """Project revenue for next N days"""

        session_hours = (time.time() - self.metrics.session_start) / 3600

        if session_hours < 0.1:
            return {"error": "Not enough data for projection"}

        hourly_revenue = self.metrics.total_revenue / session_hours

        return {
            "hourly": round(hourly_revenue, 2),
            "daily": round(hourly_revenue * 24, 2),
            "weekly": round(hourly_revenue * 24 * 7, 2),
            "monthly": round(hourly_revenue * 24 * 30, 2),
            "projection_days": days,
            "projected_total": round(hourly_revenue * 24 * days, 2),
        }

    def export_stats(self) -> str:
        """Export stats as JSON"""
        data = {
            "metrics": {
                "total_solves": self.metrics.total_solves,
                "successful": self.metrics.successful_solves,
                "failed": self.metrics.failed_solves,
                "total_revenue": self.metrics.total_revenue,
                "cache_hits": self.metrics.cache_hits,
                "cache_misses": self.metrics.cache_misses,
            },
            "models": self.metrics.model_usage,
            "dashboard": self.get_dashboard_data(),
            "projection": self.get_revenue_projection(),
        }

        return json.dumps(data, indent=2)


# Singleton
_analytics = None


def get_analytics_engine() -> AnalyticsEngine:
    """Get singleton analytics engine"""
    global _analytics
    if _analytics is None:
        _analytics = AnalyticsEngine()
    return _analytics
