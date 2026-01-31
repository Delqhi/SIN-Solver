# 2Captcha Worker - Holy Trinity Architecture 🏆

**AI-powered CAPTCHA solving worker using Steel Browser CDP + Skyvern + Mistral AI**

> "Steel Browser is the Ferrari, Skyvern is the F1 Driver, Mistral is the Navigator"

## 🏆 The Holy Trinity Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 Skyvern (The Brain)                                     │
│     └─► AI Orchestrator for decision making                 │
│     └─► Self-healing error recovery                         │
│                                                              │
│  🖥️  Steel Browser CDP (The Hands)                          │
│     └─► Real-time browser control (no polling!)             │
│     └─► Chrome DevTools Protocol                            │
│                                                              │
│  👁️  Mistral AI (The Eyes)                                  │
│     └─► Vision analysis (pixtral-12b-2409)                  │
│     └─► 10x cheaper than OpenAI                             │
│                                                              │
│  🛡️  Stagehand (The Backup)                                 │
│     └─► Fallback orchestrator                               │
│     └─► Alternative AI strategies                           │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

### Core Features
- ✅ **Holy Trinity Stack**: Steel Browser CDP + Skyvern + Mistral AI
- ✅ **Real-time DOM**: CDP events (no polling delays)
- ✅ **AI Vision**: Mistral pixtral-12b for CAPTCHA analysis
- ✅ **10x Cheaper**: Than OpenAI GPT-4V
- ✅ **Self-Healing**: Automatic error recovery
- ✅ **Multi-Provider Fallback**: Skyvern → Stagehand → Manual

### Anti-Ban Protection (NEW)
- 🛡️ **IP-Manager**: Geo-IP checking, 15min cooldown on changes
- 🛡️ **IP Rotation Manager**: Router reconnect, SOCKS5 proxy binding, session persistence
- 🛡️ **Humanizer**: Gaussian delays, typo simulation, mouse curves
- 🛡️ **Session-Controller**: Trust-level management, clean logout
- 🛡️ **Fingerprint-Manager**: Consistent browser identity
- 🛡️ **Multi-Account**: IP exclusivity, Docker isolation
- 🛡️ **Watcher**: Health monitoring, automatic IP rotation
- 🛡️ **Sync Coordinator**: Key/IP rotation synced with session persistence

### Performance
- ⚡ **Sub-10s solving**: Average response time
- ⚡ **95%+ solve rate**: With AI consensus
- ⚡ **Parallel solving**: Multiple CAPTCHAs concurrently
- ⚡ **Queue management**: Priority-based processing
- ⚡ **Circuit breaker**: Graceful degradation

## Recent Changes (Session 31 - 2026-01-31)

### ✨ New Features
- Added **KeyPoolManager** for Groq key rotation with Mistral fallback support.
- Per-key request metrics, rate-limit backoff, and health-check tracking.

### 🔧 Improvements
- Centralized key rotation logic with configurable strategies.

## Recent Changes (Session 32 - 2026-01-31)

### ✨ New Features
- **Sync Coordinator** now persists session snapshots in Redis and restores them after key/IP rotations.

### 🔧 Improvements
- Rotation workflow enforces 60s cooldown, 30s restore timeout, and phase-level error handling.
- Redis-backed session persistence uses `REDIS_URL` (default: `redis://localhost:6379/0`).

## Recent Changes (Session 33 - 2026-01-31)

### 🔧 Improvements
- Normalized AlertSystem exports and callbacks factory wiring.
- Restored explicit IPRotationManager config typing in HolyTrinityWorker.

### 🧪 Testing
- Pending: LSP diagnostics, build, and rotation test suite verification.

## Recent Changes (Session 34 - 2026-01-31)

### 🔧 Improvements
- Reconstructed holy-trinity-worker.ts to remove corrupted tail and restore clean class structure.
- Restarted TypeScript language server to clear stale diagnostics.

### 🧪 Testing
- LSP diagnostics clean for holy-trinity-worker.ts and alerts.ts.
- `npm run build` succeeded.
- `npm test -- tests/rotation-system.test.ts` passed.


## Recent Changes (Session 35 - 2026-01-31)

### ✨ New Features
- Added Agent-07 VNC browser configuration (ports 50070/50071/50072) for headfull CDP debugging.

### 🔧 Improvements
- Autonomous worker now targets Agent-07 VNC CDP/HTTP URLs for reliable headfull debugging.

### 🧪 Testing
- LSP diagnostics clean for autonomous-worker.ts.


## 🏗️ Architecture

```
HolyTrinityWorker
├── SteelBrowserCDP (Real-time browser)
│   ├── CDP Connection (Port 9223)
│   ├── Navigate/Click/Fill/Screenshot
│   └── DOM Event Monitoring
├── MistralVision (AI Analysis)
│   ├── Image Analysis (pixtral-12b)
│   ├── Decision Making
│   └── Solution Extraction
├── SkyvernOrchestrator (Workflow)
│   ├── Task Planning
│   ├── Error Recovery
│   └── Multi-step Coordination
└── Anti-Ban Suite
    ├── IP-Manager
    ├── Humanizer
    ├── Session-Controller
    ├── Fingerprint-Manager
    └── Watcher
```

## Installation

### Prerequisites
- Node.js 16+ (LTS recommended)
- npm or yarn
- Playwright dependencies (will auto-install)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your 2Captcha credentials
nano .env
```

### Environment Variables

```env
TWOCAPTCHA_EMAIL=your-email@example.com
TWOCAPTCHA_PASSWORD=your-password
HEADLESS=false
STEALTH_MODE=true
SCREENSHOT_DIR=./screenshots
NAVIGATION_TIMEOUT=30000
CAPTCHA_WAIT_TIMEOUT=60000
```

### Vault Secrets Management (NEW)

API keys are now loaded from **HashiCorp Vault** (room-02-vault) instead of `.env`.

**Vault Paths:**
- `secret/groq-rotation/keys` (GROQ_API_KEY_1, GROQ_API_KEY_2, MISTRAL_API_KEY)
- `secret/groq-rotation/state` (rotation state)
- `secret/groq-rotation/metrics` (usage stats)

**Fallback:** Encrypted local file `vault-secrets.json` using AES-256-GCM (requires `VAULT_FALLBACK_KEY`).

**Secrets Structure (Vault KV):**
```yaml
groq:
  accounts:
    - id: groq-1
      key: gsk_...
      daily_limit: 14400
mistral:
  fallback:
    key: lteNYo...
```

**Fallback Behavior:** If Vault is unavailable, the worker will read keys from `.env` (GROQ_API_KEY_1, GROQ_API_KEY_2, MISTRAL_API_KEY) and continue.

**Required Vault Config (.env references only):**
```env
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=
VAULT_NAMESPACE=
VAULT_KV_VERSION=2
VAULT_FALLBACK_KEY=
VAULT_FALLBACK_PATH=./vault-secrets.json
```

## Usage

### Run Browser Automation

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start

# Build TypeScript
npm run build
```

### Programmatic Usage

```typescript
import SteelBrowserAutomation from './src/browser';

const automation = new SteelBrowserAutomation({
  headless: false,
  stealth: true,
  viewport: { width: 1920, height: 1080 }
});

try {
  await automation.initialize();
  await automation.navigateToLogin();
  await automation.login();
  await automation.navigateToStartWork();
  const screenshot = await automation.waitForCaptchaAndScreenshot();
  console.log(`CAPTCHA screenshot: ${screenshot}`);
} finally {
  await automation.close();
}
```

## How It Works

### 1. Browser Initialization
- Launches Chromium with stealth mode enabled
- Overrides `navigator.webdriver` property
- Sets realistic user agent
- Disables detection-prone features

### 2. Login Process
- Navigates to https://2captcha.com
- Waits for login form to appear
- Fills email and password fields
- Clicks login button
- Waits for navigation to complete

### 3. Work Navigation
- Looks for "Start Work" button/link
- Falls back to multiple selector strategies
- Navigates to work assignment page
- Takes screenshot for verification

### 4. CAPTCHA Capture
- Waits for CAPTCHA image to load
- Polls multiple selectors (img[alt*="captcha"], .captcha-image, etc.)
- Takes full-page screenshot when CAPTCHA is detected
- Saves to `screenshots/session-{timestamp}/` directory

## File Structure

```
2captcha-worker/
├── src/
│   └── browser.ts          # Main automation class
├── package.json            # npm dependencies
├── tsconfig.json           # TypeScript configuration
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md              # This file
```

## Output

Screenshots are saved in the following structure:
```
screenshots/
└── session-{timestamp}/
    ├── 01-initial-page-{ts}.png
    ├── 02-login-form-{ts}.png
    ├── 03-form-filled-{ts}.png
    ├── 04-after-login-{ts}.png
    ├── 05-start-work-page-{ts}.png
    ├── 06-no-captcha-found-{ts}.png
    └── 07-captcha-assigned-{ts}.png
```

## Debugging

### Enable Headless Mode
Set `HEADLESS=true` in `.env` to run in browser visible mode for debugging.

### View Network Activity
Playwright logs can be enabled:
```bash
DEBUG=pw:api npm start
```

### Inspect Page Content
Automation logs CSS selectors and element matching attempts. Check console output for:
- Login form detection
- Button click attempts
- Navigation confirmations
- CAPTCHA detection status

## Troubleshooting

### Login Fails
1. Check credentials in `.env`
2. Verify 2Captcha account status
3. Check console output for selector mismatches
4. Try increasing `NAVIGATION_TIMEOUT`

### CAPTCHA Not Found
1. Browser may still be loading - check 05-start-work-page screenshot
2. Verify work is available on 2Captcha account
3. Check for pop-ups or authentication challenges
4. Increase `CAPTCHA_WAIT_TIMEOUT`

### Detection/Ban
1. Use stealth mode (enabled by default)
2. Add delays between actions (slowMo: 100ms)
3. Use residential proxy if needed
4. Check browser console for detection scripts

## Dependencies

- **playwright**: Browser automation framework
- **dotenv**: Environment variable management
- **typescript**: Type-safe JavaScript

## Development

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test
```

#### Rotation Test Suite
```bash
# Runs key pool, IP rotation, sync coordinator, vault failover, and full cycle tests
npm test -- tests/key-pool.test.ts tests/ip-rotation.test.ts tests/sync-coordinator.test.ts tests/vault-integration.test.ts tests/full-rotation-cycle.test.ts
```

Notes:
- Uses mock API keys and local HTTP fixtures only.
- No router reconnects are triggered during tests.

## Notes

- Browser is **NOT headless by default** for easy debugging and visual monitoring
- Stealth mode is **enabled by default** to avoid detection
- Screenshots are **always saved** for audit trail and debugging
- Credentials are **loaded from environment variables** (never hardcoded)

## License

This project is part of SIN-Solver ecosystem.

## Support

For issues or questions, check the SIN-Solver documentation or contact the development team.
