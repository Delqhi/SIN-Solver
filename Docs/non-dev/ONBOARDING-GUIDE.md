# 🚀 SIN-Solver Developer Onboarding Guide

**Document Type:** 26-Pillar Enterprise Onboarding Guide  
**Target Audience:** New Team Members (Junior to Senior)  
**Last Updated:** 2026-01-30  
**Version:** 1.0.0  
**Estimated Time to Complete:** 4-6 weeks (self-paced)  

---

## 📋 Table of Contents

1. [Welcome to SIN-Solver](#1-welcome-to-sin-solver)
2. [Day 1: Setup & Accounts](#2-day-1-setup--accounts)
3. [Day 2-3: Development Environment](#3-day-2-3-development-environment)
4. [Day 4-5: First Code Change](#4-day-4-5-first-code-change)
5. [Week 1: First Pull Request](#5-week-1-first-pull-request)
6. [Week 2: First Deployment](#6-week-2-first-deployment)
7. [Week 3: Architecture Deep Dive](#7-week-3-architecture-deep-dive)
8. [Week 4: MCPs & Tooling](#8-week-4-mcps--tooling)
9. [Month 1: Troubleshooting & Operations](#9-month-1-troubleshooting--operations)
10. [Team Structure & RACI](#10-team-structure--raci)
11. [Resources & Quick Links](#11-resources--quick-links)

---

## 1. Welcome to SIN-Solver

### 1.1 What is SIN-Solver?

SIN-Solver is an **enterprise-grade AI automation platform** that orchestrates multiple specialized agents and workers to solve complex tasks at scale. Think of it as a distributed brain with specialized workers:

- **n8n** - The workflow orchestrator (like Zapier on steroids)
- **Agent Zero** - AI code generation specialist
- **Steel Browser** - Stealth web automation expert
- **Skyvern** - Visual AI automation wizard
- **Scira AI** - Enterprise search engine
- **Captcha Worker** - CAPTCHA solving specialist
- **Survey Worker** - Survey automation expert

### 1.2 The 26-Room Architecture

Our platform is built on a **modular container architecture** where each "room" is a specialized Docker container:

```
┌─────────────────────────────────────────────────────────────┐
│                   SIN-SOLVER PLATFORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🎯 ORCHESTRATION LAYER                                      │
│  ├─ agent-01-n8n (Workflows)                                │
│  ├─ agent-03-agentzero (AI Coding)                          │
│  └─ room-30-scira-ai-search (Search)                        │
│                                                              │
│  🤖 EXECUTION LAYER                                          │
│  ├─ agent-05-steel (Stealth Browser)                        │
│  ├─ agent-06-skyvern (Visual AI)                            │
│  ├─ solver-1.1-captcha-worker (CAPTCHA)                     │
│  └─ solver-2.1-survey-worker (Surveys)                      │
│                                                              │
│  🏗️ INFRASTRUCTURE LAYER                                     │
│  ├─ room-02-vault (Secrets)                                 │
│  ├─ room-03-postgres (Database)                             │
│  ├─ room-04-redis (Cache)                                   │
│  └─ room-13-api-brain (Gateway)                             │
│                                                              │
│  📊 MONITORING LAYER                                         │
│  ├─ room-26-grafana (Dashboard)                             │
│  ├─ room-25-prometheus (Metrics)                            │
│  ├─ room-28-loki (Logs)                                     │
│  └─ room-29-jaeger (Tracing)                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Your First Week at a Glance

| Day | Focus | Key Activities | Success Criteria |
|-----|-------|----------------|------------------|
| **Day 1** | Setup | Accounts, access, tools | Can log into all systems |
| **Day 2-3** | Environment | Docker, IDE, local setup | Can run `docker-compose up` |
| **Day 4-5** | Hello World | First code change | Successfully modified code |
| **Week 1** | First PR | Create, review, merge | PR merged to main |
| **Week 2** | Deployment | Staging deployment | Service deployed successfully |
| **Week 3** | Architecture | Deep dive into 26 rooms | Can explain all services |
| **Week 4** | MCPs | Tool integration | Can use MCP tools |
| **Month 1** | Operations | Troubleshooting, on-call | Can handle common issues |

### 1.4 Onboarding Philosophy

> **"Learn by doing, document as you go, ask early and often."**

We believe in:
- **Hands-on learning** - You'll write code in your first week
- **Documentation culture** - If it's not documented, it doesn't exist
- **Psychological safety** - No stupid questions, only learning opportunities
- **Mentorship** - Every new hire gets a buddy

---

## 2. Day 1: Setup & Accounts

### 2.1 Pre-Arrival Checklist (HR/IT)

Before your first day, ensure you have:

- [ ] **Laptop configured** (MacBook Pro M1/M2/M3 recommended)
- [ ] **Email account** created (@delqhi.com)
- [ ] **Slack invitation** sent
- [ ] **GitHub organization** invitation
- [ ] **VPN access** configured (if remote)

### 2.2 Account Setup (First 2 Hours)

#### Step 1: Essential Accounts

| Service | Purpose | URL | Setup Time |
|---------|---------|-----|------------|
| **Slack** | Team communication | https://delqhi.slack.com | 15 min |
| **GitHub** | Code repository | https://github.com/Delqhi | 10 min |
| **Grafana** | Monitoring dashboard | https://dashboard.delqhi.com | 5 min |
| **Vault** | Secrets management | https://vault.delqhi.com | 10 min |
| **n8n** | Workflow automation | https://n8n.delqhi.com | 5 min |

#### Step 2: Slack Channels to Join

**Required Channels:**
- `#general` - Company-wide announcements
- `#engineering` - Engineering team discussions
- `#sin-solver` - Platform-specific discussions
- `#deployments` - Deployment notifications
- `#incidents` - Incident response

**Optional but Recommended:**
- `#random` - Water cooler chat
- `#help` - Ask anything
- `#onboarding` - New hire questions
- `#docs` - Documentation discussions

#### Step 3: GitHub Repository Access

```bash
# 1. Accept GitHub organization invitation
# 2. Set up SSH key (if not already done)
ssh-keygen -t ed25519 -C "your.email@delqhi.com"
cat ~/.ssh/id_ed25519.pub  # Add to GitHub Settings > SSH Keys

# 3. Clone the main repository
git clone git@github.com:Delqhi/SIN-Solver.git
cd SIN-Solver

# 4. Verify access
git remote -v
# Should show: origin  git@github.com:Delqhi/SIN-Solver.git
```

#### Step 4: Slack Introduction

Post in `#general`:

```
👋 Hello team! I'm [Your Name], joining as [Role].

🎯 Excited to work on: [Brief description of what you'll be working on]
💻 Background: [1-2 sentences about your experience]
🎮 Fun fact: [Something interesting about you]

Looking forward to learning from everyone! 🚀
```

### 2.3 Meet Your Onboarding Buddy

Every new hire is assigned an **onboarding buddy** (usually a senior engineer). Your buddy will:

- Schedule daily check-ins for the first week
- Answer questions about tools and processes
- Review your first PR
- Help you navigate the codebase

**First Meeting Agenda (30 minutes):**
1. Introductions and background
2. Overview of your first week's tasks
3. Codebase walkthrough (high-level)
4. Q&A about tools and processes
5. Schedule daily standup time

### 2.4 Required Reading (Day 1)

**Must Read (30 minutes):**
1. [README.md](../README.md) - Project overview
2. [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) - Team values
3. [CONTRIBUTING.md](../CONTRIBUTING.md) - How we work
4. [ARCHITECTURE-MODULAR.md](../ARCHITECTURE-MODULAR.md) - System design

**Bookmark for Later:**
- [Docs Index](./DOCS.md) - All documentation
- [26-Pillar Index](./26-PILLAR-INDEX.md) - Service documentation
- [API Reference](./API-REFERENCE.md) - API documentation

### 2.5 Day 1 Checklist

See [day-1-checklist.md](./onboarding/day-1-checklist.md) for the complete checklist.

---

## 3. Day 2-3: Development Environment

### 3.1 Prerequisites

Before setting up, ensure you have:

```bash
# Check macOS version (should be 13.0+)
sw_vers -productVersion

# Check available disk space (need 50GB+)
df -h /

# Check RAM (16GB recommended, 8GB minimum)
system_profiler SPHardwareDataType | grep Memory
```

### 3.2 Tool Installation

#### Step 1: Homebrew (Package Manager)

```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add to PATH
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

#### Step 2: Core Development Tools

```bash
# Install essential tools
brew install git
brew install docker
brew install docker-compose
brew install node
brew install python@3.11
brew install visual-studio-code
brew install iterm2

# Modern CLI tools (per MANDATE 0.19)
brew install ripgrep      # 60x faster than grep
brew install fd           # 15x faster than find
brew install sd           # 10x faster than sed
brew install bat          # Better cat with syntax highlighting
brew install exa          # Better ls with git integration
```

#### Step 3: Docker Desktop

```bash
# Install Docker Desktop for Mac (M1 native)
brew install --cask docker

# Start Docker Desktop
open /Applications/Docker.app

# Verify installation
docker version | grep Architecture  # Should show: linux/arm64
docker-compose version
```

#### Step 4: Python Environment

```bash
# Install pyenv for Python version management
brew install pyenv

# Add to ~/.zshrc
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc
source ~/.zshrc

# Install Python 3.11
pyenv install 3.11.6
pyenv global 3.11.6

# Verify
python --version  # Python 3.11.6
```

#### Step 5: Node.js Environment

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.zshrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # v20.x.x
npm --version
```

#### Step 6: VS Code Extensions

```bash
# Install VS Code extensions
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension eamodio.gitlens
code --install-extension ms-vscode-remote.remote-containers
```

### 3.3 Repository Setup

#### Step 1: Clone and Configure

```bash
# Navigate to development directory
cd ~/dev

# Clone the repository
git clone git@github.com:Delqhi/SIN-Solver.git
cd SIN-Solver

# Set up Git configuration
git config user.name "Your Name"
git config user.email "your.email@delqhi.com"

# Install pre-commit hooks
brew install pre-commit
pre-commit install
```

#### Step 2: Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env

# Required variables to set:
# - GOOGLE_GEMINI_API_KEY (get from Vault)
# - DATABASE_URL (for local development)
# - REDIS_URL (for local development)
```

#### Step 3: Python Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Verify key packages
pip show fastapi
pip show uvicorn
pip show sqlalchemy
```

#### Step 4: Node.js Dependencies

```bash
# Install dashboard dependencies
cd dashboard
npm install

# Verify installation
npm run build  # Should complete without errors
cd ..
```

### 3.4 Docker Environment Setup

#### Step 1: Create Docker Network

```bash
# Create the main network
docker network create sin-net --subnet=172.20.0.0/16 || true

# Verify
docker network ls | grep sin-net
```

#### Step 2: Start Infrastructure Services

```bash
# Start core infrastructure
docker-compose -f docker-compose.infrastructure.yml up -d

# Wait for services to be healthy
sleep 10

# Verify all services are running
docker-compose -f docker-compose.infrastructure.yml ps
```

#### Step 3: Database Setup

```bash
# Run database migrations
alembic upgrade head

# Seed initial data (if applicable)
python scripts/seed_database.py

# Verify database connection
python -c "from app.database import engine; print('Database connected!')"
```

### 3.5 Verify Your Setup

Run the complete verification script:

```bash
# Make script executable
chmod +x scripts/verify-setup.sh

# Run verification
./scripts/verify-setup.sh
```

**Expected Output:**
```
✅ Git configured
✅ Docker running
✅ Python 3.11+ installed
✅ Node.js 20+ installed
✅ Dependencies installed
✅ Database connected
✅ Redis connected
✅ All services healthy

🎉 Setup complete! You're ready to code.
```

### 3.6 Common Setup Issues

| Issue | Solution |
|-------|----------|
| Docker "Cannot connect" | Start Docker Desktop: `open /Applications/Docker.app` |
| Python version mismatch | Use pyenv: `pyenv local 3.11.6` |
| Port already in use | Kill process: `lsof -ti:8000 \| xargs kill -9` |
| Permission denied | Fix with: `sudo chown -R $(whoami) ~/.docker` |
| Database connection failed | Check Docker: `docker logs postgres-sin` |

### 3.7 Development Environment Checklist

- [ ] All tools installed (see checklist above)
- [ ] Repository cloned and configured
- [ ] Docker network created
- [ ] Infrastructure services running
- [ ] Database migrations applied
- [ ] Application starts locally
- [ ] Tests pass locally

---

## 4. Day 4-5: First Code Change

### 4.1 Understanding the Codebase

#### Project Structure Overview

```
SIN-Solver/
├── 📁 app/                          # Main application code
│   ├── api/                         # API routes
│   ├── core/                        # Core utilities
│   ├── models/                      # Database models
│   ├── services/                    # Business logic
│   └── main.py                      # Application entry
│
├── 📁 dashboard/                    # Next.js dashboard
│   ├── src/
│   │   ├── components/              # React components
│   │   ├── pages/                   # Next.js pages
│   │   └── styles/                  # CSS/Tailwind
│   └── package.json
│
├── 📁 Docker/                       # Docker configurations
│   ├── agents/                      # Agent containers
│   ├── rooms/                       # Infrastructure containers
│   └── solvers/                     # Worker containers
│
├── 📁 docs/                         # Documentation
│   ├── dev/                         # Developer docs
│   ├── non-dev/                     # User docs
│   └── project/                     # Project management
│
├── 📁 tests/                        # Test suite
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── e2e/                         # End-to-end tests
│
└── 📁 scripts/                      # Utility scripts
```

#### Key Files to Know

| File | Purpose | When to Edit |
|------|---------|--------------|
| `app/main.py` | FastAPI application entry | Rarely |
| `app/api/routes.py` | API endpoint definitions | Often |
| `app/models/` | Database models | When adding entities |
| `app/services/` | Business logic | Most frequent |
| `docker-compose.yml` | Service definitions | When adding services |
| `requirements.txt` | Python dependencies | When adding packages |

### 4.2 Your First Task: "Hello World" API

#### Task Description

Create a simple "Hello World" endpoint to verify your setup and learn the workflow.

#### Step 1: Create a Branch

```bash
# Pull latest changes
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/hello-world-endpoint
```

#### Step 2: Add the Endpoint

Edit `app/api/routes.py`:

```python
@router.get("/hello")
async def hello_world():
    """
    Simple hello world endpoint for onboarding.
    
    Returns:
        dict: Welcome message with timestamp
    """
    return {
        "message": "Hello from SIN-Solver!",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION
    }
```

#### Step 3: Add a Test

Create `tests/unit/test_hello.py`:

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_hello_world():
    """Test the hello world endpoint."""
    response = client.get("/hello")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "Hello from SIN-Solver!" in data["message"]
    assert "timestamp" in data
```

#### Step 4: Run Tests Locally

```bash
# Run the specific test
pytest tests/unit/test_hello.py -v

# Expected output:
# tests/unit/test_hello.py::test_hello_world PASSED
```

#### Step 5: Test the Endpoint

```bash
# Start the application
python -m uvicorn app.main:app --reload

# In another terminal, test the endpoint
curl http://localhost:8000/hello

# Expected response:
# {"message":"Hello from SIN-Solver!","timestamp":"2026-01-30T...","version":"1.0.0"}
```

### 4.3 Code Quality Checks

Before committing, run all quality checks:

```bash
# Format code
black app/ tests/

# Lint code
flake8 app/ tests/

# Type checking
mypy app/

# Run all tests
pytest

# Check test coverage
pytest --cov=app --cov-report=html
```

### 4.4 Commit Your Changes

```bash
# Stage changes
git add app/api/routes.py
git add tests/unit/test_hello.py

# Commit with conventional commit format
git commit -m "feat(api): add hello world endpoint for onboarding

- Add /hello endpoint that returns welcome message
- Include timestamp and version in response
- Add unit test for the endpoint

Closes: SWARM-18"

# Push to remote
git push origin feature/hello-world-endpoint
```

### 4.5 First Code Change Checklist

- [ ] Branch created from latest main
- [ ] Code follows style guide (PEP 8)
- [ ] Tests added and passing
- [ ] Documentation updated (docstrings)
- [ ] All quality checks pass
- [ ] Changes committed with proper message
- [ ] Branch pushed to remote

---

## 5. Week 1: First Pull Request

### 5.1 Understanding Our PR Process

#### PR Workflow Overview

```
1. Create Branch → 2. Make Changes → 3. Open PR → 4. Code Review → 5. Merge
```

#### PR Requirements

- **Branch naming:** `feature/description`, `fix/description`, `docs/description`
- **Commit messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/)
- **Tests:** All changes must include tests
- **Documentation:** Update relevant docs
- **Reviewers:** At least 1 approval required

### 5.2 Creating Your First PR

#### Step 1: Open Pull Request

1. Go to GitHub repository
2. Click "Compare & pull request"
3. Fill in the PR template:

```markdown
## Description
Add hello world endpoint for new developer onboarding.

## Changes
- Added `/hello` endpoint to routes.py
- Added unit test in test_hello.py
- Updated API documentation

## Testing
- [x] Unit tests pass
- [x] Manual testing completed
- [x] Code quality checks pass

## Checklist
- [x] Code follows style guide
- [x] Tests added
- [x] Documentation updated
- [x] No breaking changes
```

#### Step 2: Request Review

- Assign your onboarding buddy as reviewer
- Add relevant team members
- Set appropriate labels (`enhancement`, `documentation`)

#### Step 3: Address Feedback

```bash
# Make requested changes
# ... edit files ...

# Commit fixes
git add .
git commit -m "fix: address review feedback

- Improve error handling
- Add additional test case
- Update docstring"

# Push updates (automatically updates PR)
git push origin feature/hello-world-endpoint
```

### 5.3 Code Review Guidelines

#### As an Author

- **Respond promptly** to review comments
- **Ask questions** if feedback is unclear
- **Explain your reasoning** for design decisions
- **Be open to feedback** - we're all learning

#### As a Reviewer (for future you)

- **Be constructive** - suggest improvements, don't just criticize
- **Explain the why** - help others learn
- **Approve when ready** - don't block unnecessarily
- **Check:** functionality, tests, documentation, style

### 5.4 Merging Your PR

Once approved:

1. Click "Squash and merge" (preferred for clean history)
2. Delete the feature branch
3. Celebrate! 🎉

### 5.5 First PR Checklist

- [ ] PR description filled out completely
- [ ] All CI checks passing
- [ ] At least 1 approval
- [ ] No merge conflicts
- [ ] Branch deleted after merge
- [ ] Changes verified in production

---

## 6. Week 2: First Deployment

### 6.1 Understanding Our Deployment Pipeline

#### Environments

| Environment | Purpose | URL | Access |
|-------------|---------|-----|--------|
| **Local** | Development | localhost:8000 | Everyone |
| **Staging** | Testing | https://staging.delqhi.com | Team |
| **Production** | Live | https://api.delqhi.com | Restricted |

#### Deployment Process

```
Code → PR → Merge → CI/CD → Staging → Manual Approval → Production
```

### 6.2 Deploying to Staging

#### Step 1: Verify Staging Environment

```bash
# Check staging health
curl https://staging.delqhi.com/health

# Expected: {"status": "healthy", ...}
```

#### Step 2: Deploy Your Changes

Deployments are handled automatically by CI/CD after merge:

1. Merge PR to `main`
2. GitHub Actions builds Docker image
3. Image pushed to registry
4. Staging automatically updated
5. Slack notification sent to `#deployments`

#### Step 3: Verify Deployment

```bash
# Test your endpoint on staging
curl https://staging.delqhi.com/hello

# Check logs
kubectl logs -f deployment/sin-solver -n staging

# Monitor metrics
open https://dashboard.delqhi.com/d/staging
```

### 6.3 Deployment Checklist

- [ ] Staging environment healthy
- [ ] Changes deployed successfully
- [ ] Functionality verified on staging
- [ ] No errors in logs
- [ ] Metrics look normal
- [ ] Team notified in `#deployments`

---

## 7. Week 3: Architecture Deep Dive

### 7.1 The 26 Rooms Explained

#### Category Overview

| Category | Count | Purpose | Examples |
|----------|-------|---------|----------|
| **Agents** | 10 | AI Workers | n8n, Agent Zero, Steel |
| **Rooms** | 10 | Infrastructure | Postgres, Redis, Vault |
| **Solvers** | 3 | Task Workers | Captcha, Survey |
| **Builders** | 1 | Content Creation | Website Worker |
| **Monitoring** | 5 | Observability | Grafana, Prometheus |

#### Service Deep Dive

**Agent 01: n8n (Workflow Orchestrator)**
- **Purpose:** Visual workflow automation
- **Port:** 5678
- **URL:** https://n8n.delqhi.com
- **Key Features:**
  - 200+ native integrations
  - Webhook triggers
  - Error handling & retries
  - Schedule-based execution

**Agent 03: Agent Zero (AI Coder)**
- **Purpose:** Autonomous code generation
- **Port:** 8050
- **URL:** https://codeserver.delqhi.com
- **Key Features:**
  - Multi-language support
  - Code analysis & refactoring
  - Debugging assistance
  - Documentation generation

**Room 02: Vault (Secrets Management)**
- **Purpose:** Secure credential storage
- **Port:** 8200
- **URL:** https://vault.delqhi.com
- **Key Features:**
  - Encryption at rest (AES-256)
  - Dynamic secrets
  - Secret rotation
  - Audit logging

### 7.2 Service Communication

```
┌────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  User Request                                              │
│       │                                                    │
│       ▼                                                    │
│  ┌─────────────────────┐                                   │
│  │  room-13-api-brain  │  ← API Gateway & Router           │
│  │  (Port 8000)        │                                   │
│  └─────────────────────┘                                   │
│       │                                                    │
│       ├──► agent-01-n8n (Workflows)                       │
│       ├──► agent-05-steel (Browser)                       │
│       ├──► solver-1.1-captcha (CAPTCHA)                   │
│       └──► room-03-postgres (Database)                    │
│                                                            │
│  All services use:                                         │
│  • room-04-redis (Cache)                                  │
│  • room-02-vault (Secrets)                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 7.3 Architecture Study Tasks

**Day 1:** Study 3 core services
- Read [26-Pillar Index](./26-PILLAR-INDEX.md)
- Pick 3 services relevant to your role
- Document their purpose and interactions

**Day 2:** Trace a request
- Pick a workflow or API endpoint
- Trace it through all services it touches
- Draw the data flow diagram

**Day 3:** Understand the data model
- Study the database schema
- Understand entity relationships
- Review migration files

**Day 4:** Explore monitoring
- Access Grafana dashboards
- Understand key metrics
- Learn alert thresholds

**Day 5:** Architecture presentation
- Present your learnings to your buddy
- Ask questions about unclear parts
- Document insights in team wiki

---

## 8. Week 4: MCPs & Tooling

### 8.1 What are MCPs?

**MCP (Model Context Protocol)** is how AI agents communicate with tools and services. Think of them as "APIs for AI."

#### MCP Types

| Type | Description | Example |
|------|-------------|---------|
| **Local** | Runs on your machine | File system access |
| **Remote** | HTTP API endpoint | Web search |
| **Docker** | Containerized service | Database queries |

### 8.2 Available MCPs

#### Core MCPs

| MCP | Purpose | Tools |
|-----|---------|-------|
| **tavily** | Web search | search, extract |
| **context7** | Documentation | query-docs |
| **skyvern** | Browser automation | browse, extract |
| **linear** | Project management | create_issue, list_issues |
| **serena** | Orchestration | delegate_task |

#### Custom MCPs

| MCP | Purpose | Location |
|-----|---------|----------|
| **sin_social** | Social media | http://localhost:8213 |
| **sin_research** | Deep research | http://localhost:8214 |
| **sin_video** | Video generation | http://localhost:8215 |

### 8.3 Using MCPs in Development

#### Example: Web Search MCP

```python
# Using Tavily MCP for research
async def research_topic(query: str):
    """Research a topic using Tavily search."""
    result = await mcp.tavily.search(
        query=query,
        max_results=5,
        include_domains=["github.com", "stackoverflow.com"]
    )
    return result
```

#### Example: Linear MCP

```python
# Creating an issue via Linear MCP
async def create_bug_report(title: str, description: str):
    """Create a bug report in Linear."""
    issue = await mcp.linear.create_issue(
        team="Engineering",
        title=title,
        description=description,
        priority=2,  # High
        labels=["bug", "onboarding"]
    )
    return issue
```

### 8.4 MCP Configuration

MCPs are configured in `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "tavily": {
      "type": "local",
      "command": ["npx", "@tavily/claude-mcp"],
      "enabled": true
    },
    "linear": {
      "type": "remote",
      "url": "https://mcp.linear.app/sse",
      "enabled": true
    }
  }
}
```

### 8.5 MCP Practice Tasks

**Task 1:** Use Tavily to research a technology
- Search for "FastAPI best practices 2026"
- Extract key findings
- Share in `#engineering`

**Task 2:** Create a Linear issue
- Use Linear MCP to create a task
- Assign it to yourself
- Move it through the workflow

**Task 3:** Explore Skyvern
- Use Skyvern to automate a simple web task
- Document the process
- Share learnings with team

---

## 9. Month 1: Troubleshooting & Operations

### 9.1 Common Issues & Solutions

#### Issue 1: Service Won't Start

```bash
# Check Docker logs
docker logs <container-name>

# Check port conflicts
lsof -ti:<port> | xargs kill -9

# Restart service
docker-compose restart <service-name>
```

#### Issue 2: Database Connection Failed

```bash
# Check if Postgres is running
docker ps | grep postgres

# Check logs
docker logs postgres-sin

# Verify connection string
python -c "from app.database import engine; print('OK')"
```

#### Issue 3: Tests Failing

```bash
# Run specific test with verbose output
pytest tests/unit/test_specific.py -vvs

# Check test database
pytest --reuse-db  # Don't recreate DB

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

### 9.2 Debugging Techniques

#### Using Logs

```bash
# Follow logs in real-time
docker logs -f <container-name>

# Search for specific errors
docker logs <container-name> 2>&1 | grep ERROR

# View last 100 lines
docker logs --tail 100 <container-name>
```

#### Using Debugger

```python
# Add breakpoint in code
import pdb; pdb.set_trace()

# Or use ipdb for better experience
import ipdb; ipdb.set_trace()
```

### 9.3 Getting Help

#### Escalation Path

1. **Search documentation** - Check [DOCS.md](./DOCS.md)
2. **Ask in Slack** - `#help` channel
3. **Check troubleshooting** - [Troubleshooting Guide](./project/TROUBLESHOOTING.md)
4. **Ask your buddy** - Direct message
5. **Create Linear issue** - If it's a bug
6. **Schedule office hours** - With senior engineer

#### Information to Include

When asking for help, always include:
- What you were trying to do
- What you expected to happen
- What actually happened
- Error messages (full stack trace)
- Steps you've already tried

### 9.4 On-Call Rotation (Month 2+)

After your first month, you'll join the on-call rotation:

- **Primary:** First responder for incidents
- **Secondary:** Backup for primary
- **Shadow:** Learning (your role in Month 2)

**On-Call Responsibilities:**
- Respond to PagerDuty alerts within 15 minutes
- Triage and resolve or escalate
- Document all incidents
- Participate in post-mortems

---

## 10. Team Structure & RACI

### 10.1 Engineering Teams

```
┌─────────────────────────────────────────────────────────────┐
│                   ENGINEERING ORGANIZATION                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🎯 Platform Team (Infrastructure)                          │
│  ├─ Lead: [Name]                                            │
│  ├─ Focus: Docker, Kubernetes, CI/CD                        │
│  └─ Services: All infrastructure rooms                      │
│                                                              │
│  🤖 Agents Team (AI & Automation)                           │
│  ├─ Lead: [Name]                                            │
│  ├─ Focus: n8n, Agent Zero, MCPs                            │
│  └─ Services: agent-01, agent-03, MCPs                      │
│                                                              │
│  🔧 Workers Team (Task Execution)                           │
│  ├─ Lead: [Name]                                            │
│  ├─ Focus: Captcha, Survey, Browser automation              │
│  └─ Services: solver-1.1, solver-2.1, agent-05              │
│                                                              │
│  📊 Data Team (Storage & Analytics)                         │
│  ├─ Lead: [Name]                                            │
│  ├─ Focus: Postgres, Redis, Qdrant, Analytics               │
│  └─ Services: room-03, room-04, room-15                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 RACI Matrix

| Activity | Platform | Agents | Workers | Data | You |
|----------|----------|--------|---------|------|-----|
| **Infrastructure** | | | | | |
| Docker setup | R/A | C | C | C | I |
| CI/CD pipeline | R/A | C | C | C | I |
| **Development** | | | | | |
| Feature development | C | R/A | C | C | R/A |
| Code review | C | C | C | C | R/A |
| **Operations** | | | | | |
| Incident response | R/A | C | C | C | I |
| Monitoring setup | R/A | C | C | C | I |
| **Documentation** | | | | | |
| Technical docs | C | C | C | C | R/A |
| Runbooks | R/A | C | C | C | C |

**Legend:**
- **R** = Responsible (does the work)
- **A** = Accountable (approves)
- **C** = Consulted (provides input)
- **I** = Informed (kept updated)

### 10.3 Key Contacts

| Role | Name | Slack | Responsibility |
|------|------|-------|----------------|
| **CTO** | [Name] | @cto | Technical vision |
| **VP Engineering** | [Name] | @vp-eng | Engineering strategy |
| **Platform Lead** | [Name] | @platform-lead | Infrastructure |
| **Agents Lead** | [Name] | @agents-lead | AI & Automation |
| **Workers Lead** | [Name] | @workers-lead | Task execution |
| **Data Lead** | [Name] | @data-lead | Storage & Analytics |
| **Your Buddy** | [Name] | @your-buddy | Your onboarding guide |

---

## 11. Resources & Quick Links

### 11.1 Essential Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| **README.md** | Project overview | `/README.md` |
| **DOCS.md** | Documentation index | `/Docs/DOCS.md` |
| **API Reference** | API documentation | `/Docs/API-REFERENCE.md` |
| **Contributing Guide** | How to contribute | `/CONTRIBUTING.md` |
| **Architecture** | System design | `/ARCHITECTURE-MODULAR.md` |
| **Operational Guide** | Day-to-day ops | `/Docs/SIN-SOLVER-OPERATIONAL-GUIDE.md` |

### 11.2 Internal Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Dashboard** | https://dashboard.delqhi.com | Grafana monitoring |
| **API** | https://api.delqhi.com | REST API |
| **n8n** | https://n8n.delqhi.com | Workflow automation |
| **Vault** | https://vault.delqhi.com | Secrets management |
| **CodeServer** | https://codeserver.delqhi.com | AI coding assistant |
| **Scira** | https://scira.delqhi.com | AI search |
| **Steel** | https://steel.delqhi.com | Browser automation |
| **Skyvern** | https://skyvern.delqhi.com | Visual automation |

### 11.3 External Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| **GitHub** | https://github.com/Delqhi/SIN-Solver | Code repository |
| **Linear** | https://linear.app/delqhi | Project management |
| **Slack** | https://delqhi.slack.com | Team communication |
| **Notion** | https://notion.so/delqhi | Team wiki |
| **Figma** | https://figma.com/delqhi | Design files |

### 11.4 Learning Resources

| Topic | Resource | Time |
|-------|----------|------|
| **FastAPI** | https://fastapi.tiangolo.com | 2 hours |
| **Docker** | https://docs.docker.com/get-started | 3 hours |
| **n8n** | https://docs.n8n.io | 2 hours |
| **React/Next.js** | https://nextjs.org/docs | 4 hours |
| **PostgreSQL** | https://www.postgresql.org/docs | 3 hours |
| **Redis** | https://redis.io/docs | 1 hour |

### 11.5 Cheat Sheets

#### Git Commands

```bash
# Daily workflow
git checkout main
git pull origin main
git checkout -b feature/name
# ... make changes ...
git add .
git commit -m "feat: description"
git push origin feature/name

# Useful commands
git status                    # Check status
git log --oneline -10         # View recent commits
git diff                      # See changes
git stash                     # Save changes temporarily
git stash pop                 # Restore stashed changes
```

#### Docker Commands

```bash
# Daily workflow
docker-compose up -d          # Start services
docker-compose down           # Stop services
docker-compose logs -f        # Follow logs
docker-compose ps             # List running services

# Useful commands
docker ps                     # List all containers
docker logs <container>       # View container logs
docker exec -it <container> sh # Enter container
docker system prune           # Clean up unused resources
```

#### Python Commands

```bash
# Virtual environment
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
deactivate                    # Exit virtual environment

# Dependencies
pip install -r requirements.txt
pip install <package>
pip freeze > requirements.txt

# Testing
pytest                        # Run all tests
pytest -v                     # Verbose output
pytest -k test_name           # Run specific test
pytest --cov=app              # With coverage
```

---

## 🎓 Next Steps

### Immediate (This Week)

1. [ ] Complete Day 1 checklist
2. [ ] Set up development environment
3. [ ] Complete "Hello World" task
4. [ ] Create your first PR
5. [ ] Schedule 1:1s with team members

### Short Term (This Month)

1. [ ] Complete all onboarding documentation
2. [ ] Deploy your first change to staging
3. [ ] Understand the 26-room architecture
4. [ ] Complete MCP training
5. [ ] Contribute to documentation

### Long Term (3 Months)

1. [ ] Lead a feature from design to deployment
2. [ ] Mentor the next new hire
3. [ ] Contribute to architectural decisions
4. [ ] Present at team demo day
5. [ ] Become an expert in your domain

---

## 📞 Questions?

**Stuck?** Don't hesitate to ask:
- 💬 Slack: `#help` or your buddy
- 📧 Email: your.buddy@delqhi.com
- 📅 Calendar: Book office hours

**Remember:** Everyone was new once. There's no such thing as a stupid question!

---

## 📝 Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | DOC-ONBOARDING-001 |
| **Version** | 1.0.0 |
| **Author** | SIN-Solver Documentation Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Quarterly |
| **Next Review** | 2026-04-30 |

---

*Welcome to the team! We're excited to have you on board. 🚀*
