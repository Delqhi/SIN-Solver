# Zimmer-22: Forum Bot

**Port:** 8022 | **IP:** 172.20.0.83

AI-powered forum and community automation bot.

## 🎯 Purpose

Automated forum engagement for brand building and traffic generation:
- Multi-platform posting (Reddit, Quora, Discord, Facebook)
- AI content generation using FREE APIs
- Community rule analysis and compliance
- Multi-account management with rate limiting
- Session persistence to avoid re-login

## 🔧 Features

- **Rule Analyzer** - AI-powered community guideline analysis
- **Content Generator** - Natural, human-like posts and replies
- **Multi-Account** - Manage multiple accounts per platform
- **Rate Limiting** - Automatic rate limiting to avoid bans
- **Session Persistence** - Cookies/session saved to database
- **Compliance Checking** - Verify content before posting
- **Scheduled Posts** - Queue posts for future

## 📡 API Endpoints

### Health
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |

### Accounts
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/accounts` | GET | List all accounts |
| `/api/accounts` | POST | Add new account |
| `/api/accounts/:id` | DELETE | Remove account |

### Rules
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rules/:platform?community=X` | GET | Get platform rules |
| `/api/rules/analyze` | POST | Analyze rules from URL |
| `/api/rules/check` | POST | Check content compliance |

### Content Generation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate/post` | POST | Generate forum post |
| `/api/generate/reply` | POST | Generate reply |
| `/api/generate/variations` | POST | Generate content variations |

### Posting
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/post` | POST | Create forum post |
| `/api/reply` | POST | Reply to thread |
| `/api/history` | GET | Get posting history |

### Scheduling
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scheduled` | GET | List scheduled posts |
| `/api/schedule` | POST | Schedule a post |
| `/api/schedule/:id` | DELETE | Cancel scheduled post |

## 🚀 Quick Start

```bash
npm install
npx playwright install chromium
npm start

# Environment Variables
DATABASE_URL=postgresql://...
OPENCODE_API_KEY=sk-...
GEMINI_API_KEY=...
GROQ_API_KEY=...
CLAWDBOT_URL=http://zimmer-09-clawdbot:8080
```

## 📁 Structure

```
zimmer-22-forum-bot/
├── package.json
├── Dockerfile
├── README.md
└── src/
    ├── index.js            # Express server + routes
    ├── config.js           # Configuration
    ├── logger.js           # Winston logger
    ├── account-manager.js  # Multi-account management
    ├── rule-analyzer.js    # AI rule analysis
    ├── content-generator.js # AI content generation
    └── forum-poster.js     # Playwright automation
```

## 📤 Usage Examples

### Add Account
```bash
curl -X POST http://localhost:8022/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "reddit",
    "username": "my_account",
    "email": "email@example.com",
    "password": "password123"
  }'
```

### Analyze Community Rules
```bash
curl -X POST http://localhost:8022/api/rules/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "reddit",
    "community": "webdev",
    "rulesUrl": "https://www.reddit.com/r/webdev/wiki/rules"
  }'
```

### Generate Post
```bash
curl -X POST http://localhost:8022/api/generate/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "reddit",
    "community": "webdev",
    "topic": "Tips for improving website performance",
    "style": "helpful",
    "targetLength": "medium"
  }'
```

### Post to Forum
```bash
curl -X POST http://localhost:8022/api/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "reddit",
    "community": "webdev",
    "content": "Here are my top 5 tips for improving website performance...",
    "generateContent": false
  }'
```

### Post with AI-Generated Content
```bash
curl -X POST http://localhost:8022/api/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "reddit",
    "community": "entrepreneur",
    "generateContent": true,
    "topic": "How I bootstrapped my SaaS to $10k MRR",
    "style": "story"
  }'
```

### Schedule Post
```bash
curl -X POST http://localhost:8022/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "reddit",
    "community": "startups",
    "generateContent": true,
    "topic": "Lessons learned from my first year as a founder",
    "scheduledAt": "2026-01-28T14:00:00Z"
  }'
```

## 🤖 AI Providers (ALL FREE)

| Provider | Model | Usage |
|----------|-------|-------|
| OpenCode Zen | zen/kaitchup-qwen-coder | Primary |
| Gemini | gemini-2.0-flash-exp | Fallback |
| Groq | llama-3.3-70b-versatile | Fallback |

## 📊 Supported Platforms

| Platform | Post | Reply | Features |
|----------|------|-------|----------|
| Reddit | ✅ | ✅ | Subreddit posting, comments |
| Quora | ✅ | ✅ | Questions, answers |
| Discord | ✅ | ❌ | Webhooks, channel messages |
| Facebook | ✅ | ❌ | Group posts |

## ⚙️ Rate Limits

| Platform | Posts/Hour | Replies/Hour | Min Delay |
|----------|------------|--------------|-----------|
| Reddit | 2 | 10 | 60s |
| Quora | 3 | 15 | 45s |
| Discord | N/A | N/A | 12s |
| Facebook | 1 | 10 | 120s |

## 🔒 Anti-Detection

- Stealth Playwright with anti-automation flags
- Session persistence (cookies saved)
- Rate limiting per account
- Proxy rotation support
- Content variation to avoid fingerprinting
- Human-like delays between actions

## 💰 Cost

**100% FREE**
- OpenCode Zen API (FREE)
- Gemini API (FREE tier)
- Groq API (FREE tier)
- Playwright (open source)
- Self-hosted

## 🔗 Integration

- **ClawdBot** - Notifications on post success/failure
- **Supabase** - Account & rules storage
- **n8n** - Workflow automation

---

**Version:** 1.0.0 | **Last Updated:** 2026-01-27
