#!/usr/bin/env python3
"""
SIN-Solver Plane MCP Server - Enterprise AI Agent Orchestration
Integrates Plane.so with AI Agent Swarm for autonomous task management
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum

import httpx
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("plane-mcp")

PLANE_API_URL = os.getenv("PLANE_API_URL", "http://plane-dev:8081")
PLANE_API_KEY = os.getenv("PLANE_API_KEY", "")
PLANE_WORKSPACE_SLUG = os.getenv("PLANE_WORKSPACE_SLUG", "sin-solver")


class AgentRole(Enum):
    ORCHESTRATOR = "agent-zero"
    BROWSER = "steel-browser"
    SOCIAL = "clawdbot"
    SKYVERN = "skyvern"
    CODER = "opencode"
    TRESOR = "tresor"
    STAGEHAND = "stagehand"
    QA = "playwright"
    N8N = "n8n"
    SURFSENSE = "surfsense"


@dataclass
class AIAgent:
    id: str
    name: str
    role: AgentRole
    status: str = "idle"
    current_task: Optional[str] = None
    capabilities: List[str] = field(default_factory=list)
    last_activity: datetime = field(default_factory=datetime.now)


class AgentRegistry:
    def __init__(self):
        self.agents: Dict[str, AIAgent] = {}
        self._init_agents()
    
    def _init_agents(self):
        agent_configs = [
            ("agent-zero", "Agent Zero", AgentRole.ORCHESTRATOR, 
             ["planning", "delegation", "coordination", "decision-making"]),
            ("steel-browser", "Steel Browser", AgentRole.BROWSER,
             ["web-browsing", "screenshot", "form-filling", "scraping"]),
            ("clawdbot", "ClawdBot", AgentRole.SOCIAL,
             ["social-media", "messaging", "notifications", "content-posting"]),
            ("skyvern", "Skyvern", AgentRole.SKYVERN,
             ["automation", "workflow", "data-extraction", "form-automation"]),
            ("opencode", "OpenCode", AgentRole.CODER,
             ["coding", "debugging", "refactoring", "code-review"]),
            ("tresor", "Tresor Vault", AgentRole.TRESOR,
             ["credentials", "api-keys", "secrets", "encryption"]),
            ("stagehand", "Stagehand", AgentRole.STAGEHAND,
             ["research", "investigation", "data-gathering", "analysis"]),
            ("playwright", "Playwright QA", AgentRole.QA,
             ["testing", "validation", "e2e-tests", "visual-regression"]),
            ("n8n", "N8N Orchestrator", AgentRole.N8N,
             ["workflow-automation", "integrations", "triggers", "scheduling"]),
            ("surfsense", "SurfSense", AgentRole.SURFSENSE,
             ["knowledge-base", "memory", "context", "learning"]),
        ]
        
        for agent_id, name, role, capabilities in agent_configs:
            self.agents[agent_id] = AIAgent(
                id=agent_id,
                name=name,
                role=role,
                capabilities=capabilities
            )
    
    def get_agent(self, agent_id: str) -> Optional[AIAgent]:
        return self.agents.get(agent_id)
    
    def get_all_agents(self) -> List[AIAgent]:
        return list(self.agents.values())
    
    def update_status(self, agent_id: str, status: str, task: Optional[str] = None):
        if agent_id in self.agents:
            self.agents[agent_id].status = status
            self.agents[agent_id].current_task = task
            self.agents[agent_id].last_activity = datetime.now()


app = FastAPI(title="SIN-Solver Plane MCP Server", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent_registry = AgentRegistry()
active_websockets: List[WebSocket] = []


class PlaneClient:
    def __init__(self):
        self.base_url = PLANE_API_URL
        self.api_key = PLANE_API_KEY
        self.workspace = PLANE_WORKSPACE_SLUG
        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def _request(self, method: str, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Any:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            # Ensure endpoint has trailing slash (Plane API requirement)
            if not endpoint.endswith('/'):
                endpoint = endpoint + '/'
            url = f"{self.base_url}/api/v1/{endpoint}"
            response = await client.request(method, url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
    
    async def list_projects(self) -> List[Dict[str, Any]]:
        result = await self._request("GET", f"workspaces/{self.workspace}/projects")
        return result if isinstance(result, list) else [result] if result else []
    
    async def create_issue(self, project_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._request("POST", f"workspaces/{self.workspace}/projects/{project_id}/issues", data)
    
    async def get_issue(self, project_id: str, issue_id: str) -> Dict[str, Any]:
        return await self._request("GET", f"workspaces/{self.workspace}/projects/{project_id}/issues/{issue_id}")
    
    async def update_issue(self, project_id: str, issue_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._request("PATCH", f"workspaces/{self.workspace}/projects/{project_id}/issues/{issue_id}", data)
    
    async def add_comment(self, project_id: str, issue_id: str, comment: str, actor_id: str) -> Dict[str, Any]:
        data = {"comment_html": comment, "actor": actor_id}
        return await self._request("POST", f"workspaces/{self.workspace}/projects/{project_id}/issues/{issue_id}/comments", data)
    
    async def list_cycles(self, project_id: str) -> List[Dict[str, Any]]:
        result = await self._request("GET", f"workspaces/{self.workspace}/projects/{project_id}/cycles")
        return result if isinstance(result, list) else [result] if result else []
    
    async def list_modules(self, project_id: str) -> List[Dict[str, Any]]:
        result = await self._request("GET", f"workspaces/{self.workspace}/projects/{project_id}/modules")
        return result if isinstance(result, list) else [result] if result else []
    
    async def create_page(self, project_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._request("POST", f"workspaces/{self.workspace}/projects/{project_id}/pages", data)
    
    async def list_members(self) -> List[Dict[str, Any]]:
        result = await self._request("GET", f"workspaces/{self.workspace}/members")
        return result if isinstance(result, list) else [result] if result else []


plane_client = PlaneClient()


class IssueCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    assignee_ids: Optional[List[str]] = None
    labels: Optional[List[str]] = None


class AgentMention(BaseModel):
    agent_id: str
    issue_id: str
    project_id: str
    command: str
    context: Optional[Dict] = None


class AgentSuggestion(BaseModel):
    agent_id: str
    issue_id: str
    suggestion_type: str
    content: str
    auto_apply: bool = False


async def broadcast_agent_activity(activity: Dict):
    for ws in active_websockets:
        try:
            await ws.send_json(activity)
        except Exception:
            pass


async def notify_agent_zero(task: Dict, requesting_agent: str):
    activity = {
        "type": "agent_consultation",
        "from": requesting_agent,
        "to": "agent-zero",
        "task": task,
        "timestamp": datetime.now().isoformat()
    }
    await broadcast_agent_activity(activity)
    agent_registry.update_status("agent-zero", "consulting", task.get("description"))


async def request_credentials(agent_id: str, credential_type: str) -> Dict:
    activity = {
        "type": "credential_request",
        "from": agent_id,
        "to": "tresor",
        "credential_type": credential_type,
        "timestamp": datetime.now().isoformat()
    }
    await broadcast_agent_activity(activity)
    agent_registry.update_status("tresor", "retrieving", f"credentials for {agent_id}")
    return {"status": "pending", "request_id": f"cred_{datetime.now().timestamp()}"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/agents")
async def list_agents():
    agents = agent_registry.get_all_agents()
    return [
        {
            "id": a.id,
            "name": a.name,
            "role": a.role.value,
            "status": a.status,
            "current_task": a.current_task,
            "capabilities": a.capabilities,
            "last_activity": a.last_activity.isoformat()
        }
        for a in agents
    ]


@app.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = agent_registry.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {
        "id": agent.id,
        "name": agent.name,
        "role": agent.role.value,
        "status": agent.status,
        "current_task": agent.current_task,
        "capabilities": agent.capabilities
    }


@app.post("/issues")
async def create_issue(issue: IssueCreate):
    data = {
        "name": issue.name,
        "description_html": issue.description or "",
        "priority": issue.priority,
    }
    if issue.assignee_ids:
        data["assignee_ids"] = issue.assignee_ids
    if issue.labels:
        data["labels"] = issue.labels
    
    result = await plane_client.create_issue(issue.project_id, data)
    
    await broadcast_agent_activity({
        "type": "issue_created",
        "issue": result,
        "timestamp": datetime.now().isoformat()
    })
    
    return result


@app.post("/agents/mention")
async def handle_agent_mention(mention: AgentMention):
    agent = agent_registry.get_agent(mention.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent_registry.update_status(mention.agent_id, "processing", mention.command)
    
    activity = {
        "type": "agent_mentioned",
        "agent": mention.agent_id,
        "command": mention.command,
        "issue_id": mention.issue_id,
        "project_id": mention.project_id,
        "timestamp": datetime.now().isoformat()
    }
    await broadcast_agent_activity(activity)
    
    if agent.role != AgentRole.ORCHESTRATOR:
        is_complex = len(mention.command.split()) > 10 or "create" in mention.command.lower()
        if is_complex:
            await notify_agent_zero({
                "description": mention.command,
                "requesting_agent": mention.agent_id,
                "issue_id": mention.issue_id
            }, mention.agent_id)
    
    if "login" in mention.command.lower() or "credential" in mention.command.lower():
        await request_credentials(mention.agent_id, "login")
    
    return {
        "status": "processing",
        "agent": mention.agent_id,
        "task_id": f"task_{datetime.now().timestamp()}"
    }


@app.post("/agents/suggest")
async def agent_suggestion(suggestion: AgentSuggestion):
    agent = agent_registry.get_agent(suggestion.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    activity = {
        "type": "agent_suggestion",
        "agent": suggestion.agent_id,
        "suggestion_type": suggestion.suggestion_type,
        "content": suggestion.content,
        "auto_apply": suggestion.auto_apply,
        "issue_id": suggestion.issue_id,
        "timestamp": datetime.now().isoformat()
    }
    await broadcast_agent_activity(activity)
    
    return {"status": "suggestion_sent", "suggestion_id": f"sug_{datetime.now().timestamp()}"}


@app.websocket("/ws/activity")
async def websocket_activity(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    
    try:
        await websocket.send_json({
            "type": "connection_established",
            "agents": [a.id for a in agent_registry.get_all_agents()],
            "timestamp": datetime.now().isoformat()
        })
        
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif data.get("type") == "agent_command":
                agent_id = data.get("agent_id")
                command = data.get("command")
                
                if agent_id and command:
                    agent_registry.update_status(agent_id, "executing", command)
                    await broadcast_agent_activity({
                        "type": "agent_executing",
                        "agent": agent_id,
                        "command": command,
                        "timestamp": datetime.now().isoformat()
                    })
    
    except WebSocketDisconnect:
        active_websockets.remove(websocket)


@app.get("/projects")
async def list_projects():
    return await plane_client.list_projects()


@app.get("/projects/{project_id}/cycles")
async def list_cycles(project_id: str):
    return await plane_client.list_cycles(project_id)


@app.get("/projects/{project_id}/modules")
async def list_modules(project_id: str):
    return await plane_client.list_modules(project_id)


@app.get("/members")
async def list_members():
    return await plane_client.list_members()


MCP_TOOLS = [
    {
        "name": "plane_list_projects",
        "description": "List all projects in the Plane workspace",
        "inputSchema": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "plane_create_issue",
        "description": "Create a new issue in Plane",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "priority": {"type": "string", "enum": ["urgent", "high", "medium", "low", "none"]},
                "assignee_ids": {"type": "array", "items": {"type": "string"}},
                "labels": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["project_id", "name"]
        }
    },
    {
        "name": "plane_get_issue",
        "description": "Get details of a specific issue",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string"},
                "issue_id": {"type": "string"}
            },
            "required": ["project_id", "issue_id"]
        }
    },
    {
        "name": "plane_update_issue",
        "description": "Update an existing issue",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string"},
                "issue_id": {"type": "string"},
                "data": {"type": "object"}
            },
            "required": ["project_id", "issue_id", "data"]
        }
    },
    {
        "name": "plane_add_comment",
        "description": "Add a comment to an issue",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string"},
                "issue_id": {"type": "string"},
                "comment": {"type": "string"},
                "actor_id": {"type": "string"}
            },
            "required": ["project_id", "issue_id", "comment"]
        }
    },
    {
        "name": "plane_list_cycles",
        "description": "List all cycles/sprints in a project",
        "inputSchema": {
            "type": "object",
            "properties": {"project_id": {"type": "string"}},
            "required": ["project_id"]
        }
    },
    {
        "name": "plane_list_modules",
        "description": "List all modules in a project",
        "inputSchema": {
            "type": "object",
            "properties": {"project_id": {"type": "string"}},
            "required": ["project_id"]
        }
    },
    {
        "name": "plane_mention_agent",
        "description": "Mention an AI agent to delegate a task",
        "inputSchema": {
            "type": "object",
            "properties": {
                "agent_id": {"type": "string", "enum": ["agent-zero", "steel-browser", "clawdbot", "skyvern", "opencode", "tresor", "stagehand", "playwright", "n8n", "surfsense"]},
                "issue_id": {"type": "string"},
                "project_id": {"type": "string"},
                "command": {"type": "string"}
            },
            "required": ["agent_id", "issue_id", "project_id", "command"]
        }
    },
    {
        "name": "plane_list_agents",
        "description": "List all available AI agents and their status",
        "inputSchema": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "plane_agent_suggest",
        "description": "Submit an AI agent suggestion for an issue",
        "inputSchema": {
            "type": "object",
            "properties": {
                "agent_id": {"type": "string"},
                "issue_id": {"type": "string"},
                "suggestion_type": {"type": "string", "enum": ["correction", "improvement", "automation", "delegation"]},
                "content": {"type": "string"},
                "auto_apply": {"type": "boolean"}
            },
            "required": ["agent_id", "issue_id", "suggestion_type", "content"]
        }
    }
]


@app.get("/mcp/tools")
async def list_mcp_tools():
    return {"tools": MCP_TOOLS}


@app.post("/mcp/tools/{tool_name}")
async def execute_mcp_tool(tool_name: str, arguments: Optional[Dict[str, Any]] = None):
    arguments = arguments or {}
    
    tool_handlers = {
        "plane_list_projects": lambda: plane_client.list_projects(),
        "plane_create_issue": lambda: create_issue(IssueCreate(**arguments)),
        "plane_get_issue": lambda: plane_client.get_issue(arguments["project_id"], arguments["issue_id"]),
        "plane_update_issue": lambda: plane_client.update_issue(arguments["project_id"], arguments["issue_id"], arguments.get("data", {})),
        "plane_add_comment": lambda: plane_client.add_comment(arguments["project_id"], arguments["issue_id"], arguments["comment"], arguments.get("actor_id", "system")),
        "plane_list_cycles": lambda: plane_client.list_cycles(arguments["project_id"]),
        "plane_list_modules": lambda: plane_client.list_modules(arguments["project_id"]),
        "plane_mention_agent": lambda: handle_agent_mention(AgentMention(**arguments)),
        "plane_list_agents": lambda: list_agents(),
        "plane_agent_suggest": lambda: agent_suggestion(AgentSuggestion(**arguments)),
    }
    
    if tool_name not in tool_handlers:
        raise HTTPException(status_code=404, detail=f"Tool {tool_name} not found")
    
    return await tool_handlers[tool_name]()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8216)