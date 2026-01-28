# Zimmer-17: SIN-Plugins (MCP)

**Port:** 8000 | **IP:** 172.20.0.40

MCP plugin server for extensible functionality.

## 🎯 Purpose

Model Context Protocol server for plugins:
- Plugin management
- Tool registration
- Resource handling

## 🔧 Features

- **Plugin System** - Extensible architecture
- **MCP Tools** - Custom tool definitions
- **Resource Management** - Dynamic resources

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/plugins` | GET | List plugins |
| `/tools` | GET | List MCP tools |

## 🚀 Quick Start

```bash
pip install -r requirements.txt
python -m uvicorn src.main:app --port 8000
```

## 💰 Cost

**100% FREE**

---

**Version:** 1.0.0 | **Last Updated:** 2026-01-27
