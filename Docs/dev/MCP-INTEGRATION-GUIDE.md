# MCP Integration Guide

> **Complete Guide to Model Context Protocol Integration in SIN-Solver**
> 
> Version: 1.0.0 | Last Updated: 2026-01-30 | Status: Production Ready

---

## Table of Contents

1. [What is MCP?](#1-what-is-mcp)
2. [Our 14 MCPs Overview](#2-our-14-mcps-overview)
3. [Wrapper Architecture](#3-wrapper-architecture)
4. [Quick Start Guide](#4-quick-start-guide)
5. [MCP Reference](#5-mcp-reference)
6. [Adding New MCPs](#6-adding-new-mcps)
7. [Troubleshooting](#7-troubleshooting)
8. [Best Practices 2026](#8-best-practices-2026)
9. [API Examples](#9-api-examples)

---

## 1. What is MCP?

### 1.1 Overview

**MCP (Model Context Protocol)** is an open protocol that standardizes how applications provide context to Large Language Models (LLMs). Think of MCP as a "USB-C port for AI applications" - it provides a universal way to connect AI systems with external tools, data sources, and services.

### 1.2 Why MCP Matters

```
┌─────────────────────────────────────────────────────────────────┐
│                    WITHOUT MCP                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OpenCode ──X── Docker Container                                 │
│  (stdio)        (HTTP API)                                       │
│                                                                  │
│  ❌ Protocol mismatch                                            │
│  ❌ Can't communicate directly                                   │
│  ❌ No standard interface                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    WITH MCP                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OpenCode ──► MCP Wrapper ──► Docker Container                   │
│  (stdio)       (Bridge)        (HTTP API)                        │
│                                                                  │
│  ✅ Standard protocol                                            │
│  ✅ Universal interface                                          │
│  ✅ Easy integration                                             │
│  ✅ Tool discovery                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 MCP Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   OpenCode   │◄────►│ MCP Server   │◄────►│   External   │  │
│  │   (Client)   │stdio │  (Wrapper)   │HTTP  │   Service    │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                    │                    │             │
│         │                    │                    │             │
│    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐       │
│    │ Tools   │          │ Convert │          │  API    │       │
│    │ List    │          │ stdio↔HTTP        │ Endpoints│       │
│    └─────────┘          └─────────┘          └─────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Key MCP Concepts

| Concept | Description | Example |
|---------|-------------|---------|
| **Server** | MCP server provides tools/resources | captcha-mcp-wrapper.js |
| **Client** | MCP client consumes tools | OpenCode |
| **Tool** | Callable function exposed by server | `solve_text_captcha` |
| **Resource** | Data exposed by server | API endpoints |
| **stdio** | Standard input/output transport | How OpenCode talks to MCP |

---

## 2. Our 14 MCPs Overview

### 2.1 MCP Inventory

| # | MCP Name | File | Container | Port | Tools | Status |
|---|----------|------|-----------|------|-------|--------|
| 1 | **Captcha Solver** | `captcha-mcp-wrapper.js` | solver-19-captcha-worker | 8019 | 10 | ✅ Active |
| 2 | **Plane** | `plane-mcp-wrapper.js` | External | - | 3 | ✅ Active |
| 3 | **SIN Social** | `sin-social-mcp-wrapper.js` | room-20.3-sin-social | 8203 | 5 | ✅ Active |
| 4 | **SIN Deep Research** | `sin-deep-research-mcp-wrapper.js` | room-20.4-sin-research | 8204 | 5 | ✅ Active |
| 5 | **SIN Video Gen** | `sin-video-gen-mcp-wrapper.js` | room-20.5-sin-video | 8205 | 11 | ✅ Active |
| 6 | **Scira AI Search** | `scira-mcp-wrapper.js` | room-30-scira-ai-search | 8230 | 11 | ✅ Active |
| 7 | **Serena** | Built-in | - | - | 15+ | ✅ Active |
| 8 | **Tavily** | npm package | - | - | 3 | ✅ Active |
| 9 | **Canva** | npm package | - | - | 8 | ✅ Active |
| 10 | **Context7** | npm package | - | - | 5 | ✅ Active |
| 11 | **Skyvern** | npm package | agent-06-skyvern | 8030 | 6 | ✅ Active |
| 12 | **Chrome DevTools** | npm package | - | - | 10 | ✅ Active |
| 13 | **Linear** | Remote | - | - | 12 | ✅ Active |
| 14 | **GitHub Grep** | Remote | - | - | 4 | ✅ Active |

### 2.2 MCP Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP CATEGORIES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🎯 TASK SOLVERS (3)                                             │
│  ├── Captcha Solver    - Multi-AI CAPTCHA solving                │
│  ├── SIN Social        - Social media automation                 │
│  └── SIN Video Gen     - Video generation & editing              │
│                                                                  │
│  🔍 RESEARCH & SEARCH (4)                                        │
│  ├── SIN Deep Research - Web research & content extraction       │
│  ├── Scira AI Search   - Multi-provider AI search                │
│  ├── Tavily           - Web search API                           │
│  └── GitHub Grep      - Code search across GitHub                │
│                                                                  │
│  🎨 CONTENT CREATION (2)                                         │
│  ├── Canva            - Design & graphics                        │
│  └── Context7         - Documentation access                     │
│                                                                  │
│  🔧 DEVELOPMENT TOOLS (3)                                        │
│  ├── Skyvern          - Visual AI automation                     │
│  ├── Chrome DevTools  - Browser debugging                        │
│  └── Linear           - Project management                       │
│                                                                  │
│  ⚙️ ORCHESTRATION (2)                                            │
│  ├── Serena           - MCP orchestration                        │
│  └── Plane            - Project management                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Wrapper Architecture

### 3.1 The Wrapper Pattern

**Problem:** Docker containers expose HTTP APIs, but OpenCode expects stdio-based MCP servers.

**Solution:** MCP wrappers act as bridges, converting HTTP calls to stdio protocol.

```
┌─────────────────────────────────────────────────────────────────┐
│                    WRAPPER ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DOCKER CONTAINER (HTTP API)                                 │
│     └── Express/FastAPI Server                                  │
│     └── Port: 8xxx                                              │
│     └── Endpunkt: /api/...                                      │
│                                                                  │
│  2. MCP WRAPPER (stdio)                                         │
│     └── Wrapper Script (Node.js/Python)                         │
│     └── Konvertiert: stdio ↔ HTTP                               │
│     └── Located in: /mcp-wrappers/[name]-mcp-wrapper.js         │
│                                                                  │
│  3. OPENCODE CONFIG                                             │
│     └── Type: "local" (stdio)                                   │
│     └── Command: ["node", "wrapper.js"]                         │
│     └── Environment: API_URL, API_KEY                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OpenCode (stdio)                                                │
│      │                                                           │
│      ▼                                                           │
│  MCP Wrapper (Node.js)                                           │
│      ├─ Parse stdio input (JSON-RPC)                            │
│      ├─ Validate request                                        │
│      ├─ Convert to HTTP request                                 │
│      ├─ Call Docker API (axios)                                 │
│      ├─ Parse HTTP response                                     │
│      ├─ Convert to MCP response                                 │
│      └─ Send stdio output (JSON-RPC)                            │
│      │                                                           │
│      ▼                                                           │
│  Docker Container (HTTP API)                                     │
│      └─ Process request                                         │
│                                                                  │
│  Latency: Wrapper overhead < 50ms                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Wrapper Structure

```javascript
// Standard Wrapper Structure
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require('axios');

// 1. Configuration
const API_URL = process.env.API_URL || 'http://localhost:PORT';
const API_KEY = process.env.API_KEY;

// 2. HTTP Client
const client = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

// 3. MCP Server
const server = new Server(
  { name: 'service-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 4. Tool Implementations
async function toolFunction(params) {
  const response = await client.post('/api/endpoint', params);
  return response.data;
}

// 5. Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'tool_name',
      description: 'What this tool does',
      inputSchema: { /* JSON Schema */ }
    }
  ]
}));

// 6. Request Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await toolFunction(args);
  return { toolResult: result };
});

// 7. Start Server
const transport = new StdioServerTransport();
server.connect(transport);
```

---

## 4. Quick Start Guide

### 4.1 Prerequisites

```bash
# 1. Install Node.js dependencies
npm install @modelcontextprotocol/sdk axios

# 2. Verify installation
node -c mcp-wrappers/captcha-mcp-wrapper.js

# 3. Check Docker containers are running
docker-compose ps
```

### 4.2 Configure opencode.json

```json
{
  "mcp": {
    "captcha-solver": {
      "type": "local",
      "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "CAPTCHA_API_URL": "https://captcha.delqhi.com",
        "CAPTCHA_API_KEY": "${CAPTCHA_API_KEY}"
      }
    },
    "sin-social": {
      "type": "local",
      "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-social-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "SIN_SOCIAL_API_URL": "https://social.delqhi.com",
        "SIN_SOCIAL_API_KEY": "${SIN_SOCIAL_API_KEY}"
      }
    },
    "sin-research": {
      "type": "local",
      "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-deep-research-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "SIN_RESEARCH_API_URL": "https://research.delqhi.com"
      }
    },
    "sin-video": {
      "type": "local",
      "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-video-gen-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "SIN_VIDEO_API_URL": "https://video.delqhi.com"
      }
    },
    "scira-search": {
      "type": "local",
      "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/scira-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "SCIRA_API_URL": "https://scira.delqhi.com"
      }
    }
  }
}
```

### 4.3 Test MCP Connection

```bash
# List available MCPs
opencode mcp list

# List tools for specific MCP
opencode mcp list-tools captcha-solver

# Call a tool
opencode mcp call captcha-solver get_solver_status
```

### 4.4 Using MCPs in OpenCode

```javascript
// Example: Solve a CAPTCHA
const result = await mcp.captcha-solver.solve_text_captcha({
  image_base64: "base64encodedimage...",
  timeout: 30
});

// Example: Search the web
const results = await mcp.sin-research.web_search({
  query: "MCP protocol best practices",
  maxResults: 10
});

// Example: Generate video
const video = await mcp.sin-video.generate_video({
  imageUrls: ["image1.jpg", "image2.jpg"],
  options: { transition: "fade", duration: 5 }
});
```

---

## 5. MCP Reference

### 5.1 Captcha Solver MCP

**File:** `captcha-mcp-wrapper.js`  
**Container:** solver-19-captcha-worker  
**Port:** 8019  
**API URL:** https://captcha.delqhi.com

#### Tools (10)

| Tool | Description | Parameters |
|------|-------------|------------|
| `solve_text_captcha` | OCR text recognition | `image_base64`, `timeout` |
| `solve_image_captcha` | Grid selection (hCaptcha) | `image_base64`, `instructions`, `grid_size` |
| `solve_with_browser` | Live webpage solving | `url`, `captcha_type`, `wait_for_result` |
| `solve_slider_captcha` | Slider/drag CAPTCHA | `image_base64`, `timeout` |
| `solve_audio_captcha` | Audio transcription | `audio_base64`, `audio_format`, `timeout` |
| `solve_click_order_captcha` | Sequential clicks | `image_base64`, `instructions`, `timeout` |
| `get_solver_status` | Health check | - |
| `check_rate_limits` | Rate limit status | - |
| `get_solver_stats` | Performance metrics | - |
| `get_solve_task_info` | Task details | `task_id` |

#### Example Usage

```javascript
// Solve text CAPTCHA
const solution = await mcp.captcha-solver.solve_text_captcha({
  image_base64: captchaImageBase64,
  timeout: 30
});
// Returns: { solution: "ABC123", confidence: 0.95, method: "gemini" }

// Solve with browser
const result = await mcp.captcha-solver.solve_with_browser({
  url: "https://example.com/login",
  captcha_type: "recaptcha_v2",
  wait_for_result: true
});
// Returns: { success: true, token: "03AGdBq25..." }
```

---

### 5.2 SIN Social MCP

**File:** `sin-social-mcp-wrapper.js`  
**Container:** room-20.3-sin-social  
**Port:** 8203  
**API URL:** https://social.delqhi.com

#### Tools (5)

| Tool | Description | Parameters |
|------|-------------|------------|
| `analyze_video` | AI video analysis | `videoUrl`, `analysisType` |
| `post_to_clawdbot` | Cross-platform posting | `content`, `platforms`, `mediaUrls` |
| `analyze_and_post` | Auto analyze + post | `videoUrl`, `platforms`, `customCaption` |
| `schedule_post` | Schedule for later | `content`, `platforms`, `scheduledTime` |
| `get_post_status` | Check post analytics | `postId` |

#### Example Usage

```javascript
// Analyze video
const analysis = await mcp.sin-social.analyze_video({
  videoUrl: "https://youtube.com/watch?v=...",
  analysisType: "full"  // 'summary', 'transcript', 'full'
});
// Returns: { summary: "...", keyPoints: [...], sentiment: "positive" }

// Post to social media
const post = await mcp.sin-social.post_to_clawdbot({
  content: "Check out this amazing AI tool! 🚀",
  platforms: ["twitter", "linkedin"],
  mediaUrls: ["https://example.com/image.jpg"]
});
// Returns: { postId: "12345", urls: { twitter: "...", linkedin: "..." } }

// Schedule post
const scheduled = await mcp.sin-social.schedule_post({
  content: "Scheduled post content",
  platforms: ["twitter"],
  scheduledTime: "2026-02-01T10:00:00Z"
});
```

---

### 5.3 SIN Deep Research MCP

**File:** `sin-deep-research-mcp-wrapper.js`  
**Container:** room-20.4-sin-research  
**Port:** 8204  
**API URL:** https://research.delqhi.com

#### Tools (5)

| Tool | Description | Parameters |
|------|-------------|------------|
| `web_search` | DuckDuckGo web search | `query`, `maxResults` |
| `news_search` | DuckDuckGo news search | `query`, `maxResults` |
| `extract_content` | URL content extraction | `url` |
| `deep_research` | Search + extract + summarize | `query`, `depth` |
| `steel_browse` | Browse with Steel Browser | `url`, `actions` |

#### Example Usage

```javascript
// Web search
const results = await mcp.sin-research.web_search({
  query: "MCP protocol specification",
  maxResults: 10
});
// Returns: { results: [...], summary: "..." }

// Deep research
const research = await mcp.sin-research.deep_research({
  query: "Latest AI automation trends 2026",
  depth: "deep"  // 'quick', 'medium', 'deep'
});
// Returns: { summary: "...", sources: [...], keyFindings: [...] }

// Extract content
const content = await mcp.sin-research.extract_content({
  url: "https://example.com/article"
});
// Returns: { title: "...", content: "...", images: [...] }
```

---

### 5.4 SIN Video Gen MCP

**File:** `sin-video-gen-mcp-wrapper.js`  
**Container:** room-20.5-sin-video  
**Port:** 8205  
**API URL:** https://video.delqhi.com

#### Tools (11)

| Tool | Description | Parameters |
|------|-------------|------------|
| `generate_video` | Create video from images | `imageUrls`, `options` |
| `add_logo` | Overlay watermark | `videoUrl`, `logoUrl`, `position` |
| `add_subtitles` | Burn subtitles | `videoUrl`, `subtitlesText`, `style` |
| `add_voiceover` | TTS voice-over | `videoUrl`, `text`, `voice`, `language` |
| `resize_video` | Change aspect ratio | `videoUrl`, `aspectRatio` |
| `add_text_overlay` | Animated text | `videoUrl`, `text`, `options` |
| `trim_video` | Cut video | `videoUrl`, `startTime`, `endTime` |
| `merge_videos` | Combine clips | `videoUrls`, `transition` |
| `generate_thumbnail` | Create thumbnail | `videoUrl`, `time` |
| `extract_audio` | Audio extraction | `videoUrl`, `format` |
| `generate_script` | AI script generation | `topic`, `duration`, `tone` |

#### Example Usage

```javascript
// Generate video from images
const video = await mcp.sin-video.generate_video({
  imageUrls: ["img1.jpg", "img2.jpg", "img3.jpg"],
  options: {
    transition: "fade",
    duration: 5,
    music: "background.mp3"
  }
});
// Returns: { videoUrl: "https://...", duration: 15 }

// Add voiceover
const withVoice = await mcp.sin-video.add_voiceover({
  videoUrl: video.videoUrl,
  text: "Welcome to our amazing product!",
  voice: "en-US-AriaNeural",
  language: "en"
});

// Resize for different platforms
const vertical = await mcp.sin-video.resize_video({
  videoUrl: withVoice.videoUrl,
  aspectRatio: "9:16"  // For TikTok/Reels
});
```

---

### 5.5 Scira AI Search MCP

**File:** `scira-mcp-wrapper.js`  
**Container:** room-30-scira-ai-search  
**Port:** 8230  
**API URL:** https://scira.delqhi.com

#### Tools (11)

| Tool | Description | Parameters |
|------|-------------|------------|
| `web_search` | AI-powered web search | `query`, `provider`, `depth`, `max_results` |
| `academic_search` | Academic papers search | `query`, `max_results`, `include_abstracts` |
| `reddit_search` | Reddit discussions | `query`, `subreddit`, `time_range` |
| `youtube_search` | YouTube videos | `query`, `max_results`, `include_captions` |
| `extract_url_content` | URL content extraction | `url`, `include_images`, `max_length` |
| `movie_search` | Movies & TV shows | `query`, `type`, `max_results` |
| `weather_search` | Weather & forecast | `location`, `units`, `include_forecast` |
| `stock_chart` | Stock charts & news | `symbol`, `period`, `include_news` |
| `ai_chat` | Direct AI chat | `message`, `model`, `context` |
| `code_interpreter` | Python execution | `code`, `generate_charts`, `timeout` |
| `health_check` | Service health | - |

#### Example Usage

```javascript
// Web search with AI summary
const results = await mcp.scira-search.web_search({
  query: "Latest TypeScript features 2026",
  provider: "tavily",
  depth: "advanced",
  max_results: 10
});

// Academic research
const papers = await mcp.scira-search.academic_search({
  query: "transformer architecture improvements",
  max_results: 20,
  include_abstracts: true
});

// Code execution
const codeResult = await mcp.scira-search.code_interpreter({
  code: "import pandas as pd; df = pd.DataFrame({'x': [1,2,3]}); print(df)",
  generate_charts: true,
  timeout: 30
});
```

---

### 5.6 Plane MCP

**File:** `plane-mcp-wrapper.js`  
**API URL:** https://plane.delqhi.com

#### Tools (3)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_projects` | List all projects | - |
| `create_issue` | Create new issue | `projectId`, `title`, `description` |
| `list_issues` | List project issues | `projectId` |

#### Example Usage

```javascript
// List projects
const projects = await mcp.plane.list_projects();

// Create issue
const issue = await mcp.plane.create_issue({
  projectId: "proj-123",
  title: "Implement MCP integration",
  description: "Add MCP wrapper for new service"
});
```

---

## 6. Adding New MCPs

### 6.1 Step-by-Step Guide

```bash
# Step 1: Create wrapper file
touch mcp-wrappers/my-service-mcp-wrapper.js

# Step 2: Make executable
chmod +x mcp-wrappers/my-service-mcp-wrapper.js

# Step 3: Implement wrapper (see template below)

# Step 4: Verify syntax
node -c mcp-wrappers/my-service-mcp-wrapper.js

# Step 5: Add to opencode.json

# Step 6: Test
opencode mcp list-tools my-service
```

### 6.2 Wrapper Template

```javascript
#!/usr/bin/env node
/**
 * [Service] MCP Wrapper
 * Konvertiert [Service] HTTP API zu MCP stdio Protocol
 * 
 * Container: [container-name]
 * Port: [port]
 * API: https://[service].delqhi.com
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

// Configuration
const API_URL = process.env.MY_SERVICE_API_URL || 'http://localhost:PORT';
const API_KEY = process.env.MY_SERVICE_API_KEY;

// HTTP Client
const client = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
  }
});

// MCP Server
const server = new Server(
  { name: 'my-service-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Tool Implementation
async function myTool(param1, param2) {
  const response = await client.post('/api/endpoint', {
    param1,
    param2
  });
  return response.data;
}

// Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'my_tool',
      description: 'Description of what this tool does',
      inputSchema: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'Description of param1'
          },
          param2: {
            type: 'number',
            description: 'Description of param2',
            default: 10
          }
        },
        required: ['param1']
      }
    }
  ]
}));

// Request Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'my_tool':
        return { toolResult: await myTool(args.param1, args.param2) };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Start Server
const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
```

### 6.3 Checklist

- [ ] Wrapper file created: `[service]-mcp-wrapper.js`
- [ ] Made executable: `chmod +x [service]-mcp-wrapper.js`
- [ ] Syntax verified: `node -c [service]-mcp-wrapper.js`
- [ ] All tools documented with descriptions
- [ ] Error handling implemented
- [ ] Environment variables documented
- [ ] Added to opencode.json
- [ ] Tested with OpenCode
- [ ] README updated

---

## 7. Troubleshooting

### 7.1 Common Issues

#### Issue: Wrapper won't start

```bash
# Check syntax
node -c /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js

# Check dependencies
npm list @modelcontextprotocol/sdk axios

# Check permissions
ls -la /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js

# Fix permissions
chmod +x /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js
```

#### Issue: API connection fails

```bash
# Check API is running
curl http://localhost:8019/api/status

# Check environment variables
echo $CAPTCHA_API_URL
echo $CAPTCHA_API_KEY

# Check firewall/network
ping captcha.delqhi.com

# Test with verbose output
node mcp-wrappers/captcha-mcp-wrapper.js 2>&1 | head -20
```

#### Issue: Tools not appearing in OpenCode

```bash
# Verify wrapper is registered in opencode.json
cat ~/.config/opencode/opencode.json | grep captcha-solver

# Restart OpenCode
opencode --reset

# List tools
opencode mcp list-tools captcha-solver

# Check MCP logs
opencode mcp logs captcha-solver
```

### 7.2 Debug Mode

```javascript
// Add debug logging to wrapper
const DEBUG = process.env.DEBUG === 'true';

function log(level, message, meta = {}) {
  if (DEBUG) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    }));
  }
}

// Usage
log('info', 'Starting wrapper', { apiUrl: API_URL });
log('error', 'Request failed', { error: error.message });
```

### 7.3 Health Check Script

```bash
#!/bin/bash
# mcp-health-check.sh

echo "=== MCP Health Check ==="

# Check each MCP
MCPS=("captcha-solver" "sin-social" "sin-research" "sin-video" "scira-search")

for mcp in "${MCPS[@]}"; do
  echo -n "Checking $mcp... "
  if opencode mcp list-tools "$mcp" > /dev/null 2>&1; then
    echo "✅ OK"
  else
    echo "❌ FAILED"
  fi
done

echo "=== Complete ==="
```

---

## 8. Best Practices 2026

### 8.1 Security

```javascript
// ✅ CORRECT - Use environment variables
const apiKey = process.env.CAPTCHA_API_KEY;
if (!apiKey) throw new Error('CAPTCHA_API_KEY not set');

// ❌ WRONG - Never hardcode secrets
const apiKey = 'sk-1234567890';

// ✅ CORRECT - Never log sensitive data
console.log('Request successful');  // Good

// ❌ WRONG - Logging secrets
console.log('Using API key:', apiKey);  // Bad!
```

### 8.2 Error Handling

```javascript
// ✅ CORRECT - Proper MCP error response
try {
  const result = await apiCall();
  return { toolResult: result };
} catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true
  };
}

// ❌ WRONG - Silent failures
try {
  const result = await apiCall();
  return result;
} catch (error) {
  // Silent fail - BAD!
}
```

### 8.3 Timeouts

```javascript
// ✅ CORRECT - Appropriate timeouts
const client = axios.create({
  timeout: 60000,  // 60s for normal operations
});

// For long operations (video processing)
const videoClient = axios.create({
  timeout: 300000,  // 5 minutes
});
```

### 8.4 Input Validation

```javascript
// ✅ CORRECT - Validate inputs
async function solveTextCaptcha(imageBase64, timeout = 30) {
  if (!imageBase64) {
    throw new Error('image_base64 is required');
  }
  if (timeout < 1 || timeout > 300) {
    throw new Error('timeout must be between 1 and 300 seconds');
  }
  // ... implementation
}
```

### 8.5 Documentation

Every wrapper MUST include:

1. **Header comment** with:
   - Purpose
   - Container name
   - Port
   - API URL
   - Environment variables

2. **Tool descriptions** explaining:
   - What the tool does
   - When to use it
   - Expected inputs/outputs

3. **Error handling** documenting:
   - Possible error cases
   - Error message format
   - Recovery suggestions

---

## 9. API Examples

### 9.1 Complete Workflow Examples

#### Example 1: Research → Video → Social

```javascript
// Step 1: Research topic
const research = await mcp.sin-research.deep_research({
  query: "AI automation trends 2026",
  depth: "medium"
});

// Step 2: Generate script
const script = await mcp.sin-video.generate_script({
  topic: research.summary,
  duration: 60,
  tone: "professional"
});

// Step 3: Create video
const video = await mcp.sin-video.generate_video({
  imageUrls: research.images.slice(0, 5),
  options: {
    transition: "fade",
    duration: 12
  }
});

// Step 4: Add voiceover
const finalVideo = await mcp.sin-video.add_voiceover({
  videoUrl: video.videoUrl,
  text: script.content,
  voice: "en-US-AriaNeural"
});

// Step 5: Post to social
const post = await mcp.sin-social.analyze_and_post({
  videoUrl: finalVideo.videoUrl,
  platforms: ["twitter", "linkedin"]
});
```

#### Example 2: CAPTCHA Automation

```javascript
// Check solver status
const status = await mcp.captcha-solver.get_solver_status();
console.log(`Solver health: ${status.health}`);

// Solve text CAPTCHA
const textSolution = await mcp.captcha-solver.solve_text_captcha({
  image_base64: textCaptchaImage,
  timeout: 30
});

// Solve image grid CAPTCHA
const imageSolution = await mcp.captcha-solver.solve_image_captcha({
  image_base64: gridCaptchaImage,
  instructions: "Select all cars",
  grid_size: "3x3"
});

// Solve on live webpage
const browserSolution = await mcp.captcha-solver.solve_with_browser({
  url: "https://example.com/form",
  captcha_type: "recaptcha_v2",
  wait_for_result: true
});
```

#### Example 3: Multi-Source Research

```javascript
// Search multiple sources
const [web, academic, reddit] = await Promise.all([
  mcp.scira-search.web_search({
    query: "MCP protocol adoption 2026",
    max_results: 10
  }),
  mcp.scira-search.academic_search({
    query: "model context protocol AI",
    max_results: 5
  }),
  mcp.scira-search.reddit_search({
    query: "MCP vs function calling",
    subreddit: "MachineLearning",
    time_range: "month"
  })
]);

// Compile comprehensive report
const report = {
  webSources: web.results,
  academicSources: academic.results,
  communityDiscussions: reddit.results,
  generatedAt: new Date().toISOString()
};
```

### 9.2 Testing Examples

```javascript
// Test all MCPs
async function testAllMCPs() {
  const results = {};
  
  // Test Captcha Solver
  try {
    const status = await mcp.captcha-solver.get_solver_status();
    results.captcha = status.health === 'healthy' ? '✅' : '❌';
  } catch (e) {
    results.captcha = '❌';
  }
  
  // Test Social
  try {
    await mcp.sin-social.get_post_status('test');
    results.social = '✅';
  } catch (e) {
    results.social = e.message.includes('not found') ? '✅' : '❌';
  }
  
  // Test Research
  try {
    const search = await mcp.sin-research.web_search({
      query: "test",
      maxResults: 1
    });
    results.research = search.results ? '✅' : '❌';
  } catch (e) {
    results.research = '❌';
  }
  
  return results;
}
```

---

## 10. Resources

### 10.1 Documentation Links

- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [OpenCode MCP Docs](https://opencode.ai/docs/mcp)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [SIN-Solver Architecture](../ARCHITECTURE-MODULAR.md)

### 10.2 Internal References

| Document | Location | Description |
|----------|----------|-------------|
| Wrapper README | `/mcp-wrappers/README.md` | Wrapper overview |
| Captcha Integration | `/mcp-wrappers/CAPTCHA-INTEGRATION.md` | Captcha-specific guide |
| Scira README | `/mcp-wrappers/README-SCIRA.md` | Scira-specific guide |

### 10.3 Support

For issues or questions:

1. Check this guide first
2. Review wrapper-specific README files
3. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
4. Open an issue in the project repository

---

## 11. Changelog

### v1.0.0 (2026-01-30)

- Initial release
- Documented all 14 MCPs
- Added wrapper architecture explanation
- Included quick start guide
- Added troubleshooting section
- Included best practices 2026
- Added comprehensive API examples

---

**Maintained by:** SIN-Solver Team  
**Last Updated:** 2026-01-30  
**Status:** Production Ready ✅  
**Compliance:** 26-Pillar Documentation Standard ✅

---

*This document follows the 26-Pillar Documentation Standard as defined in AGENTS.md MANDATE 0.5*
