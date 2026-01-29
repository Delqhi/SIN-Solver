# MCP Configuration Documentation

**Project:** SIN-Solver  
**Date:** 2026-01-29  
**Session:** ses_3f9bc1908ffeVibfrKEY3Kybu5  
**Status:** ✅ COMPLETE  

---

## Overview

This document describes the complete MCP (Model Context Protocol) configuration for the SIN-Solver project, including all services, wrappers, and troubleshooting guides.

---

## MCP Services Status

### ✅ Active MCPs (14 total)

| MCP Name | Type | Status | Endpoint | Wrapper |
|----------|------|--------|----------|---------|
| **serena** | local | ✅ Enabled | uvx serena | Built-in |
| **tavily** | local | ✅ Enabled | npx @tavily/claude-mcp | Built-in |
| **context7** | local | ✅ Enabled | npx @anthropics/context7-mcp | Built-in |
| **skyvern** | local | ✅ Enabled | /usr/bin/python3 -m skyvern.mcp.server | Built-in |
| **linear** | remote | ✅ Enabled | https://mcp.linear.app/sse | N/A |
| **gh_grep** | remote | ✅ Enabled | https://mcp.grep.app | N/A |
| **grep_app** | remote | ✅ Enabled | https://mcp.grep.app | N/A |
| **websearch** | local | ✅ Enabled | npx @tavily/claude-mcp | Built-in |
| **plane** | local | ✅ Enabled | node plane-mcp-wrapper.js | ✅ Custom |
| **captcha** | local | ✅ Enabled | node captcha-mcp-wrapper.js | ✅ Custom |
| **sin-deep-research** | local | ✅ Enabled | node sin-deep-research-mcp-wrapper.js | ✅ NEW |
| **sin-social** | local | ✅ Enabled | node sin-social-mcp-wrapper.js | ✅ NEW |
| **sin-video-gen** | local | ✅ Enabled | node sin-video-gen-mcp-wrapper.js | ✅ NEW |
| **scira** | local | ✅ Enabled | node scira-mcp-wrapper.js | ✅ Custom |

### ⏸️ Disabled MCPs (4 total)

| MCP Name | Reason | Status |
|----------|--------|--------|
| **canva** | Not critical for operations | ⏸️ Disabled |
| **chrome-devtools** | Not critical for operations | ⏸️ Disabled |
| **vercel-labs-agent** | Missing VERCEL_TOKEN | ⏸️ Disabled |
| **singularity** | Service not available | ⏸️ Disabled |

---

## New MCP Wrappers (Added 2026-01-29)

### 1. SIN Deep Research MCP

**File:** `/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-deep-research-mcp-wrapper.js`

**Purpose:** Deep research capabilities with web search, content extraction, and AI summarization.

**Environment Variables:**
```bash
SIN_RESEARCH_API_URL=https://research.delqhi.com
SIN_RESEARCH_API_KEY=${SIN_RESEARCH_API_KEY}
```

**Tools (5 total):**

| Tool | Description |
|------|-------------|
| `web_search` | DuckDuckGo web search (FREE, no API key) |
| `news_search` | DuckDuckGo news search (FREE) |
| `extract_content` | URL content extraction with trafilatura |
| `deep_research` | Search + extract + summarize with Gemini |
| `steel_browse` | Browse with Steel Browser (handles JS) |

**Configuration:**
```json
{
  "sin-deep-research": {
    "type": "local",
    "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-deep-research-mcp-wrapper.js"],
    "enabled": true,
    "environment": {
      "SIN_RESEARCH_API_URL": "https://research.delqhi.com",
      "SIN_RESEARCH_API_KEY": "${SIN_RESEARCH_API_KEY}"
    }
  }
}
```

---

### 2. SIN Social MCP

**File:** `/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-social-mcp-wrapper.js`

**Purpose:** Social media automation with video analysis and cross-platform posting.

**Environment Variables:**
```bash
SIN_SOCIAL_API_URL=https://social.delqhi.com
SIN_SOCIAL_API_KEY=${SIN_SOCIAL_API_KEY}
```

**Tools (5 total):**

| Tool | Description |
|------|-------------|
| `analyze_video` | AI video content analysis with Gemini (FREE) |
| `post_to_clawdbot` | Cross-platform posting via ClawdBot |
| `analyze_and_post` | Analyze video + generate post + publish |
| `schedule_post` | Schedule posts for later |
| `get_post_status` | Track post performance |

**Configuration:**
```json
{
  "sin-social": {
    "type": "local",
    "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-social-mcp-wrapper.js"],
    "enabled": true,
    "environment": {
      "SIN_SOCIAL_API_URL": "https://social.delqhi.com",
      "SIN_SOCIAL_API_KEY": "${SIN_SOCIAL_API_KEY}"
    }
  }
}
```

---

### 3. SIN Video Gen MCP

**File:** `/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-video-gen-mcp-wrapper.js`

**Purpose:** Video generation and editing with FFmpeg and Edge TTS.

**Environment Variables:**
```bash
SIN_VIDEO_API_URL=https://video.delqhi.com
SIN_VIDEO_API_KEY=${SIN_VIDEO_API_KEY}
```

**Tools (11 total):**

| Tool | Description |
|------|-------------|
| `generate_video` | Create video from images with transitions (FFmpeg) |
| `add_logo` | Overlay logo/watermark on video |
| `add_subtitles` | Burn subtitles into video (ASS/SRT) |
| `add_voiceover` | TTS voice-over using Microsoft Edge TTS (FREE, 10+ languages) |
| `resize_video` | Multiple formats (16:9, 9:16, 1:1, 4:3, 21:9) |
| `add_text_overlay` | Animated text graphics on video |
| `trim_video` | Adjust video length (start/end/duration) |
| `merge_videos` | Combine multiple clips with transitions |
| `generate_thumbnail` | Create video thumbnails (auto/custom) |
| `extract_audio` | Extract audio track from video |
| `generate_script` | AI-generated video scripts (Gemini/OpenCode FREE) |

**Configuration:**
```json
{
  "sin-video-gen": {
    "type": "local",
    "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-video-gen-mcp-wrapper.js"],
    "enabled": true,
    "environment": {
      "SIN_VIDEO_API_URL": "https://video.delqhi.com",
      "SIN_VIDEO_API_KEY": "${SIN_VIDEO_API_KEY}"
    }
  }
}
```

---

## Fixed MCPs

### Skyvern (PATH Fix)

**Issue:** `python` not found in PATH  
**Solution:** Changed to absolute path `/usr/bin/python3`

**Before:**
```json
{
  "skyvern": {
    "command": ["python", "-m", "skyvern.mcp.server"]
  }
}
```

**After:**
```json
{
  "skyvern": {
    "command": ["/usr/bin/python3", "-m", "skyvern.mcp.server"]
  }
}
```

---

### Scira (Restored)

**Issue:** Accidentally removed from opencode.json  
**Solution:** Restored with correct configuration

**Configuration:**
```json
{
  "scira": {
    "type": "local",
    "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/scira-mcp-wrapper.js"],
    "enabled": true,
    "environment": {
      "SCIRA_API_URL": "https://scira.delqhi.com",
      "SCIRA_API_KEY": "${SCIRA_API_KEY}",
      "REQUEST_TIMEOUT": "30000"
    }
  }
}
```

**Note:** This incident led to the creation of **RULE -5** in AGENTS.md (anti-deletion rule).

---

## Domain Migration (localhost → delqhi.com)

All services now use production domains instead of localhost:

| Service | Before | After |
|---------|--------|-------|
| Dashboard | localhost:3000 | https://dashboard.delqhi.com |
| n8n | localhost:5678 | https://n8n.delqhi.com |
| CodeServer | localhost:8041 | https://codeserver.delqhi.com |
| Vault API | localhost:8002 | https://vault-api.delqhi.com |
| API Gateway | localhost:8080 | https://api.delqhi.com |

---

## Troubleshooting

### MCP Error -32000 (Connection Closed)

**Cause:** Service not running or wrapper crash  
**Solution:**
```bash
# Check if service is running
docker ps | grep <service-name>

# Restart service
docker-compose restart <service-name>

# Check wrapper logs
node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/<wrapper>.js
```

### SSE Error: Unable to Connect

**Cause:** Remote MCP service unavailable  
**Solution:**
- Check internet connection
- Verify service URL is accessible
- Check firewall settings

### Executable Not Found

**Cause:** Command not in PATH  
**Solution:** Use absolute path (e.g., `/usr/bin/python3` instead of `python`)

### Environment Variable Not Set

**Cause:** `${VAR_NAME}` not defined  
**Solution:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export VAR_NAME="your-value"

# Or set temporarily
VAR_NAME="value" opencode
```

---

## File Locations

### MCP Wrappers
```
/Users/jeremy/dev/SIN-Solver/mcp-wrappers/
├── plane-mcp-wrapper.js
├── captcha-mcp-wrapper.js
├── scira-mcp-wrapper.js
├── sin-deep-research-mcp-wrapper.js      [NEW]
├── sin-social-mcp-wrapper.js             [NEW]
├── sin-video-gen-mcp-wrapper.js          [NEW]
└── README.md
```

### Configuration
```
/Users/jeremy/.config/opencode/opencode.json    # Main config
/Users/jeremy/dev/SIN-Solver/AGENTS.md         # Project rules
/Users/jeremy/.config/opencode/AGENTS.md       # Global rules
```

---

## References

- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [OpenCode Documentation](https://opencode.ai/docs/)
- [SIN-Solver Container Registry](/Users/jeremy/dev/SIN-Solver/CONTAINER-REGISTRY.md)
- [Global AGENTS.md](/Users/jeremy/.config/opencode/AGENTS.md)

---

**Last Updated:** 2026-01-29  
**Maintained by:** SIN-Solver Team  
**Status:** Production Ready ✅
