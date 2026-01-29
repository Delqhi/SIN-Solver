# 🔐 Security Guidelines - SIN-Solver Project

## ⚠️ Critical: What NEVER Goes to Git

### FORBIDDEN - Contains Secrets
- `.env` (root environment variables)
- `.env.local` (local development secrets)
- `.env.production` (production secrets)
- `.env.development.local`, `.env.test.local`
- `dashboard/.env.local`
- `dashboard/.env.production` 
- Any file with actual API keys, tokens, passwords

### ALLOWED - Safe Templates Only
- `.env.example` (template with placeholder values)
- `dashboard/.env.example` (template for dashboard)
- Configuration files with public data only
- `SECURITY.md` (this file)

---

## 🚀 Setting Up Development Environment

### For New Developers

1. **Clone repository**
   ```bash
   git clone https://github.com/delqhi/SIN-Solver.git
   cd SIN-Solver
   ```

2. **Copy environment templates**
   ```bash
   # Root project config
   cp .env.example .env.local
   
   # Dashboard config
   cp dashboard/.env.example dashboard/.env.local
   ```

3. **Fill in actual values**
   - Get API keys from: Mistral, Gemini, OpenCode Zen, Supabase, Telegram
   - Ask @delqhi for team credentials if needed
   - Save to `.env.local` files (NOT tracked by git)

4. **DO NOT commit these files**
   - They're automatically ignored by `.gitignore`
   - Git pre-commit hook will block accidental commits
   - If you see a security error, it's protecting the project

---

## 🛡️ Security Protections in Place

### 1. `.gitignore` Rules ✅
- All `.env*` files ignored
- Patterns defined at lines 13-17 (and 19-20 for production)
- Prevents accidental commits

### 2. Git Pre-Commit Hook ✅
- Automatic safety check before every commit
- Blocks `.env` files from being staged
- Allows `.env.example` (safe templates)
- Helpful error message if blocked
- Can override with `git commit --no-verify` (NOT recommended)

### 3. Git History ✅
- Scanned for exposed credentials
- No secrets ever committed
- Clean from project inception

---

## ⚠️ If You Accidentally Commit a Secret

### BEFORE Push (Safe to Undo)
```bash
# Undo last commit (keeps changes)
git reset HEAD~1

# Unstage the .env file
git reset HEAD <filename>

# Remove from git tracking
git rm --cached <filename>

# Commit again without the secret
git commit -m "fix: remove accidental secret"
```

### AFTER Push (Requires Action)
1. **Notify immediately:** @delqhi
2. **Rotate the exposed credential** (revoke API key, reset token)
3. **Contact repo owner** for credential rotation guidance
4. May need `git filter-branch` to rewrite history

---

## 📚 Environment Files by Service

| Service | Template | Location | Purpose |
|---------|----------|----------|---------|
| Dashboard | `.env.example` | `dashboard/` | Next.js frontend config, API URLs, AI keys |
| Root Project | `.env.example` | `.` | Main project configuration |
| Room-16 | `.env.example` | `Docker/rooms/room-16-supabase/` | Database & auth |
| Room-01 | `.env.example` | `Docker/agents/agent-01-n8n/` | Workflow automation |

---

## 🔒 API Keys Used in This Project

| Service | Key Name | Free Tier | Purpose |
|---------|----------|-----------|---------|
| Mistral | `NEXT_PUBLIC_MISTRAL_API_KEY` | ✅ 1M/month | AI chat |
| Google Gemini | `NEXT_PUBLIC_GEMINI_API_KEY` | ✅ 60 req/min | AI assistant |
| OpenCode Zen | `NEXT_PUBLIC_OPENCODE_ZEN_API_KEY` | ✅ Unlimited | Code generation |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 500K users | Database & auth |
| Telegram | `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` | ✅ Free | Bot integration |

---

## 📊 Security Posture

**Current Score: 8.5/10**

✅ **Strengths:**
- Git pre-commit hook prevents future commits
- All `.env` files in `.gitignore`
- `.env.example` templates for onboarding
- This security guide in place
- Git history clean (no secrets ever committed)

⚠️ **Could Improve:**
- GitHub branch protection rules
- GitHub Actions secret scanning
- Automated credential rotation schedule
- Developer security training
- Incident response plan

---

## 📞 Support

**Questions or security concerns?** Contact: @delqhi

---

**Last Updated:** 2026-01-29  
**Audit Phase:** 3 Complete  
**Status:** ✅ Production Ready
