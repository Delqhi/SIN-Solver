import asyncio
import json
import os
import sys
import base64
import subprocess
import tempfile
from typing import Optional
from datetime import datetime
from contextlib import asynccontextmanager

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Configuration
CLAWDBOT_URL = os.getenv("CLAWDBOT_URL", "http://172.20.0.9:8080")
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY", os.getenv("GEMINI_API_KEY", ""))
OPENCODE_API_KEY = os.getenv("OPENCODE_API_KEY", "")
HTTP_PORT = int(os.getenv("HTTP_PORT", "8203"))
RUN_MODE = os.getenv("RUN_MODE", "http")  # "http" or "stdio"

server = Server("sin-social-mcp")


def run_yt_dlp(url: str, args: list[str] = None) -> dict:
    cmd = ["yt-dlp", "--dump-json"]
    if args:
        cmd.extend(args)
    cmd.append(url)
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            return json.loads(result.stdout)
        return {"error": result.stderr}
    except Exception as e:
        return {"error": str(e)}


def extract_frame(video_path: str, timestamp: str) -> Optional[str]:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        cmd = [
            "ffmpeg", "-ss", timestamp, "-i", video_path,
            "-vframes", "1", "-q:v", "2", "-y", tmp.name
        ]
        try:
            subprocess.run(cmd, capture_output=True, timeout=30)
            with open(tmp.name, "rb") as f:
                return base64.b64encode(f.read()).decode()
        except Exception:
            return None
        finally:
            os.unlink(tmp.name)


async def analyze_with_gemini(image_base64: str, prompt: str) -> str:
    if not GEMINI_API_KEY:
        return "Error: GEMINI_API_KEY not set"
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}}
            ]
        }]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=60)
        if response.status_code == 200:
            data = response.json()
            return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "No response")
        return f"Gemini Error: {response.status_code}"


async def analyze_with_grok(text: str, prompt: str) -> str:
    if not OPENCODE_API_KEY:
        return "Error: OPENCODE_API_KEY not set"
    
    url = "https://api.opencode.ai/v1/chat/completions"
    
    payload = {
        "model": "opencode/grok-code",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant analyzing video content."},
            {"role": "user", "content": f"{prompt}\n\nContent:\n{text}"}
        ]
    }
    
    headers = {"Authorization": f"Bearer {OPENCODE_API_KEY}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=60)
        if response.status_code == 200:
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "No response")
        return f"Grok Error: {response.status_code}"


async def post_to_clawdbot(message: str, platforms: list[str] = None) -> dict:
    url = f"{CLAWDBOT_URL}/api/notify"
    payload = {
        "message": message,
        "type": "info",
        "providers": platforms or ["all"]
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=30)
            return response.json()
        except Exception as e:
            return {"error": str(e)}


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_video_info",
            description="Get metadata and transcript from YouTube/TikTok/Instagram video",
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Video URL"}
                },
                "required": ["url"]
            }
        ),
        Tool(
            name="analyze_video_frame",
            description="Extract and analyze a specific frame from video using Gemini Vision",
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Video URL"},
                    "timestamp": {"type": "string", "description": "Timestamp (e.g., '01:30')"},
                    "prompt": {"type": "string", "description": "What to analyze in the frame"}
                },
                "required": ["url", "timestamp", "prompt"]
            }
        ),
        Tool(
            name="analyze_transcript",
            description="Analyze video transcript with Grok AI",
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Video URL"},
                    "prompt": {"type": "string", "description": "Analysis prompt"}
                },
                "required": ["url", "prompt"]
            }
        ),
        Tool(
            name="post_to_social",
            description="Post content to social media via ClawdBot (Telegram/WhatsApp/Discord)",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "Message to post"},
                    "platforms": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Platforms: telegram, whatsapp, discord, all"
                    }
                },
                "required": ["message"]
            }
        ),
        Tool(
            name="download_video",
            description="Download video for local processing",
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Video URL"},
                    "format": {"type": "string", "description": "Format: best, mp4, mp3"}
                },
                "required": ["url"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "get_video_info":
        url = arguments["url"]
        info = run_yt_dlp(url, ["--write-auto-subs", "--skip-download"])
        
        result = {
            "title": info.get("title", "Unknown"),
            "description": info.get("description", ""),
            "duration": info.get("duration", 0),
            "uploader": info.get("uploader", "Unknown"),
            "view_count": info.get("view_count", 0),
            "like_count": info.get("like_count", 0),
            "upload_date": info.get("upload_date", ""),
            "subtitles": info.get("subtitles", {}),
            "automatic_captions": list(info.get("automatic_captions", {}).keys())
        }
        
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "analyze_video_frame":
        url = arguments["url"]
        timestamp = arguments["timestamp"]
        prompt = arguments["prompt"]
        
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            cmd = ["yt-dlp", "-f", "best[height<=720]", "-o", tmp.name, url]
            subprocess.run(cmd, capture_output=True, timeout=120)
            
            frame_b64 = extract_frame(tmp.name, timestamp)
            os.unlink(tmp.name)
            
            if frame_b64:
                analysis = await analyze_with_gemini(frame_b64, prompt)
                return [TextContent(type="text", text=analysis)]
            return [TextContent(type="text", text="Failed to extract frame")]
    
    elif name == "analyze_transcript":
        url = arguments["url"]
        prompt = arguments["prompt"]
        
        info = run_yt_dlp(url, ["--write-auto-subs", "--skip-download"])
        
        transcript = info.get("description", "") + "\n\n"
        if "automatic_captions" in info:
            for lang, subs in info.get("automatic_captions", {}).items():
                if lang.startswith("en"):
                    transcript += f"[{lang}] Available"
                    break
        
        analysis = await analyze_with_grok(transcript, prompt)
        return [TextContent(type="text", text=analysis)]
    
    elif name == "post_to_social":
        message = arguments["message"]
        platforms = arguments.get("platforms", ["all"])
        
        result = await post_to_clawdbot(message, platforms)
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "download_video":
        url = arguments["url"]
        fmt = arguments.get("format", "best")
        
        output_dir = "/tmp/sin-social-downloads"
        os.makedirs(output_dir, exist_ok=True)
        
        output_path = os.path.join(output_dir, "%(title)s.%(ext)s")
        cmd = ["yt-dlp", "-f", fmt, "-o", output_path, url]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            return [TextContent(type="text", text=f"Downloaded to {output_dir}")]
        return [TextContent(type="text", text=f"Error: {result.stderr}")]
    
    return [TextContent(type="text", text=f"Unknown tool: {name}")]


async def run_stdio():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀 SIN-Social-MCP starting on port {HTTP_PORT}")
    yield
    print("👋 SIN-Social-MCP shutting down")


http_app = FastAPI(
    title="SIN-Social-MCP",
    description="Social media automation MCP for video analysis and posting",
    version="1.0.0",
    lifespan=lifespan
)

http_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ToolRequest(BaseModel):
    tool: str
    arguments: dict


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str
    tools_available: int
    gemini_configured: bool
    opencode_configured: bool
    clawdbot_url: str


@http_app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="sin-social-mcp",
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat(),
        tools_available=5,
        gemini_configured=bool(GEMINI_API_KEY),
        opencode_configured=bool(OPENCODE_API_KEY),
        clawdbot_url=CLAWDBOT_URL
    )


@http_app.get("/tools")
async def list_available_tools():
    tools = await list_tools()
    return {"tools": [{"name": t.name, "description": t.description, "schema": t.inputSchema} for t in tools]}


@http_app.post("/tools/execute")
async def execute_tool(request: ToolRequest):
    try:
        result = await call_tool(request.tool, request.arguments)
        return {"success": True, "result": [r.text for r in result]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@http_app.post("/api/video/info")
async def api_get_video_info(url: str):
    result = await call_tool("get_video_info", {"url": url})
    return json.loads(result[0].text)


@http_app.post("/api/video/analyze-frame")
async def api_analyze_frame(url: str, timestamp: str, prompt: str):
    result = await call_tool("analyze_video_frame", {"url": url, "timestamp": timestamp, "prompt": prompt})
    return {"analysis": result[0].text}


@http_app.post("/api/video/analyze-transcript")
async def api_analyze_transcript(url: str, prompt: str):
    result = await call_tool("analyze_transcript", {"url": url, "prompt": prompt})
    return {"analysis": result[0].text}


@http_app.post("/api/social/post")
async def api_post_to_social(message: str, platforms: list[str] = None):
    result = await call_tool("post_to_social", {"message": message, "platforms": platforms or ["all"]})
    return json.loads(result[0].text)


@http_app.post("/api/video/download")
async def api_download_video(url: str, format: str = "best"):
    result = await call_tool("download_video", {"url": url, "format": format})
    return {"result": result[0].text}


def main():
    if RUN_MODE == "stdio":
        print("Running in stdio MCP mode")
        asyncio.run(run_stdio())
    else:
        print(f"Running in HTTP mode on port {HTTP_PORT}")
        uvicorn.run(http_app, host="0.0.0.0", port=HTTP_PORT)


if __name__ == "__main__":
    main()
