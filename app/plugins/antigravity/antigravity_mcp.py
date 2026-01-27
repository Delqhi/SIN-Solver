"""
Antigravity MCP Server
MCP server implementation for antigravity plugin
"""
import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional

from mcp.server.fastmcp import FastMCPServer
from mcp.server.stdio import stdio_server
from pydantic import BaseModel, Field

from app.core.config import settings
from app.plugins.antigravity.antigravity_connector import antigravity_connector
from app.utils.logger import setup_logging

logger = setup_logging(__name__)


class AccountConfig(BaseModel):
    """Account configuration for antigravity service"""
    account_id: str
    api_token: str
    base_url: str = "https://api.antigravity.dev"


class AntigravityMCP:
    """MCP server for antigravity plugin"""
    
    def __init__(self):
        self.name = "antigravity-plugin"
        self.version = "1.0.0"
        self.description = "Antigravity Plugin MCP Server"
        self.server = None
        
    async def initialize(self):
        """Initialize the MCP server"""
        # Create server instance
        self.server = FastMCPServer(
            name=self.name,
            version=self.version,
            capabilities={
                "tools": [
                    {
                        "name": "list_accounts",
                        "description": "List all configured antigravity accounts",
                        "input_schema": {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                    },
                    {
                        "name": "add_account",
                        "description": "Add a new antigravity account",
                        "input_schema": {
                            "type": "object",
                            "properties": {
                                "account_id": {
                                    "type": "string",
                                    "description": "Unique identifier for the account"
                                },
                                "api_token": {
                                    "type": "string",
                                    "description": "API token for authentication"
                                },
                                "base_url": {
                                    "type": "string",
                                    "default": "https://api.antigravity.dev",
                                    "description": "Base URL for the antigravity API"
                                }
                            },
                            "required": ["account_id", "api_token"]
                        }
                    },
                    {
                        "name": "remove_account",
                        "description": "Remove an antigravity account",
                        "input_schema": {
                            "type": "object",
                            "properties": {
                                "account_id": {
                                    "type": "string",
                                    "description": "Account ID to remove"
                                }
                            },
                            "required": ["account_id"]
                        }
                    },
                    {
                        "name": "switch_account",
                        "description": "Switch to a different antigravity account",
                        "input_schema": {
                            "type": "object",
                            "properties": {
                                "account_id": {
                                    "type": "string",
                                    "description": "Account ID to switch to"
                                }
                            },
                            "required": ["account_id"]
                        }
                    },
                    {
                        "name": "get_current_account",
                        "description": "Get information about the current account",
                        "input_schema": {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                    },
                    {
                        "name": "test_connection",
                        "description": "Test connection to antigravity service",
                        "input_schema": {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                    }
                ],
                "resources": [
                    {
                        "uri": "antigravity://accounts",
                        "description": "List of configured antigravity accounts"
                    }
                ]
            }
        )
        
        # Register tool handlers
        self.server.add_tool(
            "list_accounts",
            self._handle_list_accounts,
            {
                "type": "object",
                "properties": {},
                "required": []
            }
        )
        
        self.server.add_tool(
            "add_account",
            self._handle_add_account,
            {
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"},
                    "api_token": {"type": "string"},
                    "base_url": {"type": "string", "default": "https://api.antigravity.dev"}
                },
                "required": ["account_id", "api_token"]
            }
        )
        
        self.server.add_tool(
            "remove_account",
            self._handle_remove_account,
            {
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"}
                },
                "required": ["account_id"]
            }
        )
        
        self.server.add_tool(
            "switch_account",
            self._handle_switch_account,
            {
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"}
                },
                "required": ["account_id"]
            }
        )
        
        self.server.add_tool(
            "get_current_account",
            self._handle_get_current_account,
            {
                "type": "object",
                "properties": {},
                "required": []
            }
        )
        
        self.server.add_tool(
            "test_connection",
            self._handle_test_connection,
            {
                "type": "object",
                "properties": {},
                "required": []
            }
        )
        
        # Register resource handlers
        self.server.add_resource("antigravity://accounts", self._get_accounts_resource)
        
        logger.info("Antigravity MCP server initialized")
    
    async def _handle_list_accounts(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle list_accounts tool request"""
        try:
            accounts = antigravity_connector.list_accounts()
            return {
                "success": True,
                "accounts": accounts,
                "total": len(accounts)
            }
        except Exception as e:
            logger.error(f"Error listing accounts: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _handle_add_account(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle add_account tool request"""
        try:
            account_id = params["account_id"]
            api_token = params["api_token"]
            base_url = params.get("base_url", "https://api.antigravity.dev")
            
            success = antigravity_connector.add_account(account_id, api_token, base_url)
            
            if success:
                return {
                    "success": True,
                    "message": f"Account {account_id} added successfully"
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to validate account credentials"
                }
        except Exception as e:
            logger.error(f"Error adding account: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _handle_remove_account(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle remove_account tool request"""
        try:
            account_id = params["account_id"]
            
            if antigravity_connector.remove_account(account_id):
                return {
                    "success": True,
                    "message": f"Account {account_id} removed successfully"
                }
            else:
                return {
                    "success": False,
                    "error": f"Account {account_id} not found"
                }
        except Exception as e:
            logger.error(f"Error removing account: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _handle_switch_account(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle switch_account tool request"""
        try:
            account_id = params["account_id"]
            
            if antigravity_connector.switch_account(account_id):
                return {
                    "success": True,
                    "message": f"Switched to account {account_id}"
                }
            else:
                return {
                    "success": False,
                    "error": f"Account {account_id} not found"
                }
        except Exception as e:
            logger.error(f"Error switching account: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _handle_get_current_account(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle get_current_account tool request"""
        try:
            account_info = antigravity_connector.get_current_account_info()
            
            if account_info:
                return {
                    "success": True,
                    "account": account_info
                }
            else:
                return {
                    "success": False,
                    "error": "No current account set"
                }
        except Exception as e:
            logger.error(f"Error getting current account: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _handle_test_connection(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle test_connection tool request"""
        try:
            success, message = await antigravity_connector.test_connection()
            
            return {
                "success": success,
                "message": message
            }
        except Exception as e:
            logger.error(f"Error testing connection: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _get_accounts_resource(self) -> str:
        """Get accounts resource"""
        try:
            accounts = antigravity_connector.list_accounts()
            return json.dumps(accounts, indent=2)
        except Exception as e:
            logger.error(f"Error getting accounts resource: {e}")
            return json.dumps({"error": str(e)})
    
    async def run(self):
        """Run the MCP server"""
        try:
            await self.initialize()
            
            # Start server
            async with stdio_server() as (read_stream, write_stream):
                await self.server.run(
                    read_stream=read_stream,
                    write_stream=write_stream,
                    notification_callback=None
                )
                
        except Exception as e:
            logger.error(f"Error running MCP server: {e}")
            raise


# Global MCP instance
antigravity_mcp = AntigravityMCP()


async def main():
    """Main entry point for MCP server"""
    await antigravity_mcp.run()


if __name__ == "__main__":
    asyncio.run(main())