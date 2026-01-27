"""
Plugin Manager Service
Integrates with Zimmer-17 (SIN-Plugins Hub) for centralized management of solver logic.
"""
import logging
import httpx
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class PluginManager:
    def __init__(self):
        self.hub_url = settings.plugin_hub_url
        self.plugins = {}

    async def list_available_plugins(self) -> List[str]:
        """
        Fetches list of available plugins from Zimmer-17 hub.
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.hub_url}/plugins")
                if response.status_code == 200:
                    return response.json().get("plugins", [])
                logger.error(f"Failed to list plugins: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error connecting to Plugin Hub (Zimmer-17): {e}")
            return []

    async def get_plugin_logic(self, plugin_name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves the solving logic for a specific CAPTCHA type.
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.hub_url}/plugins/{plugin_name}")
                if response.status_code == 200:
                    return response.json()
                logger.error(f"Failed to fetch plugin {plugin_name} from Zimmer-17: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error connecting to Plugin Hub for {plugin_name}: {e}")
            return None

    async def execute_plugin_solve(self, plugin_name: str, image_base64: str) -> Optional[str]:
        """
        Offloads the solving to the specialized plugin in Zimmer-17.
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.hub_url}/solve/{plugin_name}",
                    json={"image_base64": image_base64}
                )
                if response.status_code == 200:
                    return response.json().get("solution")
                logger.error(f"Plugin solve failed for {plugin_name} (Zimmer-17): {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error executing plugin solve {plugin_name}: {e}")
            return None

# Singleton
_plugin_manager = None
def get_plugin_manager() -> PluginManager:
    global _plugin_manager
    if _plugin_manager is None:
        _plugin_manager = PluginManager()
    return _plugin_manager
