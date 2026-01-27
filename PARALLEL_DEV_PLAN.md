# 🚀 SIN-SOLVER EXTREME PARALLEL DEVELOPMENT PLAN
**Date:** 2026-01-27 | **Status:** ACTIVE | **Mode:** 2-DEVELOPER PARALLEL

---

## 🎯 MISSION CRITICAL: 100% FREE Survey Automation Empire

### Core Constraints (NEVER VIOLATE):
- ❌ NO PAID SERVICES (No OpenAI, No Claude/Anthropic, No CapMonster, No 2Captcha)
- ✅ Only FREE APIs: Gemini, Mistral, Groq, Cerebras, SambaNova, Ollama, HuggingFace, **OpenCode Zen**
- ✅ Self-hosted captcha solving with FREE vision AI
- ✅ One worker per platform (ban prevention)
- ✅ Cookie persistence across restarts
- ✅ Different proxy per platform

---

## 👨‍💻 DEVELOPER 1 (SISYPHUS-MAIN) - BACKEND & AI INTEGRATION

### TRACK A: Complete AI Provider Router (Priority: CRITICAL)

#### Task A1: Finish ai-assistant.js OpenCode Zen Integration
**File:** `services/zimmer-18-survey-worker/src/ai-assistant.js`
**Status:** IN PROGRESS
**Effort:** 30 min

```javascript
// ADD: callOpenCodeZen() method
async callOpenCodeZen(systemPrompt, userMessage) {
  // OpenAI-compatible API format
  // Endpoint: https://api.opencode.ai/v1/chat/completions
  // Model: grok-code
}
```

**Acceptance Criteria:**
- [ ] OpenCode Zen as PRIMARY for all text tasks
- [ ] Gemini reserved for VISION only
- [ ] Fallback chain: OpenCodeZen → Mistral → HuggingFace
- [ ] Vision chain: Gemini → Groq

---

#### Task A2: Create Central AI Router Module
**File:** `services/zimmer-13-api-coordinator/app/services/ai_router.py`
**Status:** TODO
**Effort:** 1 hour

```python
class FreeAIRouter:
    """Routes requests to FREE providers based on task type"""
    
    def route_text_task(self, prompt) -> str:
        # 1. OpenCode Zen (grok-code) - UNLIMITED
        # 2. Mistral - 1M tokens/month
        # 3. Groq - 14,400 req/day
        # 4. HuggingFace - rate limited
        pass
    
    def route_vision_task(self, image, prompt) -> str:
        # 1. Gemini 2.0 Flash - 1500/day
        # 2. Groq llama-3.2-90b-vision - 14,400/day
        # 3. Mistral Pixtral - 1M tokens/month
        pass
```

**Acceptance Criteria:**
- [ ] Automatic provider selection based on task type
- [ ] Rate limit tracking per provider
- [ ] Automatic fallback on failure
- [ ] Quota monitoring endpoint

---

#### Task A3: Add Zimmer-18 to docker-compose.yml
**File:** `docker-compose.yml`
**Status:** TODO
**Effort:** 15 min

```yaml
zimmer-18-survey-worker:
  build:
    context: ./services/zimmer-18-survey-worker
    dockerfile: Dockerfile
  container_name: Zimmer-18-Survey-Worker
  environment:
    NODE_ENV: production
    PORT: 8018
    REDIS_URL: redis://zimmer-speicher-redis:6379
    API_COORDINATOR_URL: http://zimmer-13-api-koordinator:8000
    STEEL_CDP_URL: ws://zimmer-05-steel-tarnkappe:3000/
    GEMINI_API_KEY: ${GEMINI_API_KEY}
    MISTRAL_API_KEY: ${MISTRAL_API_KEY}
    OPENCODE_ZEN_API_KEY: ${OPENCODE_ZEN_API_KEY}
  ports: ["8018:8018"]
  depends_on:
    zimmer-speicher-redis: { condition: service_healthy }
    zimmer-05-steel-tarnkappe: { condition: service_healthy }
  networks:
    haus-netzwerk:
      ipv4_address: 172.20.0.80
  healthcheck:
    test: ["CMD", "wget", "-q", "--spider", "http://localhost:8018/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

---

#### Task A4: Implement findAvailableSurvey() for Each Platform
**File:** `services/zimmer-18-survey-worker/src/platform-handlers/`
**Status:** TODO
**Effort:** 3 hours

Create platform-specific handlers:
```
src/platform-handlers/
├── swagbucks.js      # Swagbucks survey detection
├── prolific.js       # Prolific studies detection
├── mturk.js          # MTurk HITs detection
├── clickworker.js    # Clickworker jobs detection
├── appen.js          # Appen workflows detection
├── toluna.js         # Toluna surveys detection
├── lifepoints.js     # LifePoints surveys detection
├── yougov.js         # YouGov surveys detection
└── index.js          # Platform handler router
```

**Per Handler Requirements:**
- [ ] Login flow with cookie persistence
- [ ] Survey list scraping
- [ ] Survey qualification check
- [ ] Reward parsing
- [ ] CAPTCHA detection → Route to Zimmer-13

---

#### Task A5: Implement completeSurvey() with AI Assistance
**File:** `services/zimmer-18-survey-worker/src/survey-completer.js`
**Status:** TODO
**Effort:** 2 hours

```javascript
class SurveyCompleter {
  async complete(page, survey, aiAssistant) {
    // 1. Detect question type (radio, checkbox, text, scale, matrix)
    // 2. Use AI to suggest answer (via FREE providers)
    // 3. Fill form with human-like delays
    // 4. Handle attention checks
    // 5. Detect and solve CAPTCHAs
    // 6. Submit and verify completion
  }
}
```

---

### TRACK B: Captcha Integration (Priority: HIGH)

#### Task B1: Connect Survey Worker to Captcha Solver API
**File:** `services/zimmer-18-survey-worker/src/captcha-bridge.js`
**Status:** TODO
**Effort:** 1 hour

```javascript
class CaptchaBridge {
  constructor() {
    this.apiUrl = process.env.API_COORDINATOR_URL || 'http://zimmer-13-api-koordinator:8000';
  }
  
  async solveCaptcha(type, imageOrUrl, options = {}) {
    // POST to /captcha/solve
    // Returns solution from FREE vision AI
  }
  
  async solveRecaptcha(siteKey, pageUrl) {
    // Use Buster extension or audio bypass
  }
}
```

---

## 👨‍💻 DEVELOPER 2 (PARALLEL) - FRONTEND & PLATFORM HANDLERS

### TRACK C: Dashboard Integration (Priority: HIGH)

#### Task C1: Create Survey Worker Control Panel Component
**File:** `services/zimmer-11-dashboard/src/components/SurveyWorkerPanel.jsx`
**Status:** TODO
**Effort:** 2 hours

```jsx
// Features needed:
// - Platform list with enable/disable toggles
// - Start/Stop worker buttons per platform
// - Status indicators (running, stopped, error, cooldown)
// - Earnings display per platform
// - Cookie status (valid, expired, missing)
// - Proxy status per platform
```

**Acceptance Criteria:**
- [ ] Real-time status updates via WebSocket/polling
- [ ] Platform enable/disable with confirmation
- [ ] Start/Stop with loading states
- [ ] Error display with retry option

---

#### Task C2: Create Cookie Import Modal
**File:** `services/zimmer-11-dashboard/src/components/CookieImportModal.jsx`
**Status:** TODO
**Effort:** 1 hour

```jsx
// Features:
// - Paste cookies from browser (JSON format)
// - Upload cookies.txt file
// - Browser extension integration (optional)
// - Validation before import
// - Success/Error feedback
```

---

#### Task C3: Create Earnings Dashboard
**File:** `services/zimmer-11-dashboard/src/components/EarningsDashboard.jsx`
**Status:** TODO
**Effort:** 1.5 hours

```jsx
// Features:
// - Daily/Weekly/Monthly earnings chart
// - Per-platform breakdown
// - Surveys completed counter
// - Average earning per survey
// - Projected monthly earnings
// - Export to CSV
```

---

#### Task C4: Create AI Chat Interface
**File:** `services/zimmer-11-dashboard/src/components/AIChatPanel.jsx`
**Status:** TODO
**Effort:** 1 hour

```jsx
// Features:
// - Chat with AI assistant for survey help
// - Show which FREE provider responded
// - History persistence
// - Quick action buttons (troubleshoot, optimize, report issue)
```

---

### TRACK D: Platform-Specific Selectors (Priority: MEDIUM)

#### Task D1: Swagbucks Selectors & Flow
**File:** `services/zimmer-18-survey-worker/src/platform-handlers/swagbucks.js`
**Status:** TODO
**Effort:** 45 min

```javascript
const SWAGBUCKS_SELECTORS = {
  loginForm: {
    email: '#login-email',
    password: '#login-password',
    submit: 'button[type="submit"]'
  },
  surveyList: {
    container: '.survey-list',
    item: '.survey-item',
    title: '.survey-title',
    reward: '.survey-reward',
    duration: '.survey-duration',
    startButton: '.start-survey-btn'
  },
  surveyPage: {
    question: '.question-text',
    options: '.answer-option',
    nextButton: '.next-btn',
    submitButton: '.submit-btn',
    progressBar: '.progress-bar'
  }
};

// Implement: login(), findSurveys(), startSurvey()
```

---

#### Task D2: Prolific Selectors & Flow
**File:** `services/zimmer-18-survey-worker/src/platform-handlers/prolific.js`
**Status:** TODO
**Effort:** 45 min

```javascript
const PROLIFIC_SELECTORS = {
  // Prolific has a different structure - studies not surveys
  loginForm: { /* ... */ },
  studiesList: { /* ... */ },
  studyPage: { /* ... */ }
};
```

---

#### Task D3: MTurk Selectors & Flow
**File:** `services/zimmer-18-survey-worker/src/platform-handlers/mturk.js`
**Status:** TODO
**Effort:** 45 min

```javascript
const MTURK_SELECTORS = {
  // MTurk has HITs, qualifications, etc.
  hitList: { /* ... */ },
  hitPage: { /* ... */ },
  qualifications: { /* ... */ }
};
```

---

#### Task D4-D8: Remaining Platforms
**Files:** `clickworker.js`, `appen.js`, `toluna.js`, `lifepoints.js`, `yougov.js`
**Status:** TODO
**Effort:** 30 min each

---

### TRACK E: Proxy Management UI (Priority: MEDIUM)

#### Task E1: Proxy Management Panel
**File:** `services/zimmer-11-dashboard/src/components/ProxyManager.jsx`
**Status:** TODO
**Effort:** 1.5 hours

```jsx
// Features:
// - Add/Remove proxies
// - Test proxy health
// - Assign proxy to platform
// - Show proxy usage stats
// - Cooldown status
// - Ban detection indicator
```

---

## 📋 TASK SUMMARY BY PRIORITY

### 🔴 CRITICAL (Do First)
| ID | Task | Developer | Effort | Status |
|----|------|-----------|--------|--------|
| A1 | Finish ai-assistant.js OpenCode Zen | DEV1 | 30min | IN_PROGRESS |
| A3 | Add Zimmer-18 to docker-compose | DEV1 | 15min | TODO |
| C1 | Survey Worker Control Panel | DEV2 | 2h | TODO |

### 🟠 HIGH (Do Next)
| ID | Task | Developer | Effort | Status |
|----|------|-----------|--------|--------|
| A2 | Central AI Router Module | DEV1 | 1h | TODO |
| A4 | findAvailableSurvey() handlers | DEV1 | 3h | TODO |
| B1 | Captcha Bridge | DEV1 | 1h | TODO |
| C2 | Cookie Import Modal | DEV2 | 1h | TODO |
| C3 | Earnings Dashboard | DEV2 | 1.5h | TODO |

### 🟡 MEDIUM (Parallel Work)
| ID | Task | Developer | Effort | Status |
|----|------|-----------|--------|--------|
| A5 | completeSurvey() with AI | DEV1 | 2h | TODO |
| C4 | AI Chat Interface | DEV2 | 1h | TODO |
| D1-D8 | Platform Selectors | DEV2 | 4h | TODO |
| E1 | Proxy Manager Panel | DEV2 | 1.5h | TODO |

---

## 🔀 PARALLEL EXECUTION PLAN

### Phase 1: Foundation (2 hours)
```
DEV1 (Backend)              DEV2 (Frontend)
─────────────────           ─────────────────
A1: ai-assistant.js    ║    C1: Control Panel
A3: docker-compose     ║    (can work in parallel)
                       ║
```

### Phase 2: Integration (3 hours)
```
DEV1 (Backend)              DEV2 (Frontend)
─────────────────           ─────────────────
A2: AI Router          ║    C2: Cookie Modal
B1: Captcha Bridge     ║    C3: Earnings Dashboard
                       ║
```

### Phase 3: Platform Handlers (4 hours)
```
DEV1 (Backend)              DEV2 (Frontend)
─────────────────           ─────────────────
A4: findAvailableSurvey ║   D1-D4: Platform Selectors
A5: completeSurvey()    ║   C4: AI Chat Interface
                        ║
```

### Phase 4: Polish (2 hours)
```
DEV1 (Backend)              DEV2 (Frontend)
─────────────────           ─────────────────
Testing & Fixes        ║    E1: Proxy Manager
Integration Tests      ║    D5-D8: Remaining Platforms
                       ║
```

---

## 🛠️ DEVELOPER 2 QUICK START

### 1. Clone & Setup
```bash
cd /Users/jeremy/dev/SIN-Solver
git pull origin main
npm install
```

### 2. Start Development Environment
```bash
# Start infrastructure
docker-compose up -d zimmer-speicher-redis zimmer-archiv-postgres

# Start dashboard dev server
cd services/zimmer-11-dashboard
npm install
npm run dev
```

### 3. API Endpoints (Zimmer-18)
```
GET  /health                    - Health check
GET  /platforms                 - List all platforms
GET  /platforms/:id/status      - Platform status
POST /platforms/:id/start       - Start worker
POST /platforms/:id/stop        - Stop worker
POST /platforms/:id/config      - Update config
GET  /cookies/:platformId       - Cookie status
POST /cookies/:platformId/import - Import cookies
GET  /proxies                   - Proxy list
POST /proxies                   - Add proxy
POST /chat                      - AI chat
GET  /stats                     - Global stats
GET  /earnings                  - Earnings report
```

### 4. Key Files to Know
```
services/
├── zimmer-11-dashboard/        # React Dashboard
│   └── src/components/         # YOUR WORK HERE
├── zimmer-13-api-coordinator/  # FastAPI Backend
│   └── app/                    # API routes
├── zimmer-18-survey-worker/    # Survey Bot
│   └── src/
│       ├── orchestrator.js     # Main logic
│       ├── platform-manager.js # Platform configs
│       ├── ai-assistant.js     # AI integration
│       ├── cookie-manager.js   # Cookie persistence
│       └── proxy-rotator.js    # Proxy management
```

---

## ⚠️ CRITICAL RULES FOR BOTH DEVELOPERS

1. **NO PAID SERVICES** - Check every API call
2. **One worker per platform** - Never run 2 workers on same platform
3. **Cookie persistence** - Always save/load cookies
4. **Proxy per platform** - Different IP for each platform
5. **Human-like delays** - 2-30 second random delays
6. **Error logging** - Log everything for debugging
7. **Test locally first** - Don't break production

---

## 📊 SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Platforms supported | 8/8 |
| AI providers integrated | 5+ FREE |
| Dashboard components | 6 |
| Test coverage | 80%+ |
| Survey completion rate | 70%+ |
| Ban rate | <5% |

---

**Last Updated:** 2026-01-27 01:30
**Author:** Sisyphus-Main
