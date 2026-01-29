# Zimmer-14: Worker

**Port:** 8080 | **IP:** 172.20.0.14

General-purpose task worker for Delqhi-Platform.

## 🎯 Purpose

Executes background tasks assigned by the API Coordinator:
- Long-running operations
- Batch processing
- Scheduled tasks

## 🔧 Features

- **Task Processing** - Execute queued tasks
- **Background Jobs** - Async processing
- **Retry Logic** - Automatic failure recovery
- **Status Reporting** - Progress updates

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/tasks` | GET | List tasks |
| `/tasks/:id` | GET | Get task status |
| `/stats` | GET | Worker statistics |

## 🚀 Quick Start

```bash
npm install
npm start
```

## 💰 Cost

**100% FREE**

---

**Version:** 1.0.0 | **Last Updated:** 2026-01-27
