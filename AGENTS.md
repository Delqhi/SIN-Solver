# 🚀 AGENTS.MD - CEO EMPIRE STATE MANDATE 2026 (V17.10)
<!-- [TIMESTAMP: 2026-01-27 01:15] [ACTION: ZIMMER-20.5 VIDEO-GEN-MCP INTEGRATION] [FILES: ~/.opencode/Agents.md, /Users/jeremy/dev/AGENTS.md, /Users/jeremy/dev/SIN-Solver/AGENTS.md] -->

**🚨 ULTRA MANDATE 0.0: IMMUTABILITY OF KNOWLEDGE (THE SUPREME LAW)**
No existing line in ANY document or configuration file (e.g., Agents.md, opencode.json, oh-my-opencode.json, BLUEPRINT.md, Guides, Reports, or any project file) may EVER be deleted or overwritten with less information. Any modification MUST be an additive enhancement. This document is a chronological fortress of our collective intelligence. Deleting, truncating, or "cleaning up" by removing information is a termination-level offense (Technical Treason). Every coder MUST verify the full integrity and totality of EVERY file before saving. Blind and dumb deletion of code or configuration (e.g., in opencode.json) is strictly prohibited.

**🚨 MANDATE 0.0a: CONTAINER REGISTRY REQUIREMENT (DOCKER WORK)**
**BEFORE** modifying ANY Docker configuration, containers, or compose files, the coder MUST first read and understand `/Users/jeremy/dev/SIN-Solver/CONTAINER-REGISTRY.md`. This registry contains:
- Master list of ALL containers with correct names
- Strict naming convention enforcement
- Public domain mappings
- Container purposes and functions
- Available number slots for new containers
**Failure to consult the registry before Docker work results in naming violations and architectural errors.**

**Status:** SUPREME GLOBAL MANDATE (Autonomous Agentic Corporation)  
**Version:** 17.10 "VIDEO-GEN MCP EMPIRE" (UPDATED 2026-01-27)  
**Architecture:** 23-ROOM DISTRIBUTED FORTRESS (STEEL + VISION + VERCEL + SURFSENSE + SUPABASE + SIN-PLUGINS + SURVEY-WORKER + CAPTCHA-WORKER + WEBSITE-WORKER + SOCIAL-MCP + DEEP-RESEARCH-MCP + VIDEO-GEN-MCP)

---

### 0.8 THE ANTI-MONOLITH & NAMING LAW (SUPREME MANDATE 2026)

**🚨 STOPP IMMEDIATELY: NO MORE MONOLITHIC DOCKER-COMPOSE FILES!**
The creation of single, massive `docker-compose.yml` files containing all services is **STRICTLY FORBIDDEN**.
Every service MUST have its own isolated directory and `docker-compose.yml`.

**🚨 NAMING CONVENTION (ABSOLUTE LAW): 4-PART STRUCTURE**
Every container MUST follow this exact naming schema:
`{CATEGORY}-{NUMBER}-{INTEGRATION}-{ROLE}`

| Part | Description | Examples |
| :--- | :--- | :--- |
| **1. CATEGORY** | The type of unit | `agent`, `room`, `solver`, `builder` |
| **2. NUMBER** | Unique ID (2 digits) | `01`, `06`, `20.5` |
| **3. INTEGRATION** | The core tech/project | `skyvern`, `n8n`, `postgres`, `video-gen` |
| **4. ROLE** | The functional role | `webagent`, `orchestrator`, `storage`, `mcp` |

**✅ CORRECT EXAMPLES:**
- `agent-06-skyvern-solver` (Agent, Nr 06, Skyvern Tech, Solver Role)
- `room-03-postgres-storage` (Room, Nr 03, Postgres Tech, Storage Role)
- `room-20.5-video-gen-mcp` (Room, Nr 20.5, Video Gen Tech, MCP Role)

**❌ FORBIDDEN EXAMPLES:**
- `skyvern` (Too short)
- `sin-zimmer-06` (Old schema)
- `agent-06-skyvern` (Missing Role)

---

## 🔒 SUPREME OPERATIONAL MANDATES

### 0. THE MODULAR SWARM SYSTEM (MANDATORY)
Jede komplexe Operation MUSS das `delegate_task` Tool im **Swarm Cluster Mode** nutzen. Ein Agent darf niemals alleine coden. Es müssen immer mindestens **5 Agenten gleichzeitig** an einer Aufgabe arbeiten (Planung, Recherche, Entwicklung, Testing, Review).

### 0.1 REALITY OVER PROTOTYPE (CRITICAL 2026)
- **NO MOCKS:** Simulationen, Mocks und Platzhalter sind STRENGSTENS VERBOTEN. Jedes Fragment muss REAL funktionieren.
- **Schlüsselfertig:** Wir liefern keine Prototypen, sondern fertige Produkte in jedem Commit.

### 0.7 THE SAFE MIGRATION & CONSOLIDATION LAW (MANDATORY)
When files are consolidated, refactored, or recreated based on existing ones, you MUST NOT simply create a new file and forget/delete the old one. You MUST NOT read, then delete, then create (as data loss is inevitable). You MUST follow this EXACT protocol:
1.  **READ TOTALITY**: Read the existing file from the first to the very last line. Speculative reading is forbidden for migration.
2.  **PRESERVE (RENAME)**: Rename the existing file with the suffix `_old` (e.g., `guide.md` -> `guide_old.md`).
3.  **CREATE & SYNTHESIZE**: Create the new file according to Blueprint rules and best practices 2026.
4.  **INTEGRATE EVERYTHING**: Move ALL information from the `_old` file into the new one. Optimize structure and formatting, but NEVER lose a single data point, command, or insight.
5.  **MULTI-VERIFY**: Perform at least 3 verification passes to ensure the new file is a complete and superior successor and NOTHING IS MISSING.
6.  **CLEANUP**: ONLY delete the `_old` file once the successor is verified as complete and the mission is confirmed as successful.

---

## 🏘️ THE 23-ROOM EMPIRE (MODULAR V18.3 STRUCTURE)

**🚨 ARCHITECTURE UPDATE 2026-01-27:**
The monolithic `docker-compose.yml` has been abolished.
The infrastructure is now split into modular directories under `/Docker/`:
- `/Docker/infrastructure/` (Core: Postgres, Redis, Vault, Supabase, NocoDB)
- `/Docker/agents/` (AI Workers: Zero, Steel, Skyvern, n8n)
- `/Docker/rooms/` (Interfaces: Dashboard, Chat)
- `/Docker/solvers/` (Task Workers: Captcha, Survey)
- `/Docker/builders/` (Content: Website)

### Official Container Mapping (V18.3 Compliant)

| Directory | Service Name | Port | Role |
| :--- | :--- | :--- | :--- |
| **AGENTS** | | | |
| `agents/agent-01-n8n` | `agent-01-n8n-orchestrator` | 5678 | Workflow Engine |
| `agents/agent-03-agentzero` | `agent-03-agentzero-coder` | 8050 | AI Coder |
| `agents/agent-05-steel` | `agent-05-steel-browser` | 3005 | Stealth Browser |
| `agents/agent-06-skyvern` | `agent-06-skyvern-solver` | 8030 | Visual Solver |
| **INFRASTRUCTURE** | | | |
| `rooms/room-03-postgres` | `room-03-postgres-master` | 5432 | Primary DB |
| `rooms/room-04-redis` | `room-04-redis-cache` | 6379 | System Cache |
| `rooms/room-16-supabase` | `room-16-supabase-studio` | 54323 | DB Backend UI |
| `rooms/room-21-nocodb` | `room-21-nocodb-ui` | 8090 | No-Code DB UI |
| **ROOMS** | | | |
| `rooms/room-01-dashboard` | `room-01-dashboard-cockpit` | 3011 | Central Dashboard |
| `rooms/room-09-chat` | `room-09.1-rocketchat-app` | 3009 | Chat Server |
| `rooms/room-09-chat` | `room-09.5-chat-mcp-server` | - | AI Chat Bridge |

**Naming Convention:** `{CATEGORY}-{NUMBER}-{INTEGRATION}-{ROLE}`
Example: `agent-06-skyvern-solver`

---

### 📊 Zimmer-20.5: SIN-Video-Gen-MCP (NEW 2026-01-27)
| Component | Description |
| :--- | :--- |
| **generate_video** | Create video from images with transitions (FFmpeg) |
| **add_logo** | Overlay logo/watermark on video |
| **add_subtitles** | Burn subtitles into video (ASS/SRT) |
| **add_voiceover** | TTS voice-over using Microsoft Edge TTS (FREE, 10+ languages) |
| **resize_video** | Multiple formats (16:9, 9:16, 1:1, 4:3, 21:9) |
| **add_text_overlay** | Animated text graphics on video |
| **trim_video** | Adjust video length (start/end/duration) |
| **merge_videos** | Combine multiple clips with transitions |
| **generate_thumbnail** | Create video thumbnails (auto/custom) |
| **extract_audio** | Extract audio track from video |
| **generate_script** | AI-generated video scripts (Gemini/OpenCode FREE) |
| **ALL FREE** | 100% self-hosted, FFmpeg + edge-tts, no paid services |

### 📊 Zimmer-20.4: SIN-Deep-Research-MCP (NEW 2026-01-27)
| Component | Description |
| :--- | :--- |
| **web_search** | DuckDuckGo web search (FREE, no API key) |
| **news_search** | DuckDuckGo news search (FREE) |
| **extract_content** | URL content extraction with trafilatura |
| **deep_research** | Search + extract + summarize with Gemini (FREE) |
| **steel_browse** | Browse with Steel Browser (handles JS) |
| **ALL FREE** | 100% self-hosted, no paid services |

### 📊 Zimmer-20.3: SIN-Social-MCP (NEW 2026-01-27)
| Component | Description |
| :--- | :--- |
| **Platforms** | Discord, Telegram, Twitter/X, Reddit |
| **Discord Bot** | Slash commands, channel management, webhooks |
| **Telegram Bot** | Message sending, updates, notifications |
| **Social Automation** | Cross-platform posting, monitoring |
| **ALL FREE** | 100% self-hosted, no paid services |

### 📊 Zimmer-20: Website Worker (NEW 2026-01-27)
| Component | Description |
| :--- | :--- |
| **Platforms** | Swagbucks, Prolific, Toluna, Clickworker |
| **Browser** | Steel Browser (Stealth Mode) via CDP |
| **Task Queue** | Redis-backed async task processing |
| **Notifications** | Clawdbot integration for alerts |
| **Captcha** | Zimmer-19 Captcha Worker integration |
| **ALL FREE** | 100% self-hosted, no paid services |

### 📊 Zimmer-19: Captcha Worker (NEW 2026-01-27)
| Component | Description |
| :--- | :--- |
| **OCR Solver** | ddddocr for text captcha recognition |
| **Slider Solver** | ddddocr for slider captcha solving |
| **Audio Solver** | Whisper for audio captcha transcription |
| **Click Solver** | ddddocr for click target detection |
| **Image Classifier** | YOLOv8 for hCaptcha image classification |
| **ALL FREE** | 100% self-hosted, no paid services |

### 📊 Zimmer-18: Survey Worker (NEW 2026-01-27)
| Component | Description |
| :--- | :--- |
| **AI Assistant** | OpenCode Zen + FREE fallback (Mistral, Groq, HuggingFace, Gemini) |
| **Platforms** | Swagbucks, Prolific, MTurk, Clickworker, Appen, Toluna, LifePoints, YouGov |
| **Captcha** | FREE Vision AI solving (Gemini → Groq fallback) |
| **Persistence** | Cookie Manager for session persistence |
| **Proxy** | Residential proxy rotation (ban prevention) |

### 📊 Zimmer-13: API Brain Enterprise APIs (UPDATED 2026-01-27)
| Endpoint | Description |
| :--- | :--- |
| **POST /api/workflows** | Create new workflow definition |
| **GET /api/workflows** | List all workflows |
| **GET /api/workflows/{id}** | Get specific workflow |
| **PUT /api/workflows/{id}** | Update workflow |
| **DELETE /api/workflows/{id}** | Delete workflow |
| **POST /api/workflows/{id}/execute** | Execute workflow |
| **POST /api/webhooks** | Register webhook endpoint |
| **GET /api/webhooks** | List all webhooks |
| **POST /api/webhooks/deliver** | Manual webhook delivery |
| **GET /api/n8n/status** | N8N health status |
| **POST /api/n8n/execute** | Execute N8N workflow |
| **GET /api/steel/status** | Steel Browser status |
| **POST /api/steel/browse** | Browse URL with Steel |
| **POST /api/steel/screenshot** | Take screenshot |

---
## 🤖 SERENA MCP & SWARM DELEGATION
ALWAYS use Serena MCP. Das Agenten-Cluster arbeitet im permanenten Vibe-Flow.

---
*"Omniscience is not a goal; it is our technical starting point. Knowledge is immutable. Deletion is entropy. Supplement the Corpus. Deletion is Treason."*
