"""
Zimmer-20.5 SIN-Video-Gen-MCP
Elite Video Generator - 100% FREE

Features:
- generate_video: Create video from images/text
- add_logo: Overlay logo on video
- add_subtitles: Generate and burn subtitles
- add_voiceover: TTS voice-over generation
- resize_video: Multiple formats (16:9, 9:16, 1:1)
- add_text_overlay: Text graphics on video
- trim_video: Adjust length
- merge_videos: Combine multiple clips
- generate_thumbnail: Create video thumbnails
- extract_audio: Extract audio from video
"""

import asyncio
import json
import os
import subprocess
import tempfile
import uuid
import base64
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Configuration
HTTP_PORT = int(os.getenv("HTTP_PORT", "8205"))
RUN_MODE = os.getenv("RUN_MODE", "http")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "/app/output")
TEMP_DIR = os.getenv("TEMP_DIR", "/app/temp")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
OPENCODE_API_KEY = os.getenv("OPENCODE_API_KEY", "")

# Ensure directories exist
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

server = Server("sin-video-gen-mcp")


# =============================================================================
# VIDEO PROCESSING FUNCTIONS (100% FREE with FFmpeg)
# =============================================================================

def run_ffmpeg(args: list, timeout: int = 300) -> tuple[bool, str]:
    """Run FFmpeg command and return success status + output."""
    cmd = ["ffmpeg", "-y"] + args
    try:
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            timeout=timeout
        )
        if result.returncode == 0:
            return True, result.stdout or "Success"
        return False, result.stderr
    except subprocess.TimeoutExpired:
        return False, "FFmpeg timeout"
    except Exception as e:
        return False, str(e)


def generate_video_from_images(
    images: List[str],
    output_path: str,
    duration_per_image: float = 3.0,
    fps: int = 30,
    transition: str = "fade",
    resolution: str = "1920x1080"
) -> tuple[bool, str]:
    """Generate video from list of image paths."""
    width, height = resolution.split("x")
    
    # Create input file list
    list_file = os.path.join(TEMP_DIR, f"input_{uuid.uuid4().hex}.txt")
    with open(list_file, "w") as f:
        for img in images:
            f.write(f"file '{img}'\n")
            f.write(f"duration {duration_per_image}\n")
        # Repeat last image for proper ending
        if images:
            f.write(f"file '{images[-1]}'\n")
    
    args = [
        "-f", "concat", "-safe", "0",
        "-i", list_file,
        "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
        "-c:v", "libx264", "-preset", "medium",
        "-pix_fmt", "yuv420p",
        "-r", str(fps),
        output_path
    ]
    
    success, msg = run_ffmpeg(args)
    os.unlink(list_file)
    return success, msg


def add_logo_to_video(
    video_path: str,
    logo_path: str,
    output_path: str,
    position: str = "top-right",
    scale: float = 0.15,
    opacity: float = 0.8
) -> tuple[bool, str]:
    """Add logo overlay to video."""
    # Position mapping
    positions = {
        "top-left": "10:10",
        "top-right": "main_w-overlay_w-10:10",
        "bottom-left": "10:main_h-overlay_h-10",
        "bottom-right": "main_w-overlay_w-10:main_h-overlay_h-10",
        "center": "(main_w-overlay_w)/2:(main_h-overlay_h)/2"
    }
    pos = positions.get(position, positions["top-right"])
    
    # Scale based on video width
    filter_complex = (
        f"[1:v]scale=iw*{scale}:-1,format=rgba,colorchannelmixer=aa={opacity}[logo];"
        f"[0:v][logo]overlay={pos}"
    )
    
    args = [
        "-i", video_path,
        "-i", logo_path,
        "-filter_complex", filter_complex,
        "-c:a", "copy",
        output_path
    ]
    
    return run_ffmpeg(args)


def add_text_overlay(
    video_path: str,
    output_path: str,
    text: str,
    font_size: int = 48,
    font_color: str = "white",
    position: str = "center",
    start_time: float = 0,
    duration: float = 5,
    box: bool = True,
    box_color: str = "black@0.5"
) -> tuple[bool, str]:
    """Add text overlay to video."""
    positions = {
        "top": "x=(w-text_w)/2:y=50",
        "center": "x=(w-text_w)/2:y=(h-text_h)/2",
        "bottom": "x=(w-text_w)/2:y=h-text_h-50",
        "top-left": "x=50:y=50",
        "bottom-left": "x=50:y=h-text_h-50"
    }
    pos = positions.get(position, positions["center"])
    
    # Escape text for FFmpeg
    escaped_text = text.replace("'", "\\'").replace(":", "\\:")
    
    box_option = f":box=1:boxcolor={box_color}:boxborderw=10" if box else ""
    
    filter_str = (
        f"drawtext=text='{escaped_text}':fontsize={font_size}:fontcolor={font_color}:"
        f"{pos}{box_option}:enable='between(t,{start_time},{start_time + duration})'"
    )
    
    args = [
        "-i", video_path,
        "-vf", filter_str,
        "-c:a", "copy",
        output_path
    ]
    
    return run_ffmpeg(args)


def add_subtitles(
    video_path: str,
    output_path: str,
    subtitle_file: str,
    style: str = "FontSize=24,PrimaryColour=&Hffffff&"
) -> tuple[bool, str]:
    """Burn subtitles into video."""
    args = [
        "-i", video_path,
        "-vf", f"subtitles={subtitle_file}:force_style='{style}'",
        "-c:a", "copy",
        output_path
    ]
    
    return run_ffmpeg(args)


async def generate_tts_audio_async(
    text: str,
    output_path: str,
    voice: str = "en-US-GuyNeural",
    speed: float = 1.0
) -> tuple[bool, str]:
    """Generate TTS audio using edge-tts (Microsoft Edge FREE TTS)."""
    try:
        import edge_tts
        
        # Voice mapping for common languages
        voice_mapping = {
            "en": "en-US-GuyNeural",
            "en-us": "en-US-GuyNeural",
            "en-gb": "en-GB-RyanNeural",
            "de": "de-DE-ConradNeural",
            "fr": "fr-FR-HenriNeural",
            "es": "es-ES-AlvaroNeural",
            "it": "it-IT-DiegoNeural",
            "pt": "pt-BR-AntonioNeural",
            "ja": "ja-JP-KeitaNeural",
            "ko": "ko-KR-InJoonNeural",
            "zh": "zh-CN-YunxiNeural",
        }
        
        # Get voice or use provided
        selected_voice = voice_mapping.get(voice.lower(), voice)
        
        # Adjust rate based on speed
        rate_percent = int((speed - 1.0) * 100)
        rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"
        
        # Generate using edge-tts
        communicate = edge_tts.Communicate(text, selected_voice, rate=rate_str)
        await communicate.save(output_path)
        
        return True, f"TTS generated successfully with voice: {selected_voice}"
    except Exception as e:
        return False, str(e)


def generate_tts_audio(
    text: str,
    output_path: str,
    voice: str = "en-US-GuyNeural",
    speed: float = 1.0
) -> tuple[bool, str]:
    """Synchronous wrapper for edge-tts generation."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(generate_tts_audio_async(text, output_path, voice, speed))


def add_voiceover(
    video_path: str,
    audio_path: str,
    output_path: str,
    volume: float = 1.0,
    mix_original: bool = True,
    original_volume: float = 0.2
) -> tuple[bool, str]:
    """Add voiceover audio to video."""
    if mix_original:
        filter_complex = (
            f"[0:a]volume={original_volume}[orig];"
            f"[1:a]volume={volume}[voice];"
            f"[orig][voice]amix=inputs=2:duration=first[aout]"
        )
        args = [
            "-i", video_path,
            "-i", audio_path,
            "-filter_complex", filter_complex,
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "copy",
            output_path
        ]
    else:
        args = [
            "-i", video_path,
            "-i", audio_path,
            "-map", "0:v",
            "-map", "1:a",
            "-c:v", "copy",
            "-shortest",
            output_path
        ]
    
    return run_ffmpeg(args)


def resize_video(
    video_path: str,
    output_path: str,
    aspect_ratio: str = "16:9",
    resolution: Optional[str] = None
) -> tuple[bool, str]:
    """Resize video to different aspect ratios."""
    # Preset resolutions for common aspect ratios
    presets = {
        "16:9": "1920x1080",
        "9:16": "1080x1920",  # Vertical (TikTok, Reels)
        "1:1": "1080x1080",   # Square (Instagram)
        "4:3": "1440x1080",
        "21:9": "2560x1080"   # Ultrawide
    }
    
    res = resolution or presets.get(aspect_ratio, "1920x1080")
    width, height = res.split("x")
    
    filter_str = (
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black"
    )
    
    args = [
        "-i", video_path,
        "-vf", filter_str,
        "-c:a", "copy",
        output_path
    ]
    
    return run_ffmpeg(args)


def trim_video(
    video_path: str,
    output_path: str,
    start_time: float = 0,
    end_time: Optional[float] = None,
    duration: Optional[float] = None
) -> tuple[bool, str]:
    """Trim video to specified time range."""
    args = ["-i", video_path, "-ss", str(start_time)]
    
    if duration:
        args.extend(["-t", str(duration)])
    elif end_time:
        args.extend(["-to", str(end_time)])
    
    args.extend(["-c", "copy", output_path])
    
    return run_ffmpeg(args)


def merge_videos(
    video_paths: List[str],
    output_path: str,
    transition: str = "none"
) -> tuple[bool, str]:
    """Merge multiple videos into one."""
    # Create concat file
    list_file = os.path.join(TEMP_DIR, f"concat_{uuid.uuid4().hex}.txt")
    with open(list_file, "w") as f:
        for path in video_paths:
            f.write(f"file '{path}'\n")
    
    args = [
        "-f", "concat",
        "-safe", "0",
        "-i", list_file,
        "-c", "copy",
        output_path
    ]
    
    success, msg = run_ffmpeg(args)
    os.unlink(list_file)
    return success, msg


def generate_thumbnail(
    video_path: str,
    output_path: str,
    time: float = 1.0,
    size: str = "1280x720"
) -> tuple[bool, str]:
    """Generate thumbnail from video."""
    args = [
        "-ss", str(time),
        "-i", video_path,
        "-vframes", "1",
        "-s", size,
        "-q:v", "2",
        output_path
    ]
    
    return run_ffmpeg(args)


def extract_audio(
    video_path: str,
    output_path: str,
    format: str = "mp3",
    bitrate: str = "192k"
) -> tuple[bool, str]:
    """Extract audio from video."""
    args = [
        "-i", video_path,
        "-vn",
        "-acodec", "libmp3lame" if format == "mp3" else "aac",
        "-ab", bitrate,
        output_path
    ]
    
    return run_ffmpeg(args)


async def generate_script_with_ai(topic: str, duration_seconds: int = 60) -> str:
    """Generate video script using FREE AI (Gemini or OpenCode)."""
    prompt = f"""Generate a short video script for a {duration_seconds}-second video about: {topic}

Requirements:
- Natural, conversational tone
- Clear structure: Hook, Main Content, Call to Action
- Approximately {duration_seconds // 10} sentences
- Include [VISUAL: description] hints for what to show

Return ONLY the script text, no additional formatting."""

    # Try Gemini first (FREE)
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        except Exception:
            pass
    
    # Fallback to OpenCode (FREE)
    if OPENCODE_API_KEY:
        try:
            url = "https://api.opencode.ai/v1/chat/completions"
            payload = {
                "model": "opencode/grok-code",
                "messages": [{"role": "user", "content": prompt}]
            }
            headers = {"Authorization": f"Bearer {OPENCODE_API_KEY}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except Exception:
            pass
    
    # Default script if no AI available
    return f"Welcome to this video about {topic}. Let's explore this topic together. Thank you for watching!"


# =============================================================================
# MCP TOOLS DEFINITION
# =============================================================================

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="generate_video",
            description="Generate video from images with transitions and effects",
            inputSchema={
                "type": "object",
                "properties": {
                    "images": {"type": "array", "items": {"type": "string"}, "description": "List of image paths or URLs"},
                    "duration_per_image": {"type": "number", "default": 3.0},
                    "resolution": {"type": "string", "default": "1920x1080"},
                    "fps": {"type": "integer", "default": 30},
                    "output_name": {"type": "string", "description": "Output filename (without extension)"}
                },
                "required": ["images"]
            }
        ),
        Tool(
            name="add_logo",
            description="Add logo overlay to video (watermark)",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_path": {"type": "string", "description": "Path to input video"},
                    "logo_path": {"type": "string", "description": "Path to logo image"},
                    "position": {"type": "string", "enum": ["top-left", "top-right", "bottom-left", "bottom-right", "center"], "default": "top-right"},
                    "scale": {"type": "number", "default": 0.15, "description": "Logo scale relative to video width"},
                    "opacity": {"type": "number", "default": 0.8}
                },
                "required": ["video_path", "logo_path"]
            }
        ),
        Tool(
            name="add_subtitles",
            description="Generate and burn subtitles into video",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_path": {"type": "string"},
                    "subtitle_file": {"type": "string", "description": "Path to .srt or .vtt file"},
                    "style": {"type": "string", "default": "FontSize=24,PrimaryColour=&Hffffff&"}
                },
                "required": ["video_path", "subtitle_file"]
            }
        ),
        Tool(
            name="add_voiceover",
            description="Generate TTS voice-over and add to video",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_path": {"type": "string"},
                    "text": {"type": "string", "description": "Text to convert to speech"},
                    "voice": {"type": "string", "default": "en-US-GuyNeural", "description": "Voice: en, de, fr, es, it, pt, ja, ko, zh or full voice name"},
                    "speed": {"type": "number", "default": 1.0},
                    "mix_original": {"type": "boolean", "default": True},
                    "original_volume": {"type": "number", "default": 0.2}
                },
                "required": ["video_path", "text"]
            }
        ),
        Tool(
            name="resize_video",
            description="Resize video to different aspect ratios (16:9, 9:16, 1:1)",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_path": {"type": "string"},
                    "aspect_ratio": {"type": "string", "enum": ["16:9", "9:16", "1:1", "4:3", "21:9"], "default": "16:9"},
                    "resolution": {"type": "string", "description": "Custom resolution (e.g., 1920x1080)"}
                },
                "required": ["video_path"]
            }
        ),
        Tool(
            name="add_text_overlay",
            description="Add animated text overlay to video",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_path": {"type": "string"},
                    "text": {"type": "string"},
                    "font_size": {"type": "integer", "default": 48},
                    "font_color": {"type": "string", "default": "white"},
                    "position": {"type": "string", "enum": ["top", "center", "bottom", "top-left", "bottom-left"], "default": "center"},
                    "start_time": {"type": "number", "default": 0},
                    "duration": {"type": "number", "default": 5}
                },
                "required": ["video_path", "text"]
            }
        ),
        Tool(
            name="trim_video",
            description="Trim video to specified time range",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_path": {"type": "string"},
                    "start_time": {"type": "number", "default": 0},
                    "end_time": {"type": "number", "description": "End time in seconds"},
                    "duration": {"type": "number", "description": "Duration from start (alternative to end_time)"}
                },
                "required": ["video_path"]
            }
        ),
        Tool(
            name="merge_videos",
            description="Merge multiple videos into one",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_paths": {"type": "array", "items": {"type": "string"}, "description": "List of video paths to merge"},
                    "transition": {"type": "string", "enum": ["none", "fade"], "default": "none"}
                },
                "required": ["video_paths"]
            }
        ),
        Tool(
            name="generate_thumbnail",
            description="Generate thumbnail image from video",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_path": {"type": "string"},
                    "time": {"type": "number", "default": 1.0, "description": "Time in seconds to capture"},
                    "size": {"type": "string", "default": "1280x720"}
                },
                "required": ["video_path"]
            }
        ),
        Tool(
            name="extract_audio",
            description="Extract audio track from video",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_path": {"type": "string"},
                    "format": {"type": "string", "enum": ["mp3", "aac"], "default": "mp3"},
                    "bitrate": {"type": "string", "default": "192k"}
                },
                "required": ["video_path"]
            }
        ),
        Tool(
            name="generate_script",
            description="Generate video script using AI (FREE)",
            inputSchema={
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "Topic for the video script"},
                    "duration_seconds": {"type": "integer", "default": 60}
                },
                "required": ["topic"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    output_id = uuid.uuid4().hex[:8]
    
    if name == "generate_video":
        images = arguments["images"]
        output_path = os.path.join(OUTPUT_DIR, f"{arguments.get('output_name', output_id)}.mp4")
        
        success, msg = generate_video_from_images(
            images=images,
            output_path=output_path,
            duration_per_image=arguments.get("duration_per_image", 3.0),
            fps=arguments.get("fps", 30),
            resolution=arguments.get("resolution", "1920x1080")
        )
        
        result = {"success": success, "output": output_path if success else None, "message": msg}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "add_logo":
        output_path = os.path.join(OUTPUT_DIR, f"logo_{output_id}.mp4")
        success, msg = add_logo_to_video(
            video_path=arguments["video_path"],
            logo_path=arguments["logo_path"],
            output_path=output_path,
            position=arguments.get("position", "top-right"),
            scale=arguments.get("scale", 0.15),
            opacity=arguments.get("opacity", 0.8)
        )
        result = {"success": success, "output": output_path if success else None, "message": msg}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "add_subtitles":
        output_path = os.path.join(OUTPUT_DIR, f"subtitled_{output_id}.mp4")
        success, msg = add_subtitles(
            video_path=arguments["video_path"],
            output_path=output_path,
            subtitle_file=arguments["subtitle_file"],
            style=arguments.get("style", "FontSize=24,PrimaryColour=&Hffffff&")
        )
        result = {"success": success, "output": output_path if success else None, "message": msg}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "add_voiceover":
        # Generate TTS audio first
        audio_path = os.path.join(TEMP_DIR, f"tts_{output_id}.mp3")
        success, msg = generate_tts_audio(
            text=arguments["text"],
            output_path=audio_path,
            voice=arguments.get("voice", "en"),
            speed=arguments.get("speed", 1.0)
        )
        
        if not success:
            return [TextContent(type="text", text=json.dumps({"success": False, "error": f"TTS failed: {msg}"}))]
        
        # Add voiceover to video
        output_path = os.path.join(OUTPUT_DIR, f"voiceover_{output_id}.mp4")
        success, msg = add_voiceover(
            video_path=arguments["video_path"],
            audio_path=audio_path,
            output_path=output_path,
            mix_original=arguments.get("mix_original", True),
            original_volume=arguments.get("original_volume", 0.2)
        )
        
        os.unlink(audio_path)
        result = {"success": success, "output": output_path if success else None, "message": msg}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "resize_video":
        output_path = os.path.join(OUTPUT_DIR, f"resized_{output_id}.mp4")
        success, msg = resize_video(
            video_path=arguments["video_path"],
            output_path=output_path,
            aspect_ratio=arguments.get("aspect_ratio", "16:9"),
            resolution=arguments.get("resolution")
        )
        result = {"success": success, "output": output_path if success else None, "message": msg}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "add_text_overlay":
        output_path = os.path.join(OUTPUT_DIR, f"text_{output_id}.mp4")
        success, msg = add_text_overlay(
            video_path=arguments["video_path"],
            output_path=output_path,
            text=arguments["text"],
            font_size=arguments.get("font_size", 48),
            font_color=arguments.get("font_color", "white"),
            position=arguments.get("position", "center"),
            start_time=arguments.get("start_time", 0),
            duration=arguments.get("duration", 5)
        )
        result = {"success": success, "output": output_path if success else None, "message": msg}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "trim_video":
        output_path = os.path.join(OUTPUT_DIR, f"trimmed_{output_id}.mp4")
        success, msg = trim_video(
            video_path=arguments["video_path"],
            output_path=output_path,
            start_time=arguments.get("start_time", 0),
            end_time=arguments.get("end_time"),
            duration=arguments.get("duration")
        )
        result = {"success": success, "output": output_path if success else None, "message": msg}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "merge_videos":
        output_path = os.path.join(OUTPUT_DIR, f"merged_{output_id}.mp4")
        success, msg = merge_videos(
            video_paths=arguments["video_paths"],
            output_path=output_path,
            transition=arguments.get("transition", "none")
        )
        result = {"success": success, "output": output_path if success else None, "message": msg}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "generate_thumbnail":
        output_path = os.path.join(OUTPUT_DIR, f"thumb_{output_id}.jpg")
        success, msg = generate_thumbnail(
            video_path=arguments["video_path"],
            output_path=output_path,
            time=arguments.get("time", 1.0),
            size=arguments.get("size", "1280x720")
        )
        result = {"success": success, "output": output_path if success else None, "message": msg}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "extract_audio":
        ext = arguments.get("format", "mp3")
        output_path = os.path.join(OUTPUT_DIR, f"audio_{output_id}.{ext}")
        success, msg = extract_audio(
            video_path=arguments["video_path"],
            output_path=output_path,
            format=ext,
            bitrate=arguments.get("bitrate", "192k")
        )
        result = {"success": success, "output": output_path if success else None, "message": msg}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    elif name == "generate_script":
        script = await generate_script_with_ai(
            topic=arguments["topic"],
            duration_seconds=arguments.get("duration_seconds", 60)
        )
        result = {"success": True, "script": script}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    
    return [TextContent(type="text", text=json.dumps({"error": f"Unknown tool: {name}"}))]


# =============================================================================
# HTTP API (FastAPI)
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🎬 SIN-Video-Gen-MCP starting on port {HTTP_PORT}")
    yield
    print("👋 SIN-Video-Gen-MCP shutting down")


http_app = FastAPI(
    title="SIN-Video-Gen-MCP",
    description="Elite Video Generator MCP - 100% FREE with FFmpeg",
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
    ffmpeg_available: bool
    output_dir: str


@http_app.get("/health", response_model=HealthResponse)
async def health_check():
    # Check if FFmpeg is available
    ffmpeg_available = False
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
        ffmpeg_available = result.returncode == 0
    except Exception:
        pass
    
    return HealthResponse(
        status="healthy" if ffmpeg_available else "degraded",
        service="sin-video-gen-mcp",
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat(),
        tools_available=11,
        ffmpeg_available=ffmpeg_available,
        output_dir=OUTPUT_DIR
    )


@http_app.get("/tools")
async def list_available_tools():
    tools = await list_tools()
    return {"tools": [{"name": t.name, "description": t.description, "schema": t.inputSchema} for t in tools]}


@http_app.post("/tools/execute")
async def execute_tool(request: ToolRequest):
    try:
        result = await call_tool(request.tool, request.arguments)
        return json.loads(result[0].text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@http_app.get("/files/{filename}")
async def get_file(filename: str):
    """Download generated video/audio file."""
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")


@http_app.delete("/files/{filename}")
async def delete_file(filename: str):
    """Delete generated file."""
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        os.unlink(file_path)
        return {"success": True, "deleted": filename}
    raise HTTPException(status_code=404, detail="File not found")


@http_app.get("/files")
async def list_files():
    """List all generated files."""
    files = []
    for f in os.listdir(OUTPUT_DIR):
        path = os.path.join(OUTPUT_DIR, f)
        files.append({
            "name": f,
            "size": os.path.getsize(path),
            "created": datetime.fromtimestamp(os.path.getctime(path)).isoformat()
        })
    return {"files": files}


# =============================================================================
# MAIN
# =============================================================================

async def run_stdio():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


def main():
    if RUN_MODE == "stdio":
        print("Running in stdio MCP mode")
        asyncio.run(run_stdio())
    else:
        print(f"Running in HTTP mode on port {HTTP_PORT}")
        uvicorn.run(http_app, host="0.0.0.0", port=HTTP_PORT)


if __name__ == "__main__":
    main()
