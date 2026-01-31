# Captcha Worker System

Complete captcha solving worker with anti-ban protection.

## Files

- **worker-2captcha.md** - 2captcha.com rules and documentation
- **worker-kolotibablo.md** - Kolotibablo rules and documentation
- **consensus_solver.py** - 3-agent consensus system
- **human_behavior.py** - Human behavior simulation
- **session_manager.py** - IP tracking and session management
- **break_manager.py** - Break scheduling
- **monitor.py** - Real-time monitoring dashboard
- **captcha_worker_integrated.py** - Main integrated worker

## Quick Start

1. Install dependencies:
   ```bash
   pip install pytesseract pillow requests
   ```

2. Configure credentials in `.env`:
   ```
   TWOCAPTCHA_EMAIL=your@email.com
   TWOCAPTCHA_PASSWORD=yourpassword
   ```

3. Run worker:
   ```bash
   python captcha_worker_integrated.py
   ```

## Architecture

```
┌─────────────────────────────────────────┐
│           Captcha Worker                │
├─────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  Vision │ │   OCR   │ │ Pattern │  │
│  │  Agent  │ │  Agent  │ │  Agent  │  │
│  └────┬────┘ └────┬────┘ └────┬────┘  │
│       └───────────┼───────────┘       │
│                   ▼                   │
│           ┌──────────────┐            │
│           │   Consensus  │            │
│           │    Engine    │            │
│           └──────┬───────┘            │
│                  ▼                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  Human  │ │ Session │ │  Break  │  │
│  │Behavior │ │ Manager │ │ Manager │  │
│  └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────┘
```

## Safety Rules

- ✅ 95% minimum success rate
- ✅ 3-agent consensus required
- ✅ Cannot Solve when unsure
- ✅ Max 2.5h work sessions
- ✅ 5-15 min breaks
- ✅ Human-like behavior only

