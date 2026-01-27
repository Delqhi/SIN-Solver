# Zimmer-21: Video Generator

**Port:** 8021 | **IP:** 172.20.0.83

AI-powered video content generator with TTS and social media integration.

## 🎯 Purpose

Automated video content creation pipeline:
- AI script generation (OpenCode Zen FREE)
- Text-to-Speech (edge-tts FREE)
- Video assembly (FFmpeg)
- Social media posting (ClawdBot integration)

## 🔧 Features

- **Script Generation** - AI-powered video scripts for different content types
- **Text-to-Speech** - Microsoft Edge TTS with multiple voices
- **Video Assembly** - FFmpeg-based video creation with backgrounds
- **Multi-Platform** - TikTok, YouTube Shorts, Instagram Reels
- **Auto-Posting** - ClawdBot integration for social media
- **Queue System** - Supabase-backed video queue

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/status` | GET | Detailed status |
| `/api/generate` | POST | Generate complete video |
| `/api/jobs/:id` | GET | Get job status |
| `/api/jobs` | GET | List active jobs |
| `/api/script` | POST | Generate script only |
| `/api/tts` | POST | Convert text to speech |
| `/api/assemble` | POST | Assemble video from audio |
| `/api/post` | POST | Post video to social media |
| `/api/voices` | GET | List available TTS voices |
| `/api/queue` | GET | Get pending videos |
| `/api/queue` | POST | Add topic to queue |

## 🚀 Quick Start

```bash
npm install
npm start

# Environment Variables
OPENCODE_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
CLAWDBOT_URL=http://zimmer-09-clawdbot:8080
TTS_VOICE=de-DE-KatjaNeural
```

## 📁 Structure

```
zimmer-21-video-generator/
├── package.json
├── Dockerfile
├── README.md
└── src/
    ├── index.js              # Express server
    ├── config.js             # Configuration
    ├── logger.js             # Winston logging
    ├── script-generator.js   # AI script generation
    ├── tts-engine.js         # Text-to-speech
    ├── video-assembler.js    # FFmpeg video assembly
    └── social-poster.js      # ClawdBot integration
```

## 🎬 Video Pipeline

```
Topic → AI Script → TTS Audio → FFmpeg Assembly → Video File → ClawdBot Post
```

### Content Types

| Type | Description | Use Case |
|------|-------------|----------|
| `educational` | Informative, hook-driven | Tutorials, tips |
| `promotional` | Marketing-focused | Product promos |
| `story` | Narrative-driven | Storytelling |
| `tips` | Quick tips format | List content |

### Supported Voices

**German:**
- `de-DE-KatjaNeural` (female, professional)
- `de-DE-ConradNeural` (male, professional)
- `de-DE-AmalaNeural` (female, friendly)

**English:**
- `en-US-JennyNeural` (female, professional)
- `en-US-GuyNeural` (male, casual)

## 📊 Video Presets

| Platform | Resolution | Max Duration |
|----------|------------|--------------|
| TikTok | 1080x1920 | 60s |
| YouTube Shorts | 1080x1920 | 60s |
| Instagram Reels | 1080x1920 | 90s |

## 🗄️ Database Schema

```sql
CREATE TABLE video_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  script TEXT,
  audio_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'pending',
  platform TEXT[],
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

## 💰 Cost

**100% FREE** - All components use free APIs:
- OpenCode Zen API (FREE)
- edge-tts (FREE Microsoft TTS)
- FFmpeg (open source)

---

**Version:** 1.0.0 | **Last Updated:** 2026-01-27
