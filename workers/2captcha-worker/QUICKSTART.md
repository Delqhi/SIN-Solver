# 2Captcha Worker - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
cd workers/2captcha-worker
npm install
```

### 2. Configure Credentials
```bash
cp .env.example .env
# Edit .env with your 2Captcha login credentials
nano .env
```

### 3. Run Browser Automation
```bash
npm start
```

## 🎯 What Happens

1. ✅ Browser launches (visible for debugging)
2. ✅ Navigates to https://2captcha.com
3. ✅ Logs in with credentials from .env
4. ✅ Navigates to "Start Work" section
5. ✅ Waits for CAPTCHA assignment
6. ✅ Takes screenshot of assigned CAPTCHA
7. ✅ Saves to `screenshots/session-{timestamp}/`

## 📸 Output

Screenshots are saved in timestamped session folders:
```
screenshots/
└── session-1706645234567/
    ├── 01-initial-page-1706645234567.png
    ├── 02-login-form-1706645234567.png
    ├── 03-form-filled-1706645234567.png
    ├── 04-after-login-1706645234567.png
    ├── 05-start-work-page-1706645234567.png
    ├── 06-no-captcha-found-1706645234567.png
    └── 07-captcha-assigned-1706645234567.png
```

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Login fails | Check credentials in .env |
| CAPTCHA not found | Verify work is available on 2Captcha account |
| Detection/Ban | Stealth mode is enabled by default |
| Need to inspect page | Set `HEADLESS=false` in .env (default) |

## 📚 Full Documentation

See [README.md](./README.md) for complete documentation.

## ✅ Success Criteria

- Browser opens 2captcha.com ✓
- Login succeeds ✓
- "Start Work" page loads ✓
- CAPTCHA screenshot captured ✓
- Files saved to screenshots directory ✓
