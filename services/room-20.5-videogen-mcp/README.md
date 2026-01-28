# 🎬 Zimmer-20.5: SIN-Video-Gen-MCP

**Elite Video Generation MCP Server**

> 100% FREE video generation with FFmpeg + Microsoft Edge TTS

---

## 📋 Overview

| Property | Value |
|----------|-------|
| **Room** | Zimmer-20.5 |
| **Service** | SIN-Video-Gen-MCP |
| **Port** | 8205 (Container) → 8215 (Host) |
| **IP** | 172.20.0.205 |
| **Status** | ✅ Production Ready |
| **Version** | 1.0.0 |
| **License** | Delqhi Proprietary |

## 🎯 Purpose

Professional video generation MCP server providing:
- **Video Creation**: Generate videos from images with transitions
- **Audio/TTS**: Microsoft Edge TTS (10+ languages, FREE)
- **Post-Production**: Subtitles, logos, text overlays
- **Format Conversion**: All aspect ratios (16:9, 9:16, 1:1, etc.)
- **AI Scripts**: Generate video scripts with Gemini (FREE)

## 🛠️ Tools (11 Total)

| Tool | Description |
|------|-------------|
| `generate_video` | Create video from images with transitions |
| `add_logo` | Overlay logo/watermark on video |
| `add_subtitles` | Burn subtitles into video (ASS/SRT) |
| `add_voiceover` | TTS voice-over using Microsoft Edge TTS |
| `resize_video` | Multiple formats (16:9, 9:16, 1:1, 4:3, 21:9) |
| `add_text_overlay` | Animated text graphics on video |
| `trim_video` | Adjust video length (start/end/duration) |
| `merge_videos` | Combine multiple clips with transitions |
| `generate_thumbnail` | Create video thumbnails |
| `extract_audio` | Extract audio track from video |
| `generate_script` | AI-generated video scripts |

## 🚀 Quick Start

### Prerequisites
- Docker Desktop running
- Ports 8215 available on host

### Build & Run
```bash
cd /Users/jeremy/dev/SIN-Solver/services/zimmer-20.5-sin-video-gen-mcp

# Build Docker image
docker build -t sin-video-gen-mcp:latest .

# Run container
docker run -d \
  --name sin-video-gen-mcp \
  -p 8215:8205 \
  -v $(pwd)/output:/app/output \
  -e GEMINI_API_KEY=${GEMINI_API_KEY} \
  --restart unless-stopped \
  sin-video-gen-mcp:latest
```

### Verify Health
```bash
curl http://localhost:8215/health
# Expected: {"status":"healthy","service":"sin-video-gen-mcp","tools":11}
```

### List Tools
```bash
curl http://localhost:8215/tools | jq '.tools | length'
# Expected: 11
```

## 🔧 OpenCode Integration

Already configured in `~/.opencode/opencode.json`:
```json
{
  "mcp": {
    "sin_video_gen": {
      "type": "remote",
      "url": "http://localhost:8215",
      "enabled": true,
      "oauth": false
    }
  }
}
```

## 📦 Tech Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | Python 3.11-slim |
| **Video** | FFmpeg 6.x |
| **TTS** | edge-tts 6.1+ (Microsoft Neural Voices) |
| **HTTP** | aiohttp 3.9+ |
| **Video Lib** | moviepy 2.1+ |
| **AI** | Gemini API (FREE tier) |

## 🎙️ TTS Voice Support

### Languages & Voices
| Language | Voice ID | Quality |
|----------|----------|---------|
| English (US) | en-US-GuyNeural | Neural HD |
| English (UK) | en-GB-RyanNeural | Neural HD |
| German | de-DE-ConradNeural | Neural HD |
| French | fr-FR-HenriNeural | Neural HD |
| Spanish | es-ES-AlvaroNeural | Neural HD |
| Italian | it-IT-DiegoNeural | Neural HD |
| Portuguese | pt-BR-AntonioNeural | Neural HD |
| Japanese | ja-JP-KeitaNeural | Neural HD |
| Korean | ko-KR-InJoonNeural | Neural HD |
| Chinese | zh-CN-YunxiNeural | Neural HD |

### TTS Usage Example
```bash
curl -X POST http://localhost:8215/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "add_voiceover",
    "arguments": {
      "video_path": "/app/output/video.mp4",
      "text": "Welcome to our video!",
      "language": "en",
      "output_path": "/app/output/video_with_voice.mp4"
    }
  }'
```

## 🎥 Video Generation Examples

### Generate Video from Images
```bash
curl -X POST http://localhost:8215/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_video",
    "arguments": {
      "images": ["/app/input/img1.jpg", "/app/input/img2.jpg"],
      "duration_per_image": 3,
      "transition": "fade",
      "output_path": "/app/output/slideshow.mp4"
    }
  }'
```

### Add Subtitles
```bash
curl -X POST http://localhost:8215/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "add_subtitles",
    "arguments": {
      "video_path": "/app/output/video.mp4",
      "subtitle_file": "/app/input/subs.srt",
      "output_path": "/app/output/video_subtitled.mp4"
    }
  }'
```

### Resize for Social Media
```bash
curl -X POST http://localhost:8215/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "resize_video",
    "arguments": {
      "video_path": "/app/output/video.mp4",
      "aspect_ratio": "9:16",
      "output_path": "/app/output/video_vertical.mp4"
    }
  }'
```

### Generate AI Script
```bash
curl -X POST http://localhost:8215/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_script",
    "arguments": {
      "topic": "Introduction to AI automation",
      "duration_seconds": 60,
      "style": "professional"
    }
  }'
```

## 📁 Directory Structure

```
zimmer-20.5-sin-video-gen-mcp/
├── Dockerfile                 # Python 3.11 + FFmpeg
├── requirements.txt           # Python dependencies
├── README.md                  # This file
├── src/
│   └── mcp_server.py         # MCP server (890+ lines)
├── output/                    # Generated videos (mounted)
└── input/                     # Input assets (mounted)
```

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional | For AI script generation (FREE tier) |
| `OPENCODE_API_KEY` | Optional | Fallback for script generation |
| `OUTPUT_DIR` | Optional | Custom output directory (default: /app/output) |

## 🐳 Docker Commands

### Build
```bash
docker build -t sin-video-gen-mcp:latest .
```

### Run
```bash
docker run -d \
  --name sin-video-gen-mcp \
  -p 8215:8205 \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/input:/app/input \
  -e GEMINI_API_KEY=${GEMINI_API_KEY} \
  --restart unless-stopped \
  sin-video-gen-mcp:latest
```

### Logs
```bash
docker logs -f sin-video-gen-mcp
```

### Stop
```bash
docker stop sin-video-gen-mcp
docker rm sin-video-gen-mcp
```

### Save Image (Docker Sovereignty)
```bash
docker save sin-video-gen-mcp:latest | gzip > \
  /Users/jeremy/dev/SIN-Code/Docker/sin-video-gen-mcp/images/sin-video-gen-mcp-latest.tar.gz
```

## 🔄 Integration with SIN Ecosystem

### Workflow: Video Content Pipeline
```
1. sin-deep-research-mcp: Research topic
      ↓
2. sin-video-gen-mcp: Generate script
      ↓
3. sin-video-gen-mcp: Create video
      ↓
4. sin-video-gen-mcp: Add voiceover
      ↓
5. sin-video-gen-mcp: Add subtitles + logo
      ↓
6. sin-social-mcp: Analyze + post
```

### Related Services
| Service | Port | Purpose |
|---------|------|---------|
| sin-social-mcp | 8213 | Social media posting |
| sin-deep-research-mcp | 8214 | Topic research |
| ClawdBot | 8080 | Cross-platform publishing |

## 🧪 Health Check

```bash
# Quick health check
curl -s http://localhost:8215/health | jq

# Expected response:
{
  "status": "healthy",
  "service": "sin-video-gen-mcp",
  "tools": 11,
  "version": "1.0.0"
}
```

## 📊 Performance

| Operation | Typical Duration |
|-----------|------------------|
| Image → Video (10 images) | ~5s |
| Add Voiceover (60s) | ~3s |
| Add Subtitles | ~2s |
| Resize Video | ~10s |
| Generate Script | ~2s |
| Full Pipeline | ~30s |

## ⚠️ Constraints

- ❌ **NO PAID SERVICES** - Only FREE APIs (edge-tts, Gemini FREE tier)
- ❌ **NO espeak/TTS library** - Uses edge-tts (no Rust compiler needed)
- ✅ **FFmpeg required** - Included in Docker image
- ✅ **ARM64 compatible** - Works on M1/M2/M3 Macs

## 🔧 Troubleshooting

### Container won't start
```bash
# Check Docker Desktop is running
docker ps

# Rebuild image
docker build --no-cache -t sin-video-gen-mcp:latest .
```

### TTS not working
```bash
# Verify edge-tts is installed
docker exec sin-video-gen-mcp pip list | grep edge-tts

# Test TTS directly
docker exec sin-video-gen-mcp edge-tts --list-voices
```

### FFmpeg errors
```bash
# Verify FFmpeg version
docker exec sin-video-gen-mcp ffmpeg -version
```

## 📋 Changelog

### v1.0.0 (2026-01-27)
- Initial release
- 11 video generation tools
- Microsoft Edge TTS integration
- FFmpeg-based video processing
- Gemini AI script generation
- OpenCode MCP integration

---

**Room:** Zimmer-20.5  
**Status:** ✅ Production Ready  
**Last Updated:** 2026-01-27  
**Maintainer:** SIN-Solver Team  
**License:** Delqhi Proprietary
