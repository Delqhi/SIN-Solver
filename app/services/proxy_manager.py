#!/usr/bin/env python3
"""
🌐 PROXY MANAGER - CEO 2026
===========================
Intelligent Residential Proxy Management.
Ensures "Clean IPs" by checking fraud scores before use.
Manages "Sticky Sessions" to build trust.
"""

import asyncio
import logging
import random
import aiohttp
import os
from typing import Dict, Optional, List

logger = logging.getLogger("ProxyManager")

class ProxyManager:
    """
    Manages High-Quality Residential Proxies with Reputation Tracking (V2 2026).
    Filters out "Burned" IPs and ensures session stickiness.
    """
    
    def __init__(self):
        raw_proxies = os.getenv("RESIDENTIAL_PROXIES", "").split(",")
        self.proxies = [p.strip() for p in raw_proxies if p.strip()]
        self.good_proxies = []
        self.bad_proxies = set()
        self.proxy_metadata: Dict[str, Dict] = {} # Map proxy_url -> metadata
        self._redis = None

    async def _get_redis(self):
        if not self._redis:
            from app.core.redis_cache import RedisCache
            self._redis = await RedisCache.get_instance()
        return self._redis

    async def validate_proxies(self):
        """Check all proxies against IP reputation services."""
        logger.info(f"🌐 [ProxyManager] Validating {len(self.proxies)} proxies...")
        tasks = [self._check_proxy_score(p) for p in self.proxies]
        results = await asyncio.gather(*tasks)
        self.good_proxies = [p for p in results if p]
        logger.info(f"✅ [ProxyManager] {len(self.good_proxies)} Clean IPs ready.")

    async def _check_proxy_score(self, proxy_url: str) -> Optional[str]:
        """Check IP Fraud Score and Geolocation."""
        try:
            from app.core.config import settings
            api_key = settings.scamalytics_key or os.getenv("SCAMALYTICS_KEY")
            redis = await self._get_redis()
            
            async with aiohttp.ClientSession() as session:
                start = asyncio.get_event_loop().time()
                async with session.get("https://api.ipify.org?format=json", proxy=proxy_url, timeout=10) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        ip = data.get("ip")
                        
                        # Check Burn Status & Reputation
                        is_burned = await redis.get(f"proxy:burned:{ip}")
                        if is_burned: return None

                        stats = await redis.get_json(f"proxy:stats:{ip}") or {"success": 0, "fail": 0}
                        if stats["fail"] > 5 and (stats["success"] / max(1, stats["fail"])) < 0.2:
                            logger.warning(f"  🔴 Low Reputation IP: {ip} ({stats['success']}/{stats['fail']})")
                            return None

                        # Geolocation Sync
                        async with session.get(f"http://ip-api.com/json/{ip}?fields=status,country,countryCode,timezone,city,lat,lon", timeout=5) as geo_resp:
                            if geo_resp.status == 200:
                                geo_data = await geo_resp.json()
                                if geo_data.get("status") == "success":
                                    self.proxy_metadata[proxy_url] = geo_data

                        # Scamalytics
                        if api_key:
                            async with session.get(f"https://api11.scamalytics.com/ceo-enterprise/{ip}/?key={api_key}", timeout=5) as s_resp:
                                if s_resp.status == 200:
                                    s_data = await s_resp.json()
                                    if int(s_data.get("score", 100)) > 40:
                                        await redis.set(f"proxy:burned:{ip}", "high_fraud", expire=3600)
                                        return None
                        return proxy_url
        except: return None

    async def record_result(self, proxy_url: str, success: bool):
        """🚀 CEO 2026: Record proxy performance for reputation-based routing"""
        try:
            ip = proxy_url.split("@")[-1].split(":")[0]
            redis = await self._get_redis()
            stats_key = f"proxy:stats:{ip}"
            stats = await redis.get_json(stats_key) or {"success": 0, "fail": 0, "consecutive_fails": 0}
            
            if success:
                stats["success"] += 1
                stats["consecutive_fails"] = 0
            else:
                stats["fail"] += 1
                stats["consecutive_fails"] = stats.get("consecutive_fails", 0) + 1
            
            await redis.set_json(stats_key, stats, expire=86400) # Keep stats for 24h
            
            # 🔥 AUTOMATED BURN LOGIC
            if stats["consecutive_fails"] >= 3:
                await self.mark_burned(proxy_url, reason=f"consecutive_fails_{stats['consecutive_fails']}")
            elif stats["fail"] > 5 and (stats["success"] / max(1, stats["fail"])) < 0.2:
                await self.mark_burned(proxy_url, reason="low_reputation_auto")
                
        except: pass

    async def get_sticky_proxy(self, session_id: Optional[str] = None) -> Optional[str]:
        if not session_id: return await self._pick_random_good_proxy()
        redis = await self._get_redis()
        session_key = f"session:proxy:{session_id}"
        existing_proxy = await redis.get(session_key)
        
        if existing_proxy:
            # Check if burned
            ip = existing_proxy.split("@")[-1].split(":")[0]
            is_burned = await redis.get(f"proxy:burned:{ip}")
            if not is_burned:
                return existing_proxy
            else:
                logger.info(f"🔄 [ProxyManager] Sticky proxy {ip} is burned. Rotating...")
                await redis.delete(session_key)
        
        proxy = await self._pick_random_good_proxy()
        if proxy: await redis.set(session_key, proxy, expire=3600)
        return proxy

    async def rotate_proxy(self, session_id: str) -> Optional[str]:
        redis = await self._get_redis()
        session_key = f"session:proxy:{session_id}"
        old_proxy = await redis.get(session_key)
        if old_proxy:
            await self.mark_burned(old_proxy, reason="session_rotate")
            await redis.delete(session_key)
        return await self.get_sticky_proxy(session_id)

    async def _pick_random_good_proxy(self) -> Optional[str]:
        if not self.good_proxies:
            if self.proxies:
                proxy = random.choice(self.proxies)
                validated = await self._check_proxy_score(proxy)
                if validated:
                    self.good_proxies.append(validated)
                    return validated
                return proxy
            return None
        return random.choice(self.good_proxies)

    async def mark_burned(self, proxy_url: str, reason: str = "blocked"):
        try:
            redis = await self._get_redis()
            ip = proxy_url.split("@")[-1].split(":")[0]
            await redis.set(f"proxy:burned:{ip}", reason, expire=3600)
            logger.warning(f"🔥 Burned proxy: {ip} ({reason})")
            if proxy_url in self.good_proxies: self.good_proxies.remove(proxy_url)
        except: pass

    def get_proxy_metadata(self, proxy_url: str) -> Dict:
        return self.proxy_metadata.get(proxy_url, {})


# Singleton
_proxy_manager = None

async def get_proxy_manager() -> ProxyManager:
    global _proxy_manager
    if not _proxy_manager:
        _proxy_manager = ProxyManager()
        # await _proxy_manager.validate_proxies() # Optional: Run on startup
    return _proxy_manager
