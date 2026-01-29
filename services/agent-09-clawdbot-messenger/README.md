# Zimmer-09: ClawdBot

**Port:** 8080 | **IP:** 172.20.0.9

Multi-platform notification and messaging bot with **Social Media Auto-Posting**.

## 🎯 Purpose

Central notification hub for all Delqhi-Platform services:
- Discord bot with slash commands
- Telegram bot integration
- Alert management
- Status notifications
- **Social Media Auto-Posting** (Twitter, Instagram, TikTok, YouTube)

## 🔧 Features

- **Discord Integration** - Webhooks, embeds, slash commands
- **Telegram Bot** - Message sending, updates
- **Alert System** - Priority-based notifications
- **Status Updates** - Task completion alerts
- **Error Reporting** - Failure notifications
- **Social Media Manager** - Multi-platform auto-posting with scheduling
- **Video Posting** - YouTube, TikTok, Instagram Reels via Steel Browser

## 📡 API Endpoints

### Notifications
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/notify` | POST | Send notification |
| `/api/alert` | POST | Send alert |
| `/api/message` | POST | Send message |
| `/api/discord/webhook` | POST | Discord webhook |
| `/api/telegram/send` | POST | Telegram message |

### Social Media (NEW)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/social/status` | GET | Platform connection status |
| `/api/social/post` | POST | Post text to platforms |
| `/api/social/video` | POST | Post video to platforms |
| `/api/social/history` | GET | Get posting history |
| `/api/social/scheduled` | GET | Get scheduled posts |

## 📱 Social Media Platforms

| Platform | Auth Method | Features |
|----------|-------------|----------|
| **Twitter/X** | Steel Browser Session | Text, images, threads |
| **Instagram** | Steel Browser Session | Posts, stories, reels |
| **TikTok** | Steel Browser Session | Video upload |
| **YouTube** | OAuth2 | Video upload, shorts |

## 🚀 Quick Start

```bash
npm install
npm start

# Environment
DISCORD_BOT_TOKEN=your_token
DISCORD_WEBHOOK_URL=your_webhook
TELEGRAM_BOT_TOKEN=your_token
STEEL_API_URL=http://zimmer-05-steel:3000
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
```

## 📁 Structure

```
zimmer-09-clawdbot/
├── server.js
├── src/
│   ├── discord/
│   │   ├── bot.js
│   │   └── commands/
│   ├── telegram/
│   │   └── bot.js
│   ├── social/                    # NEW
│   │   ├── manager.js             # Social media manager
│   │   ├── platforms.js           # Platform implementations
│   │   └── routes.js              # API routes
│   ├── providers/
│   │   ├── index.js
│   │   ├── telegram.js
│   │   ├── whatsapp.js
│   │   └── discord.js
│   ├── events/
│   │   └── survey-events.js
│   ├── webhooks/
│   │   ├── n8n.js
│   │   └── oauth.js
│   └── notifications/
│       ├── handler.js
│       └── templates.js
├── Dockerfile
└── package.json
```

## 📤 Usage Examples

### Post to Social Media
```bash
# Text post to all platforms
curl -X POST http://localhost:8080/api/social/post \
  -H "Content-Type: application/json" \
  -d '{"content": "Check out our new product!", "platforms": ["twitter", "instagram"]}'

# Video post
curl -X POST http://localhost:8080/api/social/video \
  -H "Content-Type: application/json" \
  -d '{
    "videoPath": "/tmp/video.mp4",
    "title": "Amazing Video",
    "description": "Check this out!",
    "platforms": ["youtube", "tiktok"]
  }'

# Scheduled post
curl -X POST http://localhost:8080/api/social/post \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Scheduled content",
    "platforms": ["twitter"],
    "scheduledAt": "2026-01-28T10:00:00Z"
  }'
```

## 💰 Cost

**100% FREE** - All APIs are free:
- Discord/Telegram APIs (free)
- Steel Browser (self-hosted)
- YouTube API (free quota)

---

**Version:** 2.0.0 | **Last Updated:** 2026-01-27
