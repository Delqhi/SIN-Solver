# SIN-Video-Gen-MCP Server Implementation

## TL;DR

> **Quick Summary**: Implement a Docker-based Video Generation MCP Server that provides 11 video processing tools via HTTP API and MCP stdio wrapper. The server uses FFmpeg for video processing and Microsoft Edge TTS for voiceovers.
> 
> **Deliverables**:
> - Docker container with FastAPI HTTP server (port 8205)
> - 11 video processing API endpoints
> - Modular docker-compose.yml following SIN-Solver architecture
> - Security hardening (URL validation, path sanitization)
> - Health checks and monitoring
> - Integration with existing MCP wrapper
> 
> **Estimated Effort**: Medium (4-6 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 4 → Task 7 → Task 9

---

## Context

### Original Request
Implement the SIN-Video-Gen-MCP Server - a Docker container that provides video generation capabilities via HTTP API for integration with the SIN-Solver platform's MCP ecosystem.

### Interview Summary
**Key Discussions**:
- Service must follow SIN-Solver's modular Docker architecture
- Must integrate with existing MCP wrapper at `/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-video-gen-mcp-wrapper.js`
- 11 tools required: generate_video, add_logo, add_subtitles, add_voiceover, resize_video, add_text_overlay, trim_video, merge_videos, generate_thumbnail, extract_audio, generate_script
- Uses FFmpeg for video processing and Edge TTS for voiceovers
- Port: 8205 (internal), exposed as video.delqhi.com via Cloudflare

**Research Findings**:
- MCP wrapper already exists and expects HTTP API at `http://localhost:8205`
- Existing service at `/Users/jeremy/dev/SIN-Solver/services/room-20.5-videogen-mcp/` (needs modularization)
- Naming convention: `room-20.5-video-gen-mcp` (following `{CATEGORY}-{NUMBER}-{INTEGRATION}-{ROLE}`)
- Similar services: room-11-plane-mcp (port 8216), solver-1.1-captcha-worker (port 8019)

### Metis Review
**Identified Gaps** (addressed):
- **Critical**: Missing modular docker-compose.yml in Docker/rooms/ structure
- **Critical**: Service duplication with builder-21-video-generator (needs resolution)
- **High**: No URL validation/security (SSRF risk)
- **High**: No resource limits or file cleanup strategy
- **Medium**: Missing health check endpoint implementation
- **Medium**: No rate limiting or concurrency control

**Guardrails Applied**:
- Max video duration: 300 seconds (5 minutes)
- Max file size: 500MB per operation
- Max concurrent jobs: 5
- Temp file TTL: 1 hour
- Output retention: 24 hours
- Supported formats: mp4, webm, mov only
- Max resolution: 1920x1080 (Full HD)

---

## Work Objectives

### Core Objective
Create a production-ready Docker container that exposes 11 video processing tools via HTTP API, integrated with the existing MCP wrapper for OpenCode compatibility.

### Concrete Deliverables
1. **FastAPI HTTP Server** (`main.py`)
   - 11 API endpoints matching MCP wrapper expectations
   - Health check endpoint at `/health`
   - Metrics endpoint at `/metrics` (optional)
   - Request validation and error handling

2. **Docker Configuration**
   - `Dockerfile` with FFmpeg, Python 3.11, edge-tts
   - `docker-compose.yml` in `Docker/rooms/room-20.5-video-gen/`
   - Volume mounts for output and temp directories
   - Environment variable configuration

3. **Security Implementation**
   - URL validation middleware (whitelist domains, block internal IPs)
   - Path sanitization (prevent traversal attacks)
   - Input validation for all endpoints
   - Non-root user execution

4. **Operational Features**
   - File cleanup job (cron or async task)
   - Structured JSON logging
   - Resource monitoring hooks
   - Graceful shutdown handling

5. **Integration Artifacts**
   - Updated CONTAINER-REGISTRY.md entry
   - Cloudflare tunnel configuration
   - Health check script
   - Basic usage documentation

### Definition of Done
- [ ] All 11 API endpoints respond correctly to MCP wrapper requests
- [ ] `curl http://localhost:8205/health` returns `{"status": "healthy"}`
- [ ] `docker compose -f Docker/rooms/room-20.5-video-gen/docker-compose.yml up -d` starts successfully
- [ ] Container appears in `docker ps` with name `room-20.5-video-gen-mcp`
- [ ] MCP wrapper can call all tools without errors
- [ ] File cleanup removes temp files older than 1 hour
- [ ] Resource limits prevent container from using >2GB RAM

### Must Have
- FastAPI server with 11 working endpoints
- Docker container with FFmpeg and edge-tts
- Modular docker-compose.yml
- URL validation and path sanitization
- Health check endpoint
- File cleanup mechanism
- Resource limits (CPU, memory)
- Integration with delqhi-platform-network

### Must NOT Have (Guardrails)
- User authentication/authorization (handled by API Brain)
- Payment processing
- Video streaming/playback (static files only)
- Real-time video processing (async only)
- Custom FFmpeg codec compilation
- Video hosting/CDN (output files only)
- Multi-tenant isolation
- Video analytics/metrics (basic logging only)
- Arbitrary FFmpeg command execution
- 4K video support (max 1080p)
- File storage beyond 24 hours

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Docker, existing services)
- **User wants tests**: Tests-after (manual verification via curl)
- **Framework**: Manual HTTP testing with curl + MCP wrapper validation

### Automated Verification (Agent-Executable)

**For API/Backend changes** (using Bash curl):

```bash
# Health check verification
curl -s http://localhost:8205/health | jq -e '.status == "healthy"'
# Assert: Exit code 0

# Tool count verification
curl -s http://localhost:8205/tools | jq '.tools | length'
# Assert: Output is "11"

# Video generation test
curl -X POST http://localhost:8205/api/generate \
  -H "Content-Type: application/json" \
  -d '{"images":["https://picsum.photos/1920/1080"],"duration":3}' \
  -w "%{http_code}"
# Assert: HTTP status 202 (Accepted)

# Container status
docker ps --format "table {{.Names}}" | grep "room-20.5-video-gen-mcp"
# Assert: Container name appears in output

# Network connectivity
docker network inspect delqhi-platform-network | grep "room-20.5-video-gen-mcp"
# Assert: Container is connected to network
```

**For MCP Wrapper validation**:

```bash
# Test MCP wrapper can list tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  timeout 5 node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-video-gen-mcp-wrapper.js 2>/dev/null | \
  jq -e '.result.tools | length == 11'
# Assert: Exit code 0
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Create directory structure and Dockerfile
├── Task 2: Implement FastAPI main.py with all 11 endpoints
└── Task 3: Create modular docker-compose.yml

Wave 2 (After Wave 1):
├── Task 4: Implement security middleware (URL validation, path sanitization)
├── Task 5: Add file cleanup and resource management
└── Task 6: Create health checks and monitoring

Wave 3 (After Wave 2):
├── Task 7: Build and test Docker container
├── Task 8: Update CONTAINER-REGISTRY.md and documentation
└── Task 9: Integration testing with MCP wrapper

Critical Path: Task 1 → Task 4 → Task 7 → Task 9
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 7 | 2, 3 |
| 2 | None | 4, 7 | 1, 3 |
| 3 | None | 7 | 1, 2 |
| 4 | 1, 2 | 7 | 5, 6 |
| 5 | 1, 2 | 7 | 4, 6 |
| 6 | 1, 2 | 7 | 4, 5 |
| 7 | 3, 4, 5, 6 | 8, 9 | None |
| 8 | 7 | 9 | None |
| 9 | 7, 8 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | delegate_task(category='quick', load_skills=['git-master'], run_in_background=true) |
| 2 | 4, 5, 6 | delegate_task(category='unspecified-high', load_skills=['git-master'], run_in_background=true) |
| 3 | 7, 8, 9 | delegate_task(category='unspecified-high', load_skills=['git-master'], run_in_background=false) |

---

## TODOs

### Task 1: Create Directory Structure and Dockerfile

**What to do**:
- Create directory: `Docker/rooms/room-20.5-video-gen/`
- Create `Dockerfile` with:
  - Base image: `python:3.11-slim`
  - Install FFmpeg, ffmpeg-python, edge-tts, fastapi, uvicorn
  - Create non-root user `appuser`
  - Set working directory `/app`
  - Copy application files
  - Expose port 8205
  - Health check command

**Must NOT do**:
- Use `latest` tag for base image (pin specific version)
- Run as root user
- Include unnecessary packages
- Hardcode secrets in Dockerfile

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`
- **Justification**: Straightforward file creation, minimal complexity

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 4, Task 7
- **Blocked By**: None

**References**:
- Pattern: `Docker/agents/agent-05-steel-browser/docker-compose.yml` (resource limits pattern)
- Pattern: `solver-1.1-captcha-worker/Dockerfile` (Python + ML tools pattern)
- Docs: `CONTAINER-REGISTRY.md` (naming convention)

**Acceptance Criteria**:
- [ ] Directory `Docker/rooms/room-20.5-video-gen/` exists
- [ ] `Dockerfile` exists and passes `docker build` validation
- [ ] Non-root user `appuser` created
- [ ] FFmpeg version >= 5.0 installed
- [ ] Python 3.11 installed

**Commit**: YES
- Message: `feat(room-20.5): add Dockerfile for video-gen-mcp`
- Files: `Docker/rooms/room-20.5-video-gen/Dockerfile`

---

### Task 2: Implement FastAPI main.py with All 11 Endpoints

**What to do**:
Create `app/main.py` with FastAPI application implementing:

1. **POST /api/generate** - Generate video from images
   - Input: `imageUrls` (array), `options` (transition, duration, music, outputFormat)
   - Output: `{job_id, status, output_url, estimated_duration}`
   - Processing: Use FFmpeg to create video from images with transitions

2. **POST /api/add-logo** - Overlay logo/watermark
   - Input: `video_url`, `logo_url`, `position`
   - Output: `{job_id, output_url}`
   - Processing: FFmpeg overlay filter

3. **POST /api/add-subtitles** - Burn subtitles into video
   - Input: `video_url`, `subtitles_text`, `style`
   - Output: `{job_id, output_url}`
   - Processing: FFmpeg subtitles filter (ASS/SRT)

4. **POST /api/add-voiceover** - Add TTS voice-over
   - Input: `video_url`, `text`, `voice`, `language`
   - Output: `{job_id, output_url}`
   - Processing: edge-tts generate audio → FFmpeg merge

5. **POST /api/resize** - Resize video to aspect ratio
   - Input: `video_url`, `aspect_ratio` (16:9, 9:16, 1:1, 4:3, 21:9)
   - Output: `{job_id, output_url}`
   - Processing: FFmpeg scale filter with padding

6. **POST /api/add-text** - Add animated text overlay
   - Input: `video_url`, `text`, `options` (position, font_size, color, animation)
   - Output: `{job_id, output_url}`
   - Processing: FFmpeg drawtext filter

7. **POST /api/trim** - Trim video
   - Input: `video_url`, `start_time`, `end_time`
   - Output: `{job_id, output_url}`
   - Processing: FFmpeg -ss and -t options

8. **POST /api/merge** - Merge multiple videos
   - Input: `video_urls` (array), `transition`
   - Output: `{job_id, output_url}`
   - Processing: FFmpeg concat demuxer

9. **POST /api/thumbnail** - Generate thumbnail
   - Input: `video_url`, `time`
   - Output: `{output_url}`
   - Processing: FFmpeg -ss + -vframes 1

10. **POST /api/extract-audio** - Extract audio track
    - Input: `video_url`, `format` (mp3, wav, aac)
    - Output: `{output_url}`
    - Processing: FFmpeg -vn -c:a

11. **POST /api/generate-script** - Generate AI video script
    - Input: `topic`, `duration`, `tone`
    - Output: `{script, scenes, suggestions}`
    - Processing: Call external AI API (Gemini/OpenCode)

Additional endpoints:
- **GET /health** - Health check
- **GET /tools** - List available tools

**Must NOT do**:
- Execute arbitrary FFmpeg commands (whitelist filters only)
- Allow file path traversal
- Store large files in memory (stream to disk)
- Block the event loop (use background tasks)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `git-master`
- **Justification**: Complex API implementation with FFmpeg integration

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 4, Task 7
- **Blocked By**: None

**References**:
- Pattern: `room-13-fastapi-coordinator/app/main.py` (FastAPI structure)
- FFmpeg docs: https://ffmpeg.org/ffmpeg-filters.html
- edge-tts docs: https://github.com/rany2/edge-tts

**Acceptance Criteria**:
- [ ] All 11 endpoints return 200/202 status codes
- [ ] Request/response schemas match MCP wrapper expectations
- [ ] `/health` endpoint returns `{"status": "healthy"}`
- [ ] `/tools` endpoint returns list of 11 tools
- [ ] Input validation returns 400 for invalid requests

**Commit**: YES
- Message: `feat(room-20.5): implement FastAPI server with 11 video tools`
- Files: `Docker/rooms/room-20.5-video-gen/app/main.py`, `app/__init__.py`

---

### Task 3: Create Modular docker-compose.yml

**What to do**:
Create `Docker/rooms/room-20.5-video-gen/docker-compose.yml`:

```yaml
version: '3.9'

services:
  room-20.5-video-gen-mcp:
    build:
      context: ../../../services/room-20.5-videogen-mcp
      dockerfile: Dockerfile
    container_name: room-20.5-video-gen-mcp
    hostname: room-20.5-video-gen-mcp
    ports:
      - "8205:8205"
    volumes:
      - video_output:/app/output
      - video_temp:/app/temp
    environment:
      - HTTP_PORT=8205
      - OUTPUT_DIR=/app/output
      - TEMP_DIR=/app/temp
      - MAX_CONCURRENT_JOBS=5
      - MAX_VIDEO_DURATION=300
      - MAX_FILE_SIZE=524288000  # 500MB
      - TEMP_FILE_TTL=3600       # 1 hour
      - OUTPUT_RETENTION=86400   # 24 hours
      - LOG_LEVEL=INFO
    networks:
      - delqhi-platform-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8205/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    restart: unless-stopped

volumes:
  video_output:
    driver: local
  video_temp:
    driver: local

networks:
  delqhi-platform-network:
    external: true
```

**Must NOT do**:
- Use hardcoded paths that won't work on all systems
- Forget resource limits
- Use `latest` tag for images
- Expose unnecessary ports

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`
- **Justification**: Configuration file creation

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 7
- **Blocked By**: None

**References**:
- Pattern: `Docker/agents/agent-05-steel-browser/docker-compose.yml`
- Pattern: `Docker/rooms/room-03-postgres-master/docker-compose.yml`
- Docs: `ARCHITECTURE-MODULAR.md`

**Acceptance Criteria**:
- [ ] `docker compose config` validates without errors
- [ ] Uses external network `delqhi-platform-network`
- [ ] Defines named volumes `video_output` and `video_temp`
- [ ] Resource limits set (2 CPU, 2GB RAM)
- [ ] Health check configured

**Commit**: YES
- Message: `feat(room-20.5): add modular docker-compose.yml`
- Files: `Docker/rooms/room-20.5-video-gen/docker-compose.yml`

---

### Task 4: Implement Security Middleware

**What to do**:
Add security middleware to FastAPI app:

1. **URL Validation Middleware**:
   - Whitelist allowed domains (configurable)
   - Block internal IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)
   - Block localhost/loopback
   - Validate URL scheme (http/https only)
   - Timeout for URL fetching (10 seconds)

2. **Path Sanitization**:
   - Normalize all paths (resolve `..`, `.`)
   - Ensure paths are within allowed directories (`/app/output`, `/app/temp`)
   - Reject paths containing `..` or absolute paths outside allowed dirs
   - Use UUID-based filenames for outputs

3. **Input Validation**:
   - Pydantic models for all endpoints
   - Max string lengths
   - Enum validation for fixed values (aspect ratios, positions, etc.)
   - File size validation before processing

4. **Rate Limiting** (optional but recommended):
   - Max 10 requests per minute per IP
   - Max 5 concurrent jobs globally

**Must NOT do**:
- Allow arbitrary URL fetching (SSRF risk)
- Permit path traversal
- Trust user input without validation
- Log sensitive data (URLs with tokens, etc.)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `git-master`
- **Justification**: Security-critical implementation

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 7
- **Blocked By**: Task 1, Task 2

**References**:
- FastAPI middleware docs: https://fastapi.tiangolo.com/tutorial/middleware/
- SSRF prevention: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

**Acceptance Criteria**:
- [ ] URLs with internal IPs return 400 error
- [ ] Path traversal attempts (`../../../etc/passwd`) are blocked
- [ ] Invalid aspect ratios return 400 error
- [ ] Requests to `http://169.254.169.254/` (metadata) are blocked

**Commit**: YES
- Message: `security(room-20.5): add URL validation and path sanitization middleware`
- Files: `app/middleware/security.py`, `app/utils/validation.py`

---

### Task 5: Add File Cleanup and Resource Management

**What to do**:
Implement file lifecycle management:

1. **Cleanup Service**:
   - Background task that runs every 10 minutes
   - Deletes temp files older than `TEMP_FILE_TTL` (1 hour)
   - Deletes output files older than `OUTPUT_RETENTION` (24 hours)
   - Does not delete files currently being processed

2. **Disk Space Monitoring**:
   - Check available space before processing
   - Reject requests if disk space < 1GB
   - Log warnings at < 5GB free space

3. **Job Queue**:
   - Use asyncio.Queue for job management
   - Max 5 concurrent jobs
   - Queue remaining jobs
   - Return job ID immediately (async processing)

4. **Process Management**:
   - Kill FFmpeg processes that exceed timeout (5 minutes)
   - Clean up temp files on job failure
   - Handle SIGTERM gracefully (finish current jobs)

**Must NOT do**:
- Delete files that are currently being processed
- Fill disk without checking
- Leave zombie processes
- Block the main thread with cleanup

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `git-master`
- **Justification**: Operational reliability features

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 7
- **Blocked By**: Task 1, Task 2

**References**:
- Python asyncio: https://docs.python.org/3/library/asyncio.html
- FFmpeg timeout handling

**Acceptance Criteria**:
- [ ] Temp files older than 1 hour are deleted
- [ ] Output files older than 24 hours are deleted
- [ ] Disk space check prevents processing when < 1GB free
- [ ] Jobs are queued when > 5 concurrent

**Commit**: YES
- Message: `feat(room-20.5): add file cleanup and resource management`
- Files: `app/services/cleanup.py`, `app/services/queue.py`, `app/utils/disk.py`

---

### Task 6: Create Health Checks and Monitoring

**What to do**:
Add observability features:

1. **Health Check Endpoint** (`/health`):
   - Returns `{"status": "healthy", "version": "1.0.0", "timestamp": "..."}`
   - Checks: Disk space, FFmpeg availability, temp dir writable
   - HTTP 200 if healthy, 503 if degraded

2. **Metrics Endpoint** (`/metrics`) - Optional:
   - Prometheus-compatible metrics
   - Job count, duration, success/failure rates
   - Disk usage, memory usage

3. **Structured Logging**:
   - JSON format for all logs
   - Include: timestamp, level, message, request_id, job_id
   - Log rotation (keep last 7 days)

4. **Error Handling**:
   - Global exception handler
   - Return structured error responses
   - Log full stack traces internally
   - Sanitize error messages (no paths, no internal details)

**Must NOT do**:
- Log sensitive information (API keys, file paths with user data)
- Expose internal error details to clients
- Block health checks with heavy operations

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `git-master`
- **Justification**: Production readiness

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2
- **Blocks**: Task 7
- **Blocked By**: Task 1, Task 2

**References**:
- Prometheus client: https://github.com/prometheus/client_python
- Python logging: https://docs.python.org/3/library/logging.html

**Acceptance Criteria**:
- [ ] `/health` returns JSON with status
- [ ] Health check fails if disk full
- [ ] Logs are in JSON format
- [ ] Error responses don't expose internal paths

**Commit**: YES
- Message: `feat(room-20.5): add health checks and monitoring`
- Files: `app/routers/health.py`, `app/utils/logging.py`, `app/middleware/error_handler.py`

---

### Task 7: Build and Test Docker Container

**What to do**:
Build and validate the Docker container:

1. **Build Container**:
   ```bash
   cd Docker/rooms/room-20.5-video-gen
   docker compose build
   ```

2. **Start Container**:
   ```bash
   docker compose up -d
   ```

3. **Verify Health**:
   ```bash
   curl http://localhost:8205/health
   ```

4. **Test Endpoints**:
   ```bash
   # List tools
   curl http://localhost:8205/tools
   
   # Test thumbnail generation (simplest endpoint)
   curl -X POST http://localhost:8205/api/thumbnail \
     -H "Content-Type: application/json" \
     -d '{"video_url": "https://example.com/video.mp4", "time": 5}'
   ```

5. **Verify Security**:
   ```bash
   # Test SSRF protection
   curl -X POST http://localhost:8205/api/thumbnail \
     -H "Content-Type: application/json" \
     -d '{"video_url": "http://169.254.169.254/latest/meta-data/", "time": 0}'
   # Should return 400
   ```

6. **Check Resource Limits**:
   ```bash
   docker stats room-20.5-video-gen-mcp
   # Verify memory stays under 2GB
   ```

**Must NOT do**:
- Skip security testing
- Ignore build warnings
- Test only happy path

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `git-master`
- **Justification**: Integration testing requires verification

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3 (Critical path)
- **Blocks**: Task 8, Task 9
- **Blocked By**: Task 3, Task 4, Task 5, Task 6

**References**:
- Docker compose: https://docs.docker.com/compose/
- Testing checklist: `CONTAINER-REGISTRY.md`

**Acceptance Criteria**:
- [ ] Container builds without errors
- [ ] Container starts and passes health check
- [ ] All 11 endpoints respond to requests
- [ ] Security tests pass (SSRF blocked, path traversal blocked)
- [ ] Resource limits are enforced
- [ ] Container appears in `docker ps`

**Commit**: YES
- Message: `test(room-20.5): verify Docker container build and functionality`
- Files: None (verification only)

---

### Task 8: Update CONTAINER-REGISTRY.md and Documentation

**What to do**:
Update documentation:

1. **Add to CONTAINER-REGISTRY.md**:
   - Add entry in Quick Reference table
   - Add full section under "MCP Services"
   - Include: configuration, environment variables, dependencies, health check

2. **Update ARCHITECTURE-MODULAR.md**:
   - Mark `room-20.5-video-gen-mcp` as completed in migration plan

3. **Create Service Documentation**:
   - Create `Docker/rooms/room-20.5-video-gen/README.md` with:
     - Service overview
     - Quick start
     - API endpoints
     - Environment variables
     - Troubleshooting

4. **Update Cloudflare Config** (if applicable):
   - Add `video.delqhi.com` → `room-20.5-video-gen-mcp:8205` mapping

**Must NOT do**:
- Leave documentation outdated
- Skip troubleshooting section
- Forget to update migration status

**Recommended Agent Profile**:
- **Category**: `writing`
- **Skills**: `git-master`
- **Justification**: Documentation writing

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3
- **Blocks**: Task 9
- **Blocked By**: Task 7

**References**:
- Pattern: `CONTAINER-REGISTRY.md` section for `room-11-plane-mcp`
- Docs style: Follow existing format exactly

**Acceptance Criteria**:
- [ ] CONTAINER-REGISTRY.md includes new service entry
- [ ] README.md exists in service directory
- [ ] All environment variables documented
- [ ] Health check command documented

**Commit**: YES
- Message: `docs(room-20.5): add service documentation and registry entry`
- Files: `CONTAINER-REGISTRY.md`, `ARCHITECTURE-MODULAR.md`, `Docker/rooms/room-20.5-video-gen/README.md`

---

### Task 9: Integration Testing with MCP Wrapper

**What to do**:
Test end-to-end with MCP wrapper:

1. **Verify Wrapper Connectivity**:
   ```bash
   # Set environment variable for local testing
   export SIN_VIDEO_API_URL=http://localhost:8205
   
   # Test wrapper directly
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
     node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-video-gen-mcp-wrapper.js
   ```

2. **Test Each Tool**:
   Test all 11 tools via MCP wrapper:
   - generate_video
   - add_logo
   - add_subtitles
   - add_voiceover
   - resize_video
   - add_text_overlay
   - trim_video
   - merge_videos
   - generate_thumbnail
   - extract_audio
   - generate_script

3. **Test Error Handling**:
   - Invalid URLs
   - Missing parameters
   - Timeout scenarios

4. **Update opencode.json** (if needed):
   Ensure MCP configuration points to correct wrapper path

**Must NOT do**:
- Skip any tool testing
- Ignore error scenarios
- Test only via HTTP (must test MCP stdio path)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `git-master`
- **Justification**: Final integration verification

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3 (Final task)
- **Blocks**: None
- **Blocked By**: Task 7, Task 8

**References**:
- MCP wrapper: `/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-video-gen-mcp-wrapper.js`
- opencode.json: `~/.config/opencode/opencode.json`

**Acceptance Criteria**:
- [ ] All 11 tools callable via MCP wrapper
- [ ] Tool responses match expected format
- [ ] Error responses are descriptive
- [ ] opencode.json configuration works

**Commit**: YES
- Message: `test(room-20.5): complete MCP integration testing`
- Files: None (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(room-20.5): add Dockerfile for video-gen-mcp` | Dockerfile | `docker build` passes |
| 2 | `feat(room-20.5): implement FastAPI server with 11 video tools` | app/main.py | curl tests pass |
| 3 | `feat(room-20.5): add modular docker-compose.yml` | docker-compose.yml | `docker compose config` passes |
| 4 | `security(room-20.5): add URL validation and path sanitization` | app/middleware/security.py | Security tests pass |
| 5 | `feat(room-20.5): add file cleanup and resource management` | app/services/cleanup.py | Cleanup verified |
| 6 | `feat(room-20.5): add health checks and monitoring` | app/routers/health.py | Health endpoint works |
| 7 | `test(room-20.5): verify Docker container build and functionality` | None | All tests pass |
| 8 | `docs(room-20.5): add service documentation and registry entry` | CONTAINER-REGISTRY.md, README.md | Documentation complete |
| 9 | `test(room-20.5): complete MCP integration testing` | None | MCP tests pass |

---

## Success Criteria

### Verification Commands

```bash
# 1. Health check
curl -s http://localhost:8205/health | jq -e '.status == "healthy"'
# Expected: Exit code 0

# 2. Tool count
curl -s http://localhost:8205/tools | jq '.tools | length'
# Expected: Output "11"

# 3. Container running
docker ps --format "table {{.Names}}" | grep "room-20.5-video-gen-mcp"
# Expected: Container name appears

# 4. Network connected
docker network inspect delqhi-platform-network | grep "room-20.5-video-gen-mcp"
# Expected: Container in network

# 5. Security - SSRF blocked
curl -s -w "%{http_code}" -X POST http://localhost:8205/api/thumbnail \
  -H "Content-Type: application/json" \
  -d '{"video_url": "http://169.254.169.254/", "time": 0}'
# Expected: HTTP 400

# 6. Security - Path traversal blocked
curl -s -w "%{http_code}" -X POST http://localhost:8205/api/thumbnail \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://example.com/video.mp4", "output_path": "../../../etc/passwd"}'
# Expected: HTTP 400

# 7. MCP wrapper test
export SIN_VIDEO_API_URL=http://localhost:8205
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  timeout 5 node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-video-gen-mcp-wrapper.js | \
  jq -e '.result.tools | length == 11'
# Expected: Exit code 0
```

### Final Checklist

- [ ] All 11 API endpoints implemented and tested
- [ ] Docker container builds and runs successfully
- [ ] Health check endpoint returns healthy status
- [ ] Security middleware blocks SSRF and path traversal
- [ ] File cleanup removes old temp/output files
- [ ] Resource limits enforced (2 CPU, 2GB RAM)
- [ ] Container registered in CONTAINER-REGISTRY.md
- [ ] MCP wrapper can call all 11 tools
- [ ] Documentation complete
- [ ] Cloudflare tunnel configured (if applicable)

---

## Guardrails Summary

### Technical Constraints
- Max video duration: 300 seconds
- Max file size: 500MB
- Max concurrent jobs: 5
- Max resolution: 1920x1080
- Supported formats: mp4, webm, mov
- Temp file TTL: 1 hour
- Output retention: 24 hours

### Security Boundaries
- No arbitrary FFmpeg commands (whitelist only)
- No file path traversal
- No unvalidated URLs (SSRF protection)
- Run as non-root user
- No Docker socket access
- No API keys in logs

### Scope Exclusions
- No authentication/authorization
- No payment processing
- No video streaming
- No real-time processing
- No custom codec compilation
- No CDN integration
- No multi-tenancy
- No analytics
- No 4K support
- No long-term file storage

---

## Post-Implementation Notes

### Known Limitations
1. **Single Instance**: No horizontal scaling support yet
2. **Local Storage**: Files stored in Docker volumes only (no S3)
3. **No GPU**: CPU-only FFmpeg processing (slower for large videos)
4. **No Queue Persistence**: Jobs lost on container restart

### Future Enhancements (Out of Scope)
- Redis-backed job queue for persistence
- S3 integration for file storage
- GPU acceleration for FFmpeg
- Horizontal scaling with load balancer
- Video preview/thumbnail generation UI
- Template library for common video formats

### Monitoring Recommendations
- Set up alerts for disk space > 80%
- Monitor job queue length
- Track FFmpeg failure rates
- Log slow operations (> 60 seconds)

---

*Plan generated by Prometheus - SIN-Solver Video Generation MCP Server*
*Date: 2026-01-30*
*Version: 1.0*
