# 2Captcha Worker - Project AGENTS.md

**Project:** SIN-Solver workers/2captcha-worker  
**Created:** 2026-01-30  
**Last Updated:** 2026-01-30  
**Session:** ses_3f9bc1908ffeVibfrKEY3Kybu5  

---

## 🎯 Project Overview

**Purpose:** AI-powered CAPTCHA solving worker for 2captcha.com  
**Architecture:** Steel Browser (CDP) + Skyvern + Mistral AI  
**Status:** Active Development  

---

## 🏗️ Architecture (THE HOLY TRINITY)

```
┌─────────────────────────────────────────────────────────────┐
│  OPTIMAL ARCHITECTURE - DO NOT DEVIATE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🧠 Skyvern (The Brain)                                     │
│     └─► AI Orchestrator                                     │
│     └─► Decision maker                                      │
│     └─► Error handler                                       │
│                                                              │
│  🖥️  agent-05-steel-browser (The Hands)                     │
│     └─► CDP-based browser                                   │
│     └─► Real-time DOM updates                               │
│     └─► Port: 9223 (CDP), 3005 (API)                       │
│                                                              │
│  👁️  Mistral AI (The Eyes)                                  │
│     └─► Vision analysis                                     │
│     └─► Model: pixtral-12b-2409                            │
│     └─► 10x cheaper than OpenAI                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### ⚠️ CRITICAL RULES

**MANDATORY STACK (No Exceptions):**
1. **Browser Engine:** agent-05-steel-browser (CDP) ONLY
2. **Orchestrator:** Skyvern (primary) or Stagehand (fallback)
3. **Vision AI:** Mistral AI (pixtral-12b) ONLY

**FORBIDDEN (Never Use):**
- ❌ Direct Playwright (too slow)
- ❌ OpenAI GPT-4V (too expensive)
- ❌ Hardcoded selectors (breaks easily)
- ❌ OpenCode CLI (not for browser automation)
- ❌ api.opencode.ai (doesn't work)

---

## 📁 Directory Structure

```
workers/2captcha-worker/
├── src/
│   ├── truly-intelligent-demo.ts    # Main worker (to be refactored)
│   ├── visual-mouse-tracker.ts      # Visual feedback
│   ├── detector.ts                  # CAPTCHA detection
│   └── browser.ts                   # Steel Browser connector
├── .env                             # API keys (NEVER COMMIT)
├── .env.example                     # Template
├── test-api.ts                      # API connectivity test
├── vault-secrets.json               # Vault backup
├── .session-19-*.md                 # Session documentation
└── AGENTS.md                        # This file
```

---

## 🔧 Technology Stack

### Primary (MUST USE)

| Component | Technology | Reason |
|-----------|------------|--------|
| Browser | Steel Browser (CDP) | Real-time DOM, faster than Playwright |
| Orchestrator | Skyvern | AI-driven decisions, self-healing |
| Vision | Mistral AI | 10x cheaper than OpenAI, same quality |
| Language | TypeScript | Type safety |
| Testing | Playwright (for E2E) | Only for testing, not production |

### Fallbacks (If Primary Fails)

| Primary | Fallback | Fallback 2 |
|---------|----------|------------|
| Skyvern | Stagehand | Custom orchestrator |
| Mistral | Claude (Anthropic) | Local vision model |
| Steel Browser | Playwright | Puppeteer |

---

## 🔐 Secrets Management

### API Keys (Local .env)

```env
# AI API Keys
MISTRAL_API_KEY=lteNYoXTsKUz6oYLGEHdxs1OTLTAkaw4
OPENCODE_ZEN_API_KEY=sk-wsoDvbl0JOfbSk5lmYJ5JZEx3fzChVBAn9xdb5NkOKuaDCdjudzFyU2UJ975ozdT

# ⚠️ NEVER DELETE THESE KEYS (MANDATE 0.21)
# ⚠️ If invalid, mark as DEPRECATED but KEEP
```

### Global Registry

**Location:** `~/dev/environments-jeremy.md`  
**Mandate:** MANDATE 0.21 - Append only, never delete  

### Vault Backup

**Location:** `vault-secrets.json`  
**Import:** To room-02-tresor-secrets when available  

---

## 📝 Coding Standards

### TypeScript Rules

```typescript
// ✅ CORRECT: Use Steel Browser CDP
const steel = await connectToSteelBrowser('localhost:9223');
await steel.navigate(url);

// ❌ FORBIDDEN: Direct Playwright in production
const browser = await chromium.launch(); // DON'T DO THIS
```

### Error Handling

```typescript
// ✅ CORRECT: Skyvern handles errors
skyvern.on('error', async (error) => {
  await fallbackToStagehand();
});

// ❌ FORBIDDEN: Empty catch blocks
try {
  await action();
} catch (e) {
  // NEVER DO THIS
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- Test individual components in isolation
- Mock Steel Browser CDP calls
- Test Mistral vision API with sample images

### Integration Tests
- Test Skyvern + Steel Browser connection
- Test full CAPTCHA solving workflow
- Use 2captcha.com demo page

### E2E Tests
- Full worker execution
- Multiple CAPTCHA types
- Error scenarios

---

## 🚀 Deployment

### Local Development

```bash
# 1. Start Steel Browser
docker start agent-05-steel-browser

# 2. Install dependencies
npm install

# 3. Configure .env
cp .env.example .env
# Edit .env with API keys

# 4. Run worker
npm run dev
```

### Production

```bash
# Docker deployment
docker-compose up -d builder-1.1-captcha-worker
```

---

## 📚 Documentation References

### Internal
- `.session-19-ses_3f9bc1908ffeVibfrKEY3Kybu5.md` - Session log
- `AGENTS_APPENDIX.md` - Global project rules
- `~/dev/environments-jeremy.md` - Secrets registry

### External
- [Skyvern Docs](https://github.com/Skyvern-AI/skyvern)
- [Steel Browser Docs](https://github.com/steel-dev/steel-browser)
- [Mistral AI Docs](https://docs.mistral.ai/)

---

## 🎯 Current Status

**Phase:** Architecture Decision & Documentation  
**Next:** Refactor worker to use Steel + Skyvern + Mistral  
**Blockers:** None  

**Completed:**
- ✅ API connectivity tests
- ✅ Mistral API integration
- ✅ Architecture decision (Steel + Skyvern + Mistral)
- ✅ Documentation

**Pending:**
- ⏳ Refactor worker code
- ⏳ Steel Browser CDP integration
- ⏳ Skyvern orchestration layer
- ⏳ End-to-end testing

---

## 🤝 Contributing

### Before Making Changes

1. Read this AGENTS.md
2. Check `.session-19-*.md` for context
3. Follow MANDATE 0.0 (no deletions)
4. Update documentation
5. Git commit after every task

### Questions?

- Check session documentation first
- Refer to architecture diagram
- Ask before deviating from stack

---

## 📜 Mandate Compliance

| Mandate | Status | Location |
|---------|--------|----------|
| MANDATE 0.0 (Immutability) | ✅ | All docs append-only |
| MANDATE 0.21 (Secrets) | ✅ | environments-jeremy.md |
| MANDATE -5 (No Blind Delete) | ✅ | Explicit warnings in .env |
| MANDATE -6 (Git Commit) | ✅ | After every task |
| MANDATE -7 (Session Doc) | ✅ | .session-19-*.md |

---

**Last Updated:** 2026-01-30  
**Session:** ses_3f9bc1908ffeVibfrKEY3Kybu5  
**Status:** Architecture decision documented, ready for implementation
