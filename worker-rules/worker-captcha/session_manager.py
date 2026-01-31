#!/usr/bin/env python3
"""
IP and Session Management Module with Anti-Ban Protection
Handles IP tracking, session persistence, and automatic reconnection
"""

import asyncio
import json
import logging
import os
import pickle
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any, TYPE_CHECKING
import subprocess

import aiohttp
import requests
from geopy.distance import geodesic
from geopy.geocoders import Nominatim

# TYPE_CHECKING imports (not executed at runtime, only for type checkers)
if TYPE_CHECKING:
    from fritzconnection.lib.fritzwlan import FritzWLAN

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class IPRecord:
    """IP address record with geographic metadata"""

    ip: str
    timestamp: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    country: Optional[str] = None
    city: Optional[str] = None
    isp: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "ip": self.ip,
            "timestamp": self.timestamp.isoformat(),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "country": self.country,
            "city": self.city,
            "isp": self.isp,
        }


@dataclass
class HealthMetrics:
    """Track solve performance and health metrics"""

    baseline_solve_time: float = 30.0  # seconds
    current_solve_time: float = 0.0
    total_solves: int = 0
    rejected_solves: int = 0
    last_updated: datetime = field(default_factory=datetime.now)

    @property
    def rejection_rate(self) -> float:
        """Calculate rejection rate percentage"""
        if self.total_solves == 0:
            return 0.0
        return (self.rejected_solves / self.total_solves) * 100

    @property
    def is_degraded(self) -> bool:
        """Check if health metrics indicate degradation"""
        # Alert if solve time > 150% of baseline
        solve_time_degraded = self.current_solve_time > (self.baseline_solve_time * 1.5)
        # Alert if rejection rate > 10%
        rejection_rate_degraded = self.rejection_rate > 10.0

        return solve_time_degraded or rejection_rate_degraded

    def to_dict(self):
        """Convert to dictionary for logging"""
        return {
            "baseline_solve_time": self.baseline_solve_time,
            "current_solve_time": self.current_solve_time,
            "total_solves": self.total_solves,
            "rejected_solves": self.rejected_solves,
            "rejection_rate": f"{self.rejection_rate:.2f}%",
            "is_degraded": self.is_degraded,
        }


class GeoIPLookup:
    """Handle geographic IP lookups with caching"""

    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or Path.home() / ".cache" / "geoip"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.geolocator = Nominatim(user_agent="sin-solver-session-manager")

    def _get_cache_path(self, ip: str) -> Path:
        """Get cache file path for IP"""
        return self.cache_dir / f"{ip}.json"

    def lookup(self, ip: str, timeout: int = 10) -> Dict:
        """
        Lookup IP geographic information
        Uses multiple sources with fallback
        """
        # Check cache first
        cache_path = self._get_cache_path(ip)
        if cache_path.exists():
            try:
                with open(cache_path, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                cache_path.unlink()  # Remove corrupted cache

        # Try multiple IP lookup services
        geo_data = (
            self._try_ipify(ip, timeout)
            or self._try_ip_api(ip, timeout)
            or self._try_geoip2(ip, timeout)
            or self._default_geo_data()
        )

        # Cache the result
        try:
            with open(cache_path, "w") as f:
                json.dump(geo_data, f)
        except IOError as e:
            logger.warning(f"Failed to cache GeoIP data: {e}")

        return geo_data

    @staticmethod
    def _try_ipify(ip: str, timeout: int) -> Optional[Dict]:
        """Try ipify.org API"""
        try:
            url = f"https://geo.ipify.org/api/v1/asn?ipAddress={ip}"
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
            data = response.json()
            return {
                "ip": ip,
                "latitude": data.get("as", {}).get("latitude"),
                "longitude": data.get("as", {}).get("longitude"),
                "isp": data.get("as", {}).get("name"),
                "country": data.get("as", {}).get("country"),
                "city": None,
            }
        except Exception as e:
            logger.debug(f"ipify lookup failed: {e}")
            return None

    @staticmethod
    def _try_ip_api(ip: str, timeout: int) -> Optional[Dict]:
        """Try ip-api.com (free tier)"""
        try:
            url = f"http://ip-api.com/json/{ip}"
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
            data = response.json()

            if data.get("status") == "success":
                return {
                    "ip": ip,
                    "latitude": data.get("lat"),
                    "longitude": data.get("lon"),
                    "country": data.get("country"),
                    "city": data.get("city"),
                    "isp": data.get("isp"),
                }
        except Exception as e:
            logger.debug(f"ip-api lookup failed: {e}")
        return None

    @staticmethod
    def _try_geoip2(ip: str, timeout: int) -> Optional[Dict]:
        """Try geoip2 via MaxMind (free tier)"""
        try:
            url = f"https://geoip.maxmind.com/geoip/v2.1/country/{ip}"
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
            data = response.json()
            return {
                "ip": ip,
                "latitude": None,
                "longitude": None,
                "country": data.get("country", {}).get("name"),
                "city": None,
                "isp": None,
            }
        except Exception as e:
            logger.debug(f"geoip2 lookup failed: {e}")
        return None

    @staticmethod
    def _default_geo_data() -> Dict:
        """Return default/fallback geo data"""
        return {
            "ip": None,
            "latitude": None,
            "longitude": None,
            "country": "Unknown",
            "city": None,
            "isp": None,
        }


class IPRotationManager:
    """Manage IP rotation and cooldown logic"""

    # Cooldown: 15 minutes per 100km geographic distance
    COOLDOWN_MINUTES_PER_100KM = 15
    MIN_COOLDOWN_MINUTES = 15  # Minimum 15 min between rotations

    def __init__(self, account_id: str):
        self.account_id = account_id
        self.ip_history: List[IPRecord] = []
        self.last_rotation_time: Optional[datetime] = None
        self.geolookup = GeoIPLookup()

    def add_ip_record(self, ip: str, geo_data: Dict) -> IPRecord:
        """Add IP to history with geographic data"""
        record = IPRecord(
            ip=ip,
            timestamp=datetime.now(),
            latitude=geo_data.get("latitude"),
            longitude=geo_data.get("longitude"),
            country=geo_data.get("country"),
            city=geo_data.get("city"),
            isp=geo_data.get("isp"),
        )
        self.ip_history.append(record)
        logger.info(f"[{self.account_id}] Added IP record: {ip} ({record.city}, {record.country})")
        return record

    def get_current_ip(self) -> Optional[str]:
        """Get most recent IP address"""
        return self.ip_history[-1].ip if self.ip_history else None

    def calculate_required_cooldown(self) -> timedelta:
        """Calculate cooldown required based on geographic distance"""
        if len(self.ip_history) < 2:
            return timedelta(minutes=self.MIN_COOLDOWN_MINUTES)

        prev_ip = self.ip_history[-2]
        curr_ip = self.ip_history[-1]

        # If missing coordinates, use minimum cooldown
        if not all([prev_ip.latitude, prev_ip.longitude, curr_ip.latitude, curr_ip.longitude]):
            logger.warning(f"[{self.account_id}] Missing coordinates for cooldown calculation")
            return timedelta(minutes=self.MIN_COOLDOWN_MINUTES)

        # Calculate distance
        distance_km = geodesic(
            (prev_ip.latitude, prev_ip.longitude), (curr_ip.latitude, curr_ip.longitude)
        ).kilometers

        # Calculate cooldown: 15 min per 100km
        cooldown_minutes = max(
            self.MIN_COOLDOWN_MINUTES, int((distance_km / 100) * self.COOLDOWN_MINUTES_PER_100KM)
        )

        logger.info(
            f"[{self.account_id}] Geographic distance: {distance_km:.1f}km "
            f"→ Cooldown: {cooldown_minutes}min"
        )

        return timedelta(minutes=cooldown_minutes)

    def can_rotate_ip(self) -> bool:
        """Check if enough time has passed for IP rotation"""
        if not self.last_rotation_time:
            return True

        required_cooldown = self.calculate_required_cooldown()
        elapsed = datetime.now() - self.last_rotation_time

        if elapsed < required_cooldown:
            remaining = required_cooldown - elapsed
            logger.warning(
                f"[{self.account_id}] IP rotation blocked. "
                f"Remaining cooldown: {remaining.total_seconds() / 60:.1f}min"
            )
            return False

        return True

    def mark_rotation_time(self):
        """Mark when IP rotation occurred"""
        self.last_rotation_time = datetime.now()


class SessionManager:
    """
    Main session management class with IP tracking,
    cookie persistence, and reconnection logic
    """

    def __init__(
        self,
        account_id: str,
        storage_dir: Optional[Path] = None,
        router_config: Optional[Dict[str, Any]] = None,
    ):
        self.account_id = account_id
        # Use provided storage_dir or default
        if storage_dir is None:
            storage_dir = Path("/data/sessions")
        self.storage_dir: Path = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        # Use provided router_config or empty dict
        if router_config is None:
            router_config = {}
        self.router_config: Dict[str, Any] = router_config

        self.cookies_file = self.storage_dir / "cookies.pkl"
        self.session_file = self.storage_dir / "session.json"
        self.ip_history_file = self.storage_dir / "ip_history.json"

        self.cookies: Dict = {}
        self.health = HealthMetrics()
        self.ip_manager = IPRotationManager(account_id)

        self.session_start_time: Optional[datetime] = None
        self.consecutive_failures = 0
        self.last_solve_time: float = 0.0

        logger.info(f"Initialized SessionManager for {account_id}")

    # ========================
    # COOKIE PERSISTENCE
    # ========================

    def save_cookies(self, cookies: Optional[Dict] = None):
        """Save cookies to persistent storage"""
        if cookies:
            self.cookies = cookies

        try:
            with open(self.cookies_file, "wb") as f:
                pickle.dump(self.cookies, f)
            logger.info(f"[{self.account_id}] Saved cookies ({len(self.cookies)} items)")
        except Exception as e:
            logger.error(f"[{self.account_id}] Failed to save cookies: {e}")

    def load_cookies(self) -> Dict:
        """Load cookies from persistent storage"""
        if not self.cookies_file.exists():
            logger.info(f"[{self.account_id}] No existing cookies found")
            return {}

        try:
            with open(self.cookies_file, "rb") as f:
                self.cookies = pickle.load(f)
            logger.info(f"[{self.account_id}] Loaded cookies ({len(self.cookies)} items)")
            return self.cookies
        except Exception as e:
            logger.error(f"[{self.account_id}] Failed to load cookies: {e}")
            return {}

    def clear_cookies(self):
        """Clear all cookies (for fresh start)"""
        self.cookies = {}
        if self.cookies_file.exists():
            self.cookies_file.unlink()
        logger.info(f"[{self.account_id}] Cleared cookies")

    # ========================
    # IP TRACKING & HEALTH
    # ========================

    async def detect_current_ip(self) -> str:
        """Detect current IP address using multiple sources"""
        ip = await self._try_ipify() or await self._try_myip_com() or await self._try_ip_api_async()

        if not ip:
            raise RuntimeError("Failed to detect IP address")

        logger.info(f"[{self.account_id}] Current IP: {ip}")
        return ip

    @staticmethod
    async def _try_ipify() -> Optional[str]:
        """Try ipify.org"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.ipify.org?format=json", timeout=aiohttp.ClientTimeout(5)
                ) as resp:
                    data = await resp.json()
                    return data.get("ip")
        except Exception as e:
            logger.debug(f"ipify failed: {e}")
        return None

    @staticmethod
    async def _try_myip_com() -> Optional[str]:
        """Try myip.com"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://myip.com/", timeout=aiohttp.ClientTimeout(5)
                ) as resp:
                    text = await resp.text()
                    # Parse HTML response
                    import re

                    match = re.search(r"IP Address.*?(\d+\.\d+\.\d+\.\d+)", text)
                    return match.group(1) if match else None
        except Exception as e:
            logger.debug(f"myip.com failed: {e}")
        return None

    @staticmethod
    async def _try_ip_api_async() -> Optional[str]:
        """Try ip-api.com (async)"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "http://ip-api.com/json/", timeout=aiohttp.ClientTimeout(5)
                ) as resp:
                    data = await resp.json()
                    return data.get("query")
        except Exception as e:
            logger.debug(f"ip-api.com failed: {e}")
        return None

    async def check_ip_health(self, detailed: bool = False) -> bool:
        """
        Check IP health status
        Returns True if healthy, False if degraded
        """
        try:
            current_ip = await self.detect_current_ip()

            # Check if IP changed
            last_ip = self.ip_manager.get_current_ip()
            if last_ip and current_ip != last_ip:
                logger.warning(f"[{self.account_id}] IP changed: {last_ip} → {current_ip}")

            # Lookup geo data
            geolookup = GeoIPLookup()
            geo_data = geolookup.lookup(current_ip)
            self.ip_manager.add_ip_record(current_ip, geo_data)

            # Check health metrics
            is_healthy = not self.health.is_degraded

            if detailed:
                logger.info(
                    f"[{self.account_id}] Health check: {json.dumps(self.health.to_dict(), indent=2)}"
                )

            return is_healthy

        except Exception as e:
            logger.error(f"[{self.account_id}] Health check failed: {e}")
            return False

    def record_solve_attempt(self, success: bool, solve_time: float):
        """Record solve attempt for health tracking"""
        self.health.total_solves += 1
        self.health.current_solve_time = solve_time
        self.last_solve_time = solve_time

        if not success:
            self.health.rejected_solves += 1
            self.consecutive_failures += 1
        else:
            self.consecutive_failures = 0

        self.health.last_updated = datetime.now()

        if self.health.is_degraded:
            logger.warning(
                f"[{self.account_id}] Health degraded: "
                f"Solve time {solve_time:.1f}s (baseline {self.health.baseline_solve_time}s), "
                f"Rejection rate {self.health.rejection_rate:.1f}%"
            )

    # ========================
    # RECONNECTION LOGIC
    # ========================

    async def reconnect_and_cooldown(self) -> bool:
        """
        Perform clean reconnection with cooldown
        1. Clean logout
        2. Trigger router reconnect
        3. Wait for new IP
        4. Apply cooldown
        5. Clear old cookies
        """
        logger.info(f"[{self.account_id}] Starting reconnection sequence...")

        try:
            # Step 1: Clean logout
            logger.info(f"[{self.account_id}] Step 1: Clean logout")
            self.clear_cookies()
            await asyncio.sleep(2)

            # Step 2: Trigger router reconnect
            logger.info(f"[{self.account_id}] Step 2: Triggering router reconnect")
            if not await self._trigger_router_reconnect():
                logger.warning(f"[{self.account_id}] Router reconnect failed, waiting anyway")

            # Step 3: Wait for new IP
            logger.info(f"[{self.account_id}] Step 3: Waiting for new IP...")
            old_ip = self.ip_manager.get_current_ip()
            new_ip = await self._wait_for_ip_change(old_ip, timeout=60)

            if not new_ip:
                logger.error(f"[{self.account_id}] IP did not change within timeout")
                return False

            # Step 4: Apply cooldown
            logger.info(f"[{self.account_id}] Step 4: Applying geographic cooldown")
            required_cooldown = self.ip_manager.calculate_required_cooldown()
            logger.info(
                f"[{self.account_id}] Waiting {required_cooldown.total_seconds() / 60:.1f} minutes "
                f"before resuming..."
            )
            await asyncio.sleep(required_cooldown.total_seconds())
            self.ip_manager.mark_rotation_time()

            # Step 5: Clear session state
            logger.info(f"[{self.account_id}] Step 5: Clearing old session cookies")
            self.clear_cookies()
            self._reset_health_metrics()

            logger.info(f"[{self.account_id}] ✓ Reconnection complete. New IP: {new_ip}")
            return True

        except Exception as e:
            logger.error(f"[{self.account_id}] Reconnection failed: {e}")
            return False

    async def _trigger_router_reconnect(self) -> bool:
        """Trigger router reconnect (FritzBox example)"""
        if not self.router_config:
            logger.warning(f"[{self.account_id}] No router config provided")
            return False

        try:
            router_type = self.router_config.get("type", "fritzbox")

            if router_type == "fritzbox":
                return await self._fritzbox_reconnect()
            elif router_type == "custom_command":
                return await self._custom_command_reconnect()
            else:
                logger.warning(f"[{self.account_id}] Unknown router type: {router_type}")
                return False

        except Exception as e:
            logger.error(f"[{self.account_id}] Router reconnect error: {e}")
            return False

    async def _fritzbox_reconnect(self) -> bool:
        """Trigger reconnect on FritzBox router"""
        try:
            host = self.router_config.get("host", "192.168.1.1")
            username = self.router_config.get("username", "admin")
            password = self.router_config.get("password")

            if not password:
                logger.warning(f"[{self.account_id}] FritzBox password not configured")
                return False

            # Use fritzconnection library if available
            try:
                from fritzconnection.lib.fritzwlan import FritzWLAN

                fc = FritzWLAN(address=host, user=username, password=password)
                # Get connection and trigger reconnect
                fc.reconnect()
                logger.info(f"[{self.account_id}] FritzBox reconnect triggered")
                return True
            except ImportError:
                logger.warning(
                    f"[{self.account_id}] fritzconnection not installed, trying HTTP approach"
                )

                # Fallback: Try HTTP request to FritzBox API
                url = f"http://{host}:49000/upnp/control/WANIPConn1"
                headers = {"SOAPAction": "urn:Belkin:service:basicevent:1#SetBinaryState"}

                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        url, headers=headers, timeout=aiohttp.ClientTimeout(10)
                    ) as resp:
                        return resp.status < 400

        except Exception as e:
            logger.error(f"[{self.account_id}] FritzBox reconnect failed: {e}")
            return False

    async def _custom_command_reconnect(self) -> bool:
        """Execute custom shell command for reconnect"""
        try:
            command = self.router_config.get("command")
            if not command:
                logger.warning(f"[{self.account_id}] No custom command configured")
                return False

            # Execute command with timeout
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30)

                if process.returncode == 0:
                    logger.info(f"[{self.account_id}] Custom reconnect command succeeded")
                    return True
                else:
                    logger.error(f"[{self.account_id}] Custom command failed: {stderr.decode()}")
                    return False

            except asyncio.TimeoutError:
                process.kill()
                logger.error(f"[{self.account_id}] Custom command timeout")
                return False

        except Exception as e:
            logger.error(f"[{self.account_id}] Custom command error: {e}")
            return False

    async def _wait_for_ip_change(self, old_ip: Optional[str], timeout: int = 60) -> Optional[str]:
        """Wait for IP to change, with timeout"""
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                current_ip = await self.detect_current_ip()

                if old_ip is None or current_ip != old_ip:
                    logger.info(
                        f"[{self.account_id}] IP changed after {time.time() - start_time:.1f}s"
                    )
                    return current_ip

                await asyncio.sleep(5)  # Check every 5 seconds

            except Exception as e:
                logger.debug(f"[{self.account_id}] IP check failed: {e}")
                await asyncio.sleep(5)

        logger.error(f"[{self.account_id}] IP did not change within {timeout}s timeout")
        return None

    # ========================
    # PERSISTENCE
    # ========================

    def save_state(self):
        """Save session state to disk"""
        try:
            state = {
                "account_id": self.account_id,
                "ip_history": [ip.to_dict() for ip in self.ip_manager.ip_history],
                "health": self.health.to_dict(),
                "last_rotation_time": self.ip_manager.last_rotation_time.isoformat()
                if self.ip_manager.last_rotation_time
                else None,
                "session_start_time": self.session_start_time.isoformat()
                if self.session_start_time
                else None,
                "consecutive_failures": self.consecutive_failures,
            }

            with open(self.session_file, "w") as f:
                json.dump(state, f, indent=2)

            logger.info(f"[{self.account_id}] Session state saved")

        except Exception as e:
            logger.error(f"[{self.account_id}] Failed to save state: {e}")

    def load_state(self) -> bool:
        """Load session state from disk"""
        if not self.session_file.exists():
            logger.info(f"[{self.account_id}] No existing session state")
            return False

        try:
            with open(self.session_file, "r") as f:
                state = json.load(f)

            # Restore state
            if state.get("session_start_time"):
                self.session_start_time = datetime.fromisoformat(state["session_start_time"])

            self.consecutive_failures = state.get("consecutive_failures", 0)

            logger.info(f"[{self.account_id}] Session state loaded")
            return True

        except Exception as e:
            logger.error(f"[{self.account_id}] Failed to load state: {e}")
            return False

    def _reset_health_metrics(self):
        """Reset health metrics after reconnection"""
        self.health.total_solves = 0
        self.health.rejected_solves = 0
        self.health.current_solve_time = 0.0
        self.consecutive_failures = 0
        self.last_solve_time = 0.0
        logger.info(f"[{self.account_id}] Health metrics reset")

    # ========================
    # SESSION LIFECYCLE
    # ========================

    def start_session(self):
        """Mark session start"""
        self.session_start_time = datetime.now()
        self.load_cookies()
        self.load_state()
        logger.info(f"[{self.account_id}] Session started at {self.session_start_time}")

    def end_session(self):
        """Mark session end and save state"""
        self.save_cookies()
        self.save_state()

        if self.session_start_time:
            duration = datetime.now() - self.session_start_time
            logger.info(
                f"[{self.account_id}] Session ended. "
                f"Duration: {duration}, "
                f"Solves: {self.health.total_solves}, "
                f"Success rate: {100 - self.health.rejection_rate:.1f}%"
            )

    # ========================
    # STATUS REPORTING
    # ========================

    def get_status(self) -> Dict:
        """Get current session status"""
        return {
            "account_id": self.account_id,
            "current_ip": self.ip_manager.get_current_ip(),
            "ip_history_count": len(self.ip_manager.ip_history),
            "cookies_count": len(self.cookies),
            "health": self.health.to_dict(),
            "session_duration": (
                (datetime.now() - self.session_start_time).total_seconds()
                if self.session_start_time
                else None
            ),
            "consecutive_failures": self.consecutive_failures,
            "can_rotate": self.ip_manager.can_rotate_ip(),
        }


# ========================
# EXAMPLE USAGE
# ========================


async def main():
    """Example usage of SessionManager"""

    # Initialize session manager
    router_config = {
        "type": "fritzbox",
        "host": "192.168.1.1",
        "username": "admin",
        "password": os.getenv("FRITZBOX_PASSWORD"),
    }

    session = SessionManager(
        account_id="worker_001",
        router_config=router_config,
    )

    # Start session
    session.start_session()

    try:
        # Check health
        is_healthy = await session.check_ip_health(detailed=True)

        if is_healthy:
            logger.info("✓ Session healthy, ready to solve")

            # Simulate solve attempt
            session.record_solve_attempt(success=True, solve_time=25.5)
        else:
            logger.warning("✗ Session degraded, initiating reconnect")
            success = await session.reconnect_and_cooldown()

            if success:
                logger.info("✓ Reconnection successful")
            else:
                logger.error("✗ Reconnection failed")

        # Print status
        logger.info(f"Status: {json.dumps(session.get_status(), indent=2)}")

    finally:
        session.end_session()


if __name__ == "__main__":
    asyncio.run(main())
