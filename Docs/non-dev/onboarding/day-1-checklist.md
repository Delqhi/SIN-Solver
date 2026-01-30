# Day 1 Onboarding Checklist

**New Hire:** _____________________  
**Start Date:** _____________________  
**Role:** _____________________  
**Buddy:** _____________________  
**Manager:** _____________________  

---

## ✅ Pre-Arrival (HR/IT Responsibility)

- [ ] Laptop configured and ready (MacBook Pro M1/M2/M3)
- [ ] Email account created (@delqhi.com)
- [ ] Slack workspace invitation sent
- [ ] GitHub organization invitation sent
- [ ] VPN access configured (if applicable)
- [ ] Welcome email sent with first-day instructions
- [ ] Desk/workspace prepared
- [ ] Welcome swag prepared

---

## ✅ Morning: Welcome & Setup (9:00 AM - 12:00 PM)

### 9:00 AM - 9:30 AM: Welcome
- [ ] Meet with manager for welcome chat
- [ ] Receive laptop and equipment
- [ ] Get building tour (if on-site)
- [ ] Get desk setup
- [ ] Receive welcome swag

### 9:30 AM - 10:30 AM: Account Setup

#### Essential Accounts
- [ ] **Slack** - Accept invitation and join workspace
  - URL: https://delqhi.slack.com
  - Download desktop app
  - Set up profile picture
  - Set status to "New hire - learning the ropes 🎓"
  
- [ ] **GitHub** - Accept organization invitation
  - URL: https://github.com/Delqhi
  - Verify SSH key setup
  - Enable 2FA
  
- [ ] **Email** - Access email account
  - Set up signature
  - Configure forwarding (if needed)
  - Test sending/receiving

#### Service Access
- [ ] **Grafana** - Monitoring dashboard
  - URL: https://dashboard.delqhi.com
  - Verify login works
  
- [ ] **Vault** - Secrets management
  - URL: https://vault.delqhi.com
  - Request access token from buddy
  
- [ ] **n8n** - Workflow automation
  - URL: https://n8n.delqhi.com
  - Verify read access

### 10:30 AM - 11:00 AM: Slack Setup

#### Required Channels
- [ ] Join `#general` - Company-wide announcements
- [ ] Join `#engineering` - Engineering discussions
- [ ] Join `#sin-solver` - Platform-specific
- [ ] Join `#deployments` - Deployment notifications
- [ ] Join `#incidents` - Incident response
- [ ] Join `#onboarding` - New hire questions

#### Optional Channels
- [ ] Join `#random` - Water cooler chat
- [ ] Join `#help` - Ask anything
- [ ] Join `#docs` - Documentation discussions

#### Slack Profile
- [ ] Upload profile picture
- [ ] Fill out "What I do" section
- [ ] Add pronouns (optional)
- [ ] Set timezone

### 11:00 AM - 12:00 PM: Repository Setup

#### Git Configuration
- [ ] Clone main repository:
  ```bash
  git clone git@github.com:Delqhi/SIN-Solver.git
  cd SIN-Solver
  ```
- [ ] Configure Git user:
  ```bash
  git config user.name "Your Name"
  git config user.email "your.email@delqhi.com"
  ```
- [ ] Verify SSH key:
  ```bash
  ssh -T git@github.com
  # Should see: "Hi username! You've successfully authenticated..."
  ```

#### Repository Exploration
- [ ] Review README.md
- [ ] Check repository structure
- [ ] Look at recent commits: `git log --oneline -20`
- [ ] Identify main branches: `git branch -a`

---

## ✅ Afternoon: Documentation & Meetings (1:00 PM - 5:00 PM)

### 1:00 PM - 2:00 PM: Required Reading

#### Must Read (30 minutes)
- [ ] [README.md](../../README.md) - Project overview
- [ ] [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) - Team values
- [ ] [CONTRIBUTING.md](../../CONTRIBUTING.md) - How we work

#### Bookmark for Later (30 minutes)
- [ ] [Docs Index](../DOCS.md) - All documentation
- [ ] [26-Pillar Index](../26-PILLAR-INDEX.md) - Service documentation
- [ ] [API Reference](../API-REFERENCE.md) - API documentation

### 2:00 PM - 3:00 PM: Meet Your Buddy

#### Meeting Agenda
- [ ] Introductions and background sharing
- [ ] Overview of first week's tasks
- [ ] High-level codebase walkthrough
- [ ] Q&A about tools and processes
- [ ] Schedule daily standup/check-in time
- [ ] Exchange contact information

#### Questions to Ask Your Buddy
- [ ] What's the best way to get help when stuck?
- [ ] What are the team's working hours?
- [ ] Are there any team rituals I should know about?
- [ ] What's the most important thing for me to learn first?
- [ ] Who else should I meet this week?

### 3:00 PM - 4:00 PM: Team Introductions

#### Schedule 1:1s (15 min each)
- [ ] Meet with Platform Team Lead
- [ ] Meet with your direct teammates
- [ ] Meet with 1-2 people from other teams

#### Introduction Message Template
Post in `#general`:
```
👋 Hello team! I'm [Your Name], joining as [Role].

🎯 Excited to work on: [Brief description]
💻 Background: [1-2 sentences]
🎮 Fun fact: [Something interesting]
☕ Coffee/tea preference: [Your preference]

Looking forward to learning from everyone! 🚀
```

### 4:00 PM - 5:00 PM: Tool Installation (Start)

#### Install Homebrew
- [ ] Run installation command:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```
- [ ] Add to PATH:
  ```bash
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  eval "$(/opt/homebrew/bin/brew shellenv)"
  ```

#### Install Core Tools
- [ ] Git: `brew install git`
- [ ] Docker Desktop: `brew install --cask docker`
- [ ] VS Code: `brew install --cask visual-studio-code`
- [ ] iTerm2: `brew install --cask iterm2`

#### Modern CLI Tools (Optional but Recommended)
- [ ] ripgrep: `brew install ripgrep`
- [ ] fd: `brew install fd`
- [ ] sd: `brew install sd`
- [ ] bat: `brew install bat`
- [ ] exa: `brew install exa`

---

## ✅ End of Day Checklist

### Completed Tasks
- [ ] All accounts created and accessible
- [ ] Slack channels joined
- [ ] Repository cloned
- [ ] Buddy meeting completed
- [ ] Team introductions started
- [ ] Tool installation begun

### Questions/Blockers
Document any questions or blockers:
- _________________________________
- _________________________________
- _________________________________

### Tomorrow's Plan
- [ ] Complete tool installation
- [ ] Set up Docker environment
- [ ] Install Python and Node.js
- [ ] Configure development environment

---

## 📋 Day 1 Sign-Off

**New Hire:**
- [ ] I have completed all Day 1 tasks
- [ ] I know who to ask for help
- [ ] I understand the first week's goals

**Buddy:**
- [ ] New hire has all necessary access
- [ ] All questions answered or escalated
- [ ] Daily check-ins scheduled

**Manager:**
- [ ] Welcome completed
- [ ] Expectations set
- [ ] First week plan reviewed

---

## 📞 Day 1 Contacts

| Role | Name | Slack | Email |
|------|------|-------|-------|
| **Buddy** | | | |
| **Manager** | | | |
| **IT Support** | | #help | |
| **HR Contact** | | | |

---

## 📚 Quick Reference

### Important URLs
- **Slack:** https://delqhi.slack.com
- **GitHub:** https://github.com/Delqhi/SIN-Solver
- **Dashboard:** https://dashboard.delqhi.com
- **Vault:** https://vault.delqhi.com
- **n8n:** https://n8n.delqhi.com

### Useful Commands
```bash
# Git
git status                    # Check repository status
git log --oneline -10         # View recent commits
git branch                    # List branches

# Docker
docker --version              # Check Docker version
docker ps                     # List running containers
docker-compose --version      # Check Docker Compose

# System
sw_vers -productVersion       # Check macOS version
df -h /                       # Check disk space
system_profiler SPHardwareDataType | grep Memory  # Check RAM
```

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-30  
**Next Review:** 2026-04-30
