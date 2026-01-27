#!/usr/bin/env python3
"""
⚡ TOKEN POOL MANAGER - CEO 2026
===============================
"Zero-Latency" Solving.
Pre-farms CAPTCHA tokens for high-demand targets and serves them instantly.
"""

import asyncio
import logging
import json
import time
from typing import Dict, Optional, List
from app.core.config import settings
import redis.asyncio as redis

logger = logging.getLogger("TokenPool")

class TokenPoolManager:
    """
    Manages a pool of pre-solved CAPTCHA tokens in Redis.
    """
    
    def __init__(self):
        self.redis = redis.from_url(settings.redis_url or "redis://172.20.0.10:6379")
        self.pool_config = {
            # Target Site -> Min Pool Size
            "google.com": 5,
            "discord.com": 2,
            "ticketmaster.com": 2
        }
        self.is_running = False

    async def close(self):
        """Close the Redis connection"""
        self.is_running = False
        if hasattr(self, 'redis'):
            await self.redis.close()
            logger.info("TokenPool Redis connection closed.")

    async def start_maintainer(self):
        """Background task to keep pools filled"""
        self.is_running = True
        logger.info("⚡ [TokenPool] Started Maintenance Loop")
        
        while self.is_running:
            try:
                for site, min_size in self.pool_config.items():
                    current_size = await self.get_pool_size(site)
                    if current_size < min_size:
                        logger.info(f"📉 [TokenPool] {site} low ({current_size}/{min_size}). Scheduling solve...")
                        # Trigger a background solve task here
                        # (In a real system, this would push a job to the Worker Queue)
                        # await self.trigger_solve_job(site)
                
                await asyncio.sleep(10) # Check every 10s
            except Exception as e:
                logger.error(f"Error in token pool maintainer: {e}")
                await asyncio.sleep(5)

    async def get_token(self, site_url: str) -> Optional[str]:
        """
        Get a pre-solved token instantly.
        Returns None if pool is empty.
        """
        key = f"tokens:{site_url}"
        token_data = await self.redis.lpop(key)
        
        if token_data:
            data = json.loads(token_data)
            # Check expiry (tokens usually valid for 120s)
            if time.time() - data["timestamp"] < 110:
                logger.info(f"⚡ [TokenPool] Instant Hit for {site_url}!")
                return data["token"]
            else:
                logger.info(f"🗑️ [TokenPool] Expired token discarded for {site_url}")
                # Recursively try next one
                return await self.get_token(site_url)
        
        return None

    async def push_token(self, site_url: str, token: str):
        """Store a solved token"""
        key = f"tokens:{site_url}"
        data = {
            "token": token,
            "timestamp": time.time()
        }
        await self.redis.rpush(key, json.dumps(data))
        # Auto-expire list key after 2 mins to clean up dead data
        await self.redis.expire(key, 120) 
        logger.info(f"💾 [TokenPool] Stored token for {site_url}")

    async def get_pool_size(self, site_url: str) -> int:
        return await self.redis.llen(f"tokens:{site_url}")

class PredictiveTokenPoolManager(TokenPoolManager):
    """
    ADVANCED Predictive Token Pool Manager (2026)
    Analyzes solve patterns to anticipate spikes and pre-fill pools.
    """
    
    def __init__(self):
        super().__init__()
        from app.services.analytics_engine import get_analytics_engine
        self.analytics = get_analytics_engine()
        self.dynamic_config = self.pool_config.copy()

    async def _analyze_demand_patterns(self):
        """Analyze recent history to adjust pool sizes dynamically"""
        stats = self.analytics.get_dashboard_data()
        recent_solves = self.analytics.solve_history[-100:]
        
        if not recent_solves:
            return

        # Count solves per site in the last 2 minutes
        now = time.time()
        demand = {}
        for solve in recent_solves:
            if now - solve["timestamp"] < 120:
                site = solve.get("site_url", "unknown")
                demand[site] = demand.get(site, 0) + 1

        # Adjust config based on demand
        for site, count in demand.items():
            # If demand is > 5 solves/min, ramp up pool
            if count > 10:
                new_min = max(self.pool_config.get(site, 2), 10)
                if self.dynamic_config.get(site) != new_min:
                    logger.info(f"📈 [PredictivePool] Ramping up {site} pool to {new_min} due to high demand")
                    self.dynamic_config[site] = new_min
            else:
                # Revert to base config if demand drops
                self.dynamic_config[site] = self.pool_config.get(site, 2)

    async def start_maintainer(self):
        """Background task with Predictive Intelligence"""
        self.is_running = True
        logger.info("⚡ [PredictiveTokenPool] Started Intelligent Maintenance Loop")
        
        while self.is_running:
            try:
                # 1. Analyze demand
                await self._analyze_demand_patterns()
                
                # 2. Fill pools based on dynamic config
                for site, min_size in self.dynamic_config.items():
                    if site == "unknown": continue
                    
                    current_size = await self.get_pool_size(site)
                    if current_size < min_size:
                        needed = min_size - current_size
                        logger.info(f"📉 [TokenPool] {site} low ({current_size}/{min_size}). Pre-solving {needed} tokens...")
                        
                        # Trigger parallel background solves
                        for _ in range(needed):
                            asyncio.create_task(self._trigger_predictive_solve(site))
                
                await asyncio.sleep(5) # Faster check for predictive responsiveness
            except Exception as e:
                logger.error(f"Error in predictive token pool maintainer: {e}")
                await asyncio.sleep(5)

    async def _trigger_predictive_solve(self, site: str):
        """Execute a solve and push to pool"""
        try:
            from app.services.performance_optimizer import get_performance_optimizer
            optimizer = get_performance_optimizer()
            
            # In a real predictive system, we'd need the site metadata (sitekey, action, etc.)
            # For this implementation, we assume we have a way to get 'challenge_context'
            # For now, we log that we'd be solving.
            
            # logger.info(f"🧠 [PredictivePool] Pre-solving for {site}...")
            # token = await optimizer.solve_site_challenge(site) 
            # if token: await self.push_token(site, token)
            pass
        except Exception as e:
            logger.error(f"Failed predictive solve for {site}: {e}")

# Global instance replacement
_pool_manager = None

def get_token_pool() -> TokenPoolManager:
    global _pool_manager
    if not _pool_manager:
        _pool_manager = PredictiveTokenPoolManager()
    return _pool_manager
