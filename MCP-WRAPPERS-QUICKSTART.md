# MCP Wrappers - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Verify All Wrappers Are Installed
```bash
ls -la /Users/jeremy/dev/SIN-Solver/mcp-wrappers/*-wrapper.js
# Should show 6 files:
# - captcha-mcp-wrapper.js
# - plane-mcp-wrapper.js
# - scira-mcp-wrapper.js
# - sin-deep-research-mcp-wrapper.js
# - sin-social-mcp-wrapper.js
# - sin-video-gen-mcp-wrapper.js
```

### Step 2: Verify OpenCode Config
```bash
opencode config show | grep -A5 '"type": "local"'
# Should show 5-6 MCPs registered
```

### Step 3: Test First MCP (Captcha Solver)
```bash
# Test locally with localhost
CAPTCHA_API_URL=http://localhost:8019 \
opencode --model gemini-3-flash \
"Use the captcha MCP to show available tools"
```

---

## 📖 MCP Reference

### 1. **Captcha Solver** 🔐
**Purpose:** Solve text, image, audio, and slider CAPTCHAs  
**Setup:** `export CAPTCHA_API_URL=http://localhost:8019` (local)

**Available Tools:**
```
solve_text_captcha(image_base64, [solver_models])
  → Use OCR + ddddocr + Gemini consensus

solve_image_captcha(image_base64, grid_size)
  → Solve hCaptcha image grid

solve_slider_captcha(slider_image, background_image)
  → Drag-to-unlock solver

solve_audio_captcha(audio_url, audio_format)
  → Whisper speech-to-text

solve_with_browser(url, captcha_selector)
  → Live webpage CAPTCHA solving

get_solver_status()
  → Check solver health

check_rate_limits()
  → View rate limits

get_solver_stats()
  → Performance metrics
```

**Example:**
```bash
opencode --model gemini-3-flash \
"Solve this CAPTCHA using the captcha MCP: [base64_image]"
```

---

### 2. **Plane.io Project Management** 📋
**Purpose:** Integrate with Plane.io for issue tracking  
**Setup:** `export PLANE_API_KEY="your-api-key"`

**Available Tools:**
```
list_projects()
  → Get all projects

create_issue(project_id, title, description)
  → Create new issue

list_issues(project_id)
  → List project issues
```

**Example:**
```bash
opencode --model gemini-3-flash \
"Use Plane MCP to list all my projects"
```

---

### 3. **Scira AI Search** 🔍
**Purpose:** Full-text & semantic search engine  
**Setup:** `docker-compose up room-30-scira-ai-search` then use locally

**Available Tools:**
```
search(query, top_k)
  → Semantic search

search_with_filters(query, filters)
  → Advanced filtering

index_document(document, metadata)
  → Index single doc

index_batch(documents_list)
  → Batch indexing

get_document(doc_id)
  → Retrieve doc

delete_document(doc_id)
  → Remove doc

health_check()
  → Service status

get_stats()
  → Search statistics
```

**Example:**
```bash
opencode --model gemini-3-flash \
"Search for 'machine learning' using Scira MCP and show top 5 results"
```

---

### 4. **Deep Research Web Search** 🌐
**Purpose:** Web search + content extraction + summarization  
**Setup:** Uses DuckDuckGo (free, no API key needed)

**Available Tools:**
```
web_search(query, max_results)
  → DuckDuckGo search

news_search(query, max_results)
  → News search

extract_content(url)
  → Get webpage content

deep_research(query)
  → Full pipeline: search → extract → summarize

steel_browse(url, selector)
  → Browse with Steel Browser
```

**Example:**
```bash
opencode --model gemini-3-flash \
"Do a deep research on 'latest AI trends' using sin-deep-research MCP"
```

---

### 5. **Social Media Integration** 📱
**Purpose:** Analyze videos, post to social media, schedule content  
**Setup:** Optional, works with external social APIs

**Available Tools:**
```
analyze_video(video_url_or_file)
  → AI video content analysis

post_to_clawdbot(content, platforms)
  → Cross-platform posting

analyze_and_post(video, platforms)
  → Analyze + generate post + publish

schedule_post(content, publish_time)
  → Schedule for later

get_post_status(post_id)
  → Check performance
```

**Example:**
```bash
opencode --model gemini-3-flash \
"Analyze this video and generate a social media post using sin-social MCP"
```

---

### 6. **Video Generation** 🎬
**Purpose:** Create videos, add effects, generate voiceovers  
**Setup:** Uses FFmpeg + edge-tts (free, local)

**Available Tools:**
```
generate_video(images, frame_rate)
  → Create video from images

add_logo(video_path, logo_path, position)
  → Overlay logo

add_subtitles(video_path, subtitle_file)
  → Burn subtitles

add_voiceover(video_path, text, language)
  → Microsoft edge-tts voiceover

resize_video(video_path, aspect_ratio)
  → Multiple formats (16:9, 9:16, 1:1)

add_text_overlay(video_path, text, position)
  → Animated text

merge_videos(videos_list)
  → Combine clips

generate_thumbnail(video_path, timestamp)
  → Create thumbnail
```

**Example:**
```bash
opencode --model gemini-3-flash \
"Create a 30-second video from these images using sin-video-gen MCP"
```

---

## 🔧 Troubleshooting

### Issue: "MCP not found"
```bash
# Solution: Verify OpenCode config
cat ~/.config/opencode/opencode.json | grep "captcha\|plane\|sin-"

# If missing, add to opencode.json and restart OpenCode
```

### Issue: "Connection refused"
```bash
# Check if Docker container is running
docker ps | grep builder-1.1-captcha-worker

# If not running, start it:
docker-compose up -d builder-1.1-captcha-worker
```

### Issue: "API timeout"
```bash
# Check if API is responding
curl http://localhost:8019/api/status

# If timeout, check Docker logs
docker logs builder-1.1-captcha-worker
```

### Issue: "Module not found: @modelcontextprotocol/sdk"
```bash
# Solution: OpenCode will auto-install on first use
# Or manually: npm install -g @modelcontextprotocol/sdk axios

# Then try again:
opencode --model gemini-3-flash "Test MCP"
```

---

## 🎯 Common Use Cases

### Use Case 1: Solve CAPTCHA
```bash
opencode --model gemini-3-flash \
"I need to solve a CAPTCHA. Image: [base64]. Use captcha MCP."
```

### Use Case 2: Search & Summarize
```bash
opencode --model gemini-3-flash \
"Research 'Python async programming'. Use deep-research MCP to find articles and summarize."
```

### Use Case 3: Create Social Post from Video
```bash
opencode --model gemini-3-flash \
"Analyze this video and create a viral TikTok caption. Use sin-social MCP."
```

### Use Case 4: Generate Full Video
```bash
opencode --model gemini-3-flash \
"Create a video about 'How to use MCPs'. Generate thumbnail + subtitles. Use video-gen MCP."
```

### Use Case 5: Track Project Issues
```bash
opencode --model gemini-3-flash \
"List all open issues in my Plane project. Create a summary. Use plane MCP."
```

---

## 📊 MCP Status Dashboard

To check status of all MCPs:

```bash
# Check individual MCPs
opencode mcp list-tools captcha
opencode mcp list-tools plane
opencode mcp list-tools sin-deep-research
opencode mcp list-tools sin-social
opencode mcp list-tools sin-video-gen

# Or test with a simple query
for mcp in captcha plane sin-deep-research sin-social sin-video-gen; do
  echo "Testing $mcp..."
  opencode --model gemini-3-flash "Use the $mcp MCP to show available tools" 2>&1 | head -5
done
```

---

## 🚀 Environment Variables (Reference)

```bash
# Captcha Solver
export CAPTCHA_API_URL="http://localhost:8019"
export CAPTCHA_API_KEY="optional-api-key"

# Plane.io
export PLANE_API_URL="https://plane.delqhi.com"
export PLANE_API_KEY="your-plane-api-key"

# Scira Search
export SCIRA_API_URL="http://localhost:8230"
export SCIRA_API_KEY="optional"

# Research
export SIN_RESEARCH_API_URL="https://research.delqhi.com"
export SIN_RESEARCH_API_KEY="optional"

# Social Media
export SIN_SOCIAL_API_URL="https://social.delqhi.com"
export SIN_SOCIAL_API_KEY="optional"

# Video Generation
export SIN_VIDEO_GEN_API_URL="https://videogen.delqhi.com"
export SIN_VIDEO_GEN_API_KEY="optional"
```

---

## 📚 Full Documentation

For complete MCP wrapper documentation, see:
- **MCP-WRAPPER-VERIFICATION-2026-01-30.md** - Full technical report
- **/mcp-wrappers/README.md** - Wrapper implementation details
- **AGENTS.md** - General MCP configuration

---

**Last Updated:** 2026-01-30  
**Status:** All 6 MCPs Ready ✅  
**Maintained By:** Sisyphus Agent
