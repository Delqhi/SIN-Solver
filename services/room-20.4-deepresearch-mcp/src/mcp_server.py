import asyncio
import os
import logging
from typing import Any
from datetime import datetime

from mcp.server import Server
from mcp.types import Tool, TextContent
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import httpx
from duckduckgo_search import DDGS
import trafilatura
import html2text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RUN_MODE = os.getenv("RUN_MODE", "http")
HTTP_PORT = int(os.getenv("HTTP_PORT", "8204"))
STEEL_URL = os.getenv("STEEL_URL", "http://agent-05-steel-browser:3000")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

app = FastAPI(title="SIN-Deep-Research-MCP", version="1.0.0")
mcp_server = Server("sin-deep-research-mcp")

TOOLS = [
    Tool(
        name="web_search",
        description="Search the web using DuckDuckGo (FREE, no API key needed)",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "max_results": {"type": "integer", "default": 10, "description": "Max results to return"},
                "region": {"type": "string", "default": "wt-wt", "description": "Region code (wt-wt=worldwide)"}
            },
            "required": ["query"]
        }
    ),
    Tool(
        name="news_search",
        description="Search recent news using DuckDuckGo News",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "News search query"},
                "max_results": {"type": "integer", "default": 10},
                "timelimit": {"type": "string", "default": "w", "description": "d=day, w=week, m=month"}
            },
            "required": ["query"]
        }
    ),
    Tool(
        name="extract_content",
        description="Extract main content from a URL (article text, no ads/navigation)",
        inputSchema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL to extract content from"},
                "include_links": {"type": "boolean", "default": False},
                "include_images": {"type": "boolean", "default": False}
            },
            "required": ["url"]
        }
    ),
    Tool(
        name="deep_research",
        description="Perform deep research: search + extract content from top results",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Research topic"},
                "max_sources": {"type": "integer", "default": 5, "description": "Number of sources to analyze"},
                "summarize": {"type": "boolean", "default": True, "description": "Summarize with AI"}
            },
            "required": ["query"]
        }
    ),
    Tool(
        name="steel_browse",
        description="Browse URL using Steel Browser (stealth mode, handles JS)",
        inputSchema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL to browse"},
                "wait_for": {"type": "string", "description": "CSS selector to wait for"},
                "screenshot": {"type": "boolean", "default": False}
            },
            "required": ["url"]
        }
    )
]


async def web_search(query: str, max_results: int = 10, region: str = "wt-wt") -> dict:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, region=region, max_results=max_results))
        return {
            "success": True,
            "query": query,
            "count": len(results),
            "results": results
        }
    except Exception as e:
        logger.error(f"Web search error: {e}")
        return {"success": False, "error": str(e)}


async def news_search(query: str, max_results: int = 10, timelimit: str = "w") -> dict:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.news(query, timelimit=timelimit, max_results=max_results))
        return {
            "success": True,
            "query": query,
            "count": len(results),
            "results": results
        }
    except Exception as e:
        logger.error(f"News search error: {e}")
        return {"success": False, "error": str(e)}


async def extract_content(url: str, include_links: bool = False, include_images: bool = False) -> dict:
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0, follow_redirects=True)
                downloaded = response.text
        
        content = trafilatura.extract(
            downloaded,
            include_links=include_links,
            include_images=include_images,
            include_tables=True,
            no_fallback=False
        )
        
        if not content:
            h = html2text.HTML2Text()
            h.ignore_links = not include_links
            h.ignore_images = not include_images
            content = h.handle(downloaded)
        
        return {
            "success": True,
            "url": url,
            "content": content[:50000] if content else "",
            "length": len(content) if content else 0
        }
    except Exception as e:
        logger.error(f"Content extraction error: {e}")
        return {"success": False, "url": url, "error": str(e)}


async def deep_research(query: str, max_sources: int = 5, summarize: bool = True) -> dict:
    search_result = await web_search(query, max_results=max_sources)
    
    if not search_result.get("success"):
        return search_result
    
    sources = []
    for result in search_result.get("results", [])[:max_sources]:
        url = result.get("href") or result.get("link")
        if url:
            content = await extract_content(url)
            sources.append({
                "title": result.get("title", ""),
                "url": url,
                "snippet": result.get("body", ""),
                "content": content.get("content", "")[:10000] if content.get("success") else "",
                "extraction_success": content.get("success", False)
            })
    
    research_data = {
        "success": True,
        "query": query,
        "sources_analyzed": len(sources),
        "sources": sources,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if summarize and GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            combined_content = "\n\n".join([
                f"Source: {s['title']}\n{s['content'][:3000]}"
                for s in sources if s.get('content')
            ])
            
            prompt = f"Summarize this research on '{query}':\n\n{combined_content[:15000]}"
            response = model.generate_content(prompt)
            research_data["summary"] = response.text
        except Exception as e:
            logger.error(f"Summarization error: {e}")
            research_data["summary_error"] = str(e)
    
    return research_data


async def steel_browse(url: str, wait_for: str = None, screenshot: bool = False) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            session_response = await client.post(
                f"{STEEL_URL}/v1/sessions",
                json={"stealth": True},
                timeout=30.0
            )
            session = session_response.json()
            session_id = session.get("sessionId")
            
            if not session_id:
                return {"success": False, "error": "Failed to create Steel session"}
            
            nav_response = await client.post(
                f"{STEEL_URL}/v1/sessions/{session_id}/navigate",
                json={"url": url, "waitUntil": "networkidle"},
                timeout=60.0
            )
            
            if wait_for:
                await client.post(
                    f"{STEEL_URL}/v1/sessions/{session_id}/wait",
                    json={"selector": wait_for, "timeout": 10000},
                    timeout=15.0
                )
            
            content_response = await client.get(
                f"{STEEL_URL}/v1/sessions/{session_id}/content",
                timeout=30.0
            )
            html_content = content_response.json().get("content", "")
            
            screenshot_data = None
            if screenshot:
                screenshot_response = await client.post(
                    f"{STEEL_URL}/v1/sessions/{session_id}/screenshot",
                    json={"fullPage": False},
                    timeout=30.0
                )
                screenshot_data = screenshot_response.json().get("data")
            
            await client.delete(f"{STEEL_URL}/v1/sessions/{session_id}", timeout=10.0)
            
            text_content = trafilatura.extract(html_content) or ""
            
            return {
                "success": True,
                "url": url,
                "content": text_content[:30000],
                "html_length": len(html_content),
                "screenshot": screenshot_data[:100] + "..." if screenshot_data else None
            }
    except Exception as e:
        logger.error(f"Steel browse error: {e}")
        return {"success": False, "url": url, "error": str(e)}


@mcp_server.list_tools()
async def list_tools():
    return TOOLS


@mcp_server.call_tool()
async def call_tool(name: str, arguments: dict) -> list:
    handlers = {
        "web_search": lambda args: web_search(
            args["query"],
            args.get("max_results", 10),
            args.get("region", "wt-wt")
        ),
        "news_search": lambda args: news_search(
            args["query"],
            args.get("max_results", 10),
            args.get("timelimit", "w")
        ),
        "extract_content": lambda args: extract_content(
            args["url"],
            args.get("include_links", False),
            args.get("include_images", False)
        ),
        "deep_research": lambda args: deep_research(
            args["query"],
            args.get("max_sources", 5),
            args.get("summarize", True)
        ),
        "steel_browse": lambda args: steel_browse(
            args["url"],
            args.get("wait_for"),
            args.get("screenshot", False)
        )
    }
    
    if name not in handlers:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]
    
    result = await handlers[name](arguments)
    import json
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]


class ToolRequest(BaseModel):
    name: str
    arguments: dict = {}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "sin-deep-research-mcp",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/tools")
async def get_tools():
    return {"tools": [{"name": t.name, "description": t.description} for t in TOOLS]}


@app.post("/tools/{tool_name}")
async def execute_tool(tool_name: str, request: ToolRequest = None):
    arguments = request.arguments if request else {}
    result = await call_tool(tool_name, arguments)
    import json
    return json.loads(result[0].text) if result else {"error": "No result"}


@app.post("/search")
async def search_endpoint(query: str, max_results: int = 10):
    return await web_search(query, max_results)


@app.post("/extract")
async def extract_endpoint(url: str):
    return await extract_content(url)


@app.post("/research")
async def research_endpoint(query: str, max_sources: int = 5):
    return await deep_research(query, max_sources)


if __name__ == "__main__":
    if RUN_MODE == "http":
        logger.info(f"Starting HTTP server on port {HTTP_PORT}")
        uvicorn.run(app, host="0.0.0.0", port=HTTP_PORT)
    else:
        logger.info("Starting MCP server in stdio mode")
        asyncio.run(mcp_server.run())
