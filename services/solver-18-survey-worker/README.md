# Zimmer-18: Survey Worker

**Port:** 8018 | **IP:** 172.20.0.80

Automated survey completion worker with AI assistance.

## 🎯 Purpose

Completes online surveys automatically using:
- AI-powered question answering
- Platform-specific handlers
- Cookie persistence for sessions
- Proxy rotation for ban prevention

## 🔧 Features

- **Multi-Platform** - Swagbucks, Prolific, MTurk, Clickworker, Appen, Toluna, LifePoints, YouGov
- **AI Assistant** - OpenCode Zen + FREE fallbacks (Gemini, Mistral, Groq)
- **Cookie Manager** - Session persistence
- **Proxy Rotator** - Ban prevention
- **Captcha Bridge** - Integration with Zimmer-19

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/platforms` | GET | List all platforms |
| `/platforms/:id/status` | GET | Platform status |
| `/platforms/:id/start` | POST | Start worker |
| `/platforms/:id/stop` | POST | Stop worker |
| `/cookies/:id` | GET | Get cookies |
| `/cookies/:id/import` | POST | Import cookies |
| `/proxies` | GET/POST | Proxy management |
| `/chat` | POST | AI chat |
| `/stats` | GET | Global statistics |
| `/earnings` | GET | Earnings report |

## 🚀 Quick Start

```bash
npm install
npm start

# Docker
docker build -t sin-survey-worker .
docker run -p 8018:8018 sin-survey-worker
```

## 📁 Structure

```
zimmer-18-survey-worker/
├── server.js
├── src/
│   ├── orchestrator.js      # Main survey loop
│   ├── ai-assistant.js      # AI question answering
│   ├── survey-completer.js  # Survey automation
│   ├── platform-manager.js  # Platform orchestration
│   ├── cookie-manager.js    # Session persistence
│   ├── proxy-rotator.js     # IP rotation
│   ├── captcha-bridge.js    # Captcha solving
│   └── platform-handlers/   # Platform-specific logic
│       ├── swagbucks.js
│       ├── prolific.js
│       ├── mturk.js
│       ├── clickworker.js
│       ├── appen.js
│       ├── toluna.js
│       ├── lifepoints.js
│       └── yougov.js
├── Dockerfile
└── package.json
```

## 💰 Cost

**100% FREE** - Uses only free AI APIs.

---

**Version:** 1.0.0 | **Last Updated:** 2026-01-27
