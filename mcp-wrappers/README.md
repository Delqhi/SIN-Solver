# MCP Wrappers - Model Context Protocol Integration

This directory contains MCP (Model Context Protocol) wrappers that convert HTTP APIs to stdio-based MCP servers for integration with OpenCode and other AI systems.

## 📋 Overview

**Problem:** Docker containers expose HTTP APIs, but OpenCode expects stdio-based MCP servers.

**Solution:** MCP wrappers act as bridges, converting HTTP calls to stdio protocol.

```
Docker Container (HTTP API) → MCP Wrapper (stdio) → OpenCode
```

## 📁 Available Wrappers

### 1. Plane MCP Wrapper
**File:** `plane-mcp-wrapper.js`  
**Purpose:** Project management integration with Plane  
**API URL:** `https://plane.delqhi.com`  
**Version:** 2.0.0  
**Tools (30 total):**

**Project Tools:**
- `plane_list_projects` - List all projects
- `plane_get_project` - Get project details

**Issue Tools:**
- `plane_list_issues` - List issues with filters (state, priority, assignee)
- `plane_create_issue` - Create new issue with priority, assignees, labels
- `plane_get_issue` - Get issue details
- `plane_update_issue` - Update issue fields
- `plane_delete_issue` - Delete an issue
- `plane_search_issues` - Search issues by query

**Comment Tools:**
- `plane_list_comments` - List comments on an issue
- `plane_add_comment` - Add comment to issue

**Cycle Tools:**
- `plane_list_cycles` - List cycles/sprints
- `plane_create_cycle` - Create new cycle
- `plane_get_cycle` - Get cycle details

**Module Tools:**
- `plane_list_modules` - List modules
- `plane_create_module` - Create module
- `plane_get_module` - Get module details

**Member & Metadata Tools:**
- `plane_list_members` - List workspace members
- `plane_list_states` - List issue states
- `plane_list_labels` - List labels

**AI Agent Tools:**
- `plane_list_agents` - List available AI agents
- `plane_get_agent` - Get agent details
- `plane_mention_agent` - Mention/assign agent to task
- `plane_agent_suggestion` - Submit agent suggestion

### 2. Captcha Solver MCP Wrapper
**File:** `captcha-mcp-wrapper.js`  
**Purpose:** CAPTCHA solving with multi-AI consensus  
**API URL:** `https://captcha.delqhi.com` (or `http://localhost:8019` locally)  
**Tools:**
- `solve_text_captcha` - Solve text-based CAPTCHA (OCR, ddddocr, Gemini)
- `solve_image_captcha` - Solve image grid CAPTCHA (hCaptcha/reCAPTCHA)
- `solve_with_browser` - Solve CAPTCHA on live webpage (Steel Browser)
- `solve_slider_captcha` - Solve slider CAPTCHA (drag-to-unlock)
- `solve_audio_captcha` - Solve audio CAPTCHA (Whisper)
- `solve_click_order_captcha` - Solve click-order CAPTCHA
- `get_solver_status` - Get solver health status
- `check_rate_limits` - Check rate limit status
- `get_solver_stats` - Get performance metrics
- `get_solve_task_info` - Get task details

### 3. Scira AI Search MCP Wrapper
**File:** `scira-mcp-wrapper.js`  
**Purpose:** Advanced AI-powered web search with multiple providers  
**API URL:** `https://scira.delqhi.com` (or `http://localhost:8230` locally)  
**Tools:**
- `web_search` - AI-powered web search (Tavily, Exa)
- `academic_search` - Search academic papers and research
- `reddit_search` - Search Reddit discussions
- `youtube_search` - Search YouTube videos with captions
- `extract_url_content` - Extract content from any URL
- `movie_search` - Search movies/TV shows via TMDB
- `weather_search` - Get weather and forecasts
- `stock_chart` - Generate stock charts with news
- `ai_chat` - Chat with AI models (Grok, Claude, Gemini, GPT)
- `code_interpreter` - Execute Python code
- `health_check` - Check Scira service health

### 4. Skyvern Visual AI MCP Wrapper
**File:** `skyvern-mcp-wrapper.js`  
**Purpose:** Visual AI-powered web automation and element detection  
**Container:** `agent-06-skyvern-solver:8030`  
**Tools:**
- `analyze_screenshot` - Analyze screenshots for UI elements
- `navigate_and_solve` - Autonomous navigation with AI goal completion
- `solve_captcha` - Visual CAPTCHA solving
- `generate_totp` - Generate TOTP codes for 2FA
- `extract_coordinates` - Get click coordinates for elements
- `detect_login_form` - Detect login form elements
- `detect_2fa` - Detect 2FA/MFA challenges
- `health_check` - Check Skyvern service health

## 🔧 Installation

### Prerequisites
```bash
npm install @modelcontextprotocol/sdk axios
```

### Add to opencode.json

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
    "plane": {
      "type": "local",
      "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/plane-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "PLANE_API_URL": "https://plane.delqhi.com",
        "PLANE_API_KEY": "${PLANE_API_KEY}"
      }
    },
    "scira": {
      "type": "local",
      "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/scira-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "SCIRA_API_URL": "https://scira.delqhi.com",
        "SCIRA_API_KEY": "${SCIRA_API_KEY}",
        "REQUEST_TIMEOUT": "30000"
      }
    },
    "skyvern": {
      "type": "local",
      "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/skyvern-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "SKYVERN_API_URL": "http://localhost:8030",
        "SKYVERN_API_KEY": "dev-key",
        "REQUEST_TIMEOUT": "60000"
      }
    }
  }
}
```

## 🚀 Usage

### Test Locally

```bash
# Start the wrapper directly
node /Users/jeremy/dev/Delqhi-Platform/mcp-wrappers/captcha-mcp-wrapper.js

# In another terminal, test with OpenCode
opencode --model gemini-3-flash "Use the captcha_solver MCP to solve this CAPTCHA: [image]"
```

### Via OpenCode

```bash
# List available tools
opencode mcp list-tools captcha-solver

# Use a tool
opencode mcp call captcha-solver solve_text_captcha --image_base64 "..."
```

## 📝 Creating New Wrappers

### Template

```javascript
#!/usr/bin/env node
/**
 * [Service] MCP Wrapper
 * Konvertiert [Service] HTTP API zu MCP stdio Protocol
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:PORT';
const API_KEY = process.env.API_KEY;

const client = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
  }
});

const server = new Server(
  { name: '[service]-mcp-wrapper', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Implement tool functions here

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: [ /* tool definitions */ ] };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    // Handle tool calls
    return { toolResult: result };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
```

### Checklist

- [ ] Wrapper file created: `[service]-mcp-wrapper.js`
- [ ] Made executable: `chmod +x [service]-mcp-wrapper.js`
- [ ] Syntax verified: `node -c [service]-mcp-wrapper.js`
- [ ] All tools documented with descriptions
- [ ] Error handling implemented
- [ ] Environment variables documented
- [ ] Added to opencode.json
- [ ] Tested with OpenCode
- [ ] README updated

## 🔌 Architecture

### Request Flow

```
OpenCode (stdio)
    ↓
MCP Wrapper (Node.js)
    ├─ Parse stdio input
    ├─ Convert to HTTP
    ├─ Call Docker API
    ├─ Parse response
    └─ Convert to stdio output
    ↓
Docker Container (HTTP API)
```

### Error Handling

All wrappers implement proper MCP error responses:

```javascript
return {
  content: [{ type: 'text', text: `Error: ${error.message}` }],
  isError: true
};
```

## 🧪 Testing

### Unit Test Template

```bash
# Test wrapper startup
node /Users/jeremy/dev/Delqhi-Platform/mcp-wrappers/captcha-mcp-wrapper.js &
WRAPPER_PID=$!

# Test tool availability
sleep 1
kill $WRAPPER_PID

echo "✅ Wrapper test passed"
```

### Integration Test

```bash
# Add to opencode.json
# Run OpenCode with the wrapper
opencode --model gemini-3-flash "List available captcha solver tools"

# Should return list of tools
```

## 📊 Performance

### Latency

- Wrapper overhead: < 50ms
- HTTP call: 100-500ms (depends on API)
- Total: 150-550ms per request

### Memory

- Per wrapper: ~50MB (Node.js + dependencies)
- Multiple wrappers: ~100MB total

## 🔐 Security

### Best Practices

1. **Never log sensitive data** - API keys, tokens, solutions
2. **Use environment variables** - Never hardcode credentials
3. **Validate input** - Check image formats, URLs, etc.
4. **Rate limiting** - Respect API rate limits
5. **Timeout handling** - Prevent hanging requests

### Example

```javascript
// ✅ CORRECT
const apiKey = process.env.CAPTCHA_API_KEY;
if (!apiKey) throw new Error('CAPTCHA_API_KEY not set');

// ❌ WRONG
const apiKey = 'sk-1234567890'; // Hardcoded!
console.log('Using API key:', apiKey); // Logged!
```

## 📚 Documentation

Each wrapper should have:

1. **Header comment** - Purpose, API URL, environment variables
2. **Tool descriptions** - What each tool does
3. **Input schema** - Required/optional parameters
4. **Error handling** - How errors are reported
5. **Example usage** - How to use in OpenCode

## 🚨 Troubleshooting

### Wrapper won't start

```bash
# Check syntax
node -c /Users/jeremy/dev/Delqhi-Platform/mcp-wrappers/captcha-mcp-wrapper.js

# Check dependencies
npm list @modelcontextprotocol/sdk axios

# Check permissions
ls -la /Users/jeremy/dev/Delqhi-Platform/mcp-wrappers/captcha-mcp-wrapper.js
```

### API connection fails

```bash
# Check API is running
curl http://localhost:8019/api/status

# Check environment variables
echo $CAPTCHA_API_URL
echo $CAPTCHA_API_KEY

# Check firewall/network
ping captcha.delqhi.com
```

### Tools not appearing in OpenCode

```bash
# Verify wrapper is registered in opencode.json
cat ~/.config/opencode/opencode.json | grep captcha-solver

# Restart OpenCode
opencode --reset

# List tools
opencode mcp list-tools captcha-solver
```

## 📖 References

- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [OpenCode Documentation](https://opencode.ai/docs/)
- [Axios Documentation](https://axios-http.com/)
- [Node.js Streams](https://nodejs.org/api/stream.html)

## 📝 Changelog

### v1.1.0 (2026-01-30)
- Added Skyvern Visual AI MCP wrapper
- Added Scira AI Search MCP wrapper documentation
- Fixed path references from Delqhi-Platform to SIN-Solver
- Updated all wrapper configurations

### v1.0.0 (2026-01-29)
- Initial release
- Plane MCP wrapper
- Captcha Solver MCP wrapper
- Documentation and templates

---

**Maintained by:** SIN-Solver Team  
**Last Updated:** 2026-01-30  
**Status:** Production Ready ✅
