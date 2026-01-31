# Week 1 Onboarding Goals

**New Hire:** _____________________  
**Week Starting:** _____________________  
**Role:** _____________________  
**Buddy:** _____________________  

---

## 🎯 Week 1 Overview

**Primary Goal:** Complete your first Pull Request and understand the basic development workflow.

**Success Criteria:**
- [ ] Development environment fully configured
- [ ] First code change completed and tested
- [ ] Pull Request created, reviewed, and merged
- [ ] Basic understanding of the codebase structure

**Time Estimate:** 40 hours (5 days × 8 hours)

---

## 📅 Day-by-Day Breakdown

### Day 1: Welcome & Setup
**Focus:** Accounts, access, initial setup

- [ ] Complete [Day 1 Checklist](./day-1-checklist.md)
- [ ] Meet with manager and buddy
- [ ] Join all required Slack channels
- [ ] Set up GitHub access
- [ ] Begin tool installation

**Deliverables:**
- [ ] All accounts accessible
- [ ] Slack profile complete
- [ ] Repository cloned
- [ ] Team introductions made

---

### Day 2: Development Environment (Part 1)
**Focus:** Tool installation and configuration

#### Morning (4 hours)
- [ ] Complete tool installation:
  - [ ] Homebrew
  - [ ] Docker Desktop
  - [ ] VS Code with extensions
  - [ ] Python 3.11
  - [ ] Node.js 20
  - [ ] Modern CLI tools (ripgrep, fd, sd, bat, exa)

- [ ] Configure Git:
  ```bash
  git config user.name "Your Name"
  git config user.email "your.email@delqhi.com"
  git config --global init.defaultBranch main
  ```

#### Afternoon (4 hours)
- [ ] Set up Python virtual environment:
  ```bash
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  pip install -r requirements-dev.txt
  ```

- [ ] Install Node.js dependencies:
  ```bash
  cd dashboard
  npm install
  cd ..
  ```

- [ ] Configure environment variables:
  ```bash
  cp .env.example .env
  # Edit .env with your settings
  ```

**Deliverables:**
- [ ] All tools installed and verified
- [ ] Python environment ready
- [ ] Node.js dependencies installed
- [ ] Environment configured

---

### Day 3: Development Environment (Part 2)
**Focus:** Docker setup and verification

#### Morning (4 hours)
- [ ] Create Docker network:
  ```bash
  docker network create sin-net --subnet=172.20.0.0/16
  ```

- [ ] Start infrastructure services:
  ```bash
  docker-compose -f docker-compose.infrastructure.yml up -d
  ```

- [ ] Verify services are running:
  ```bash
  docker-compose -f docker-compose.infrastructure.yml ps
  ```

- [ ] Run database migrations:
  ```bash
  alembic upgrade head
  ```

#### Afternoon (4 hours)
- [ ] Run verification script:
  ```bash
  ./scripts/verify-setup.sh
  ```

- [ ] Fix any issues that arise
- [ ] Document any workarounds in personal notes
- [ ] Test application startup:
  ```bash
  python -m uvicorn app.main:app --reload
  ```

- [ ] Verify health endpoint:
  ```bash
  curl http://localhost:8000/health
  ```

**Deliverables:**
- [ ] Docker environment running
- [ ] All services healthy
- [ ] Application starts locally
- [ ] Verification script passes

---

### Day 4: First Code Change
**Focus:** Understanding the codebase and making first change

#### Morning (4 hours)
- [ ] Study project structure:
  - [ ] Review `app/` directory structure
  - [ ] Understand `app/api/routes.py`
  - [ ] Review `app/services/` organization
  - [ ] Look at test structure in `tests/`

- [ ] Read relevant documentation:
  - [ ] [API Reference](../API-REFERENCE.md)
  - [ ] [Architecture Guide](../../ARCHITECTURE-MODULAR.md)

#### Afternoon (4 hours)
- [ ] Create feature branch:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feature/hello-world-endpoint
  ```

- [ ] Implement "Hello World" endpoint:
  - [ ] Edit `app/api/routes.py`
  - [ ] Add `/hello` endpoint
  - [ ] Include timestamp and version

- [ ] Add unit test:
  - [ ] Create `tests/unit/test_hello.py`
  - [ ] Test status code 200
  - [ ] Test response structure

- [ ] Run tests locally:
  ```bash
  pytest tests/unit/test_hello.py -v
  ```

**Deliverables:**
- [ ] Feature branch created
- [ ] Hello World endpoint implemented
- [ ] Unit test added and passing
- [ ] Code follows style guide

---

### Day 5: Pull Request
**Focus:** Code quality, PR creation, and review process

#### Morning (4 hours)
- [ ] Run code quality checks:
  ```bash
  black app/ tests/
  flake8 app/ tests/
  mypy app/
  ```

- [ ] Run full test suite:
  ```bash
  pytest
  ```

- [ ] Check test coverage:
  ```bash
  pytest --cov=app --cov-report=html
  open htmlcov/index.html
  ```

- [ ] Commit changes:
  ```bash
  git add app/api/routes.py
  git add tests/unit/test_hello.py
  git commit -m "feat(api): add hello world endpoint for onboarding

  - Add /hello endpoint that returns welcome message
  - Include timestamp and version in response
  - Add unit test for the endpoint

  Closes: SWARM-18"
  ```

- [ ] Push to remote:
  ```bash
  git push origin feature/hello-world-endpoint
  ```

#### Afternoon (4 hours)
- [ ] Create Pull Request on GitHub:
  - [ ] Fill out PR template completely
  - [ ] Add clear description
  - [ ] Include testing notes
  - [ ] Request review from buddy

- [ ] Address review feedback:
  - [ ] Respond to comments promptly
  - [ ] Make requested changes
  - [ ] Push updates

- [ ] Get PR approved and merged:
  - [ ] At least 1 approval
  - [ ] All CI checks passing
  - [ ] No merge conflicts
  - [ ] Squash and merge

**Deliverables:**
- [ ] All quality checks passing
- [ ] PR created with proper description
- [ ] Review feedback addressed
- [ ] PR merged to main

---

## 📊 Week 1 Success Metrics

### Technical Goals
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Tools installed | 100% | | |
| Tests passing | 100% | | |
| Code coverage | >80% | | |
| PR merged | 1 | | |

### Knowledge Goals
| Topic | Understanding Level | Status |
|-------|-------------------|--------|
| Project structure | Can navigate independently | |
| Git workflow | Can create branch, commit, push | |
| Docker basics | Can start/stop services | |
| Testing | Can write and run tests | |
| Code review | Understands feedback and responds | |

---

## 📚 Learning Resources (Week 1)

### Required Reading
- [ ] [README.md](../../README.md) - Project overview
- [ ] [CONTRIBUTING.md](../../CONTRIBUTING.md) - Development workflow
- [ ] [ARCHITECTURE-MODULAR.md](../../ARCHITECTURE-MODULAR.md) - System design
- [ ] [API Reference](../API-REFERENCE.md) - API documentation

### Optional Deep Dives
- [ ] [SIN-SOLVER-OPERATIONAL-GUIDE.md](../SIN-SOLVER-OPERATIONAL-GUIDE.md)
- [ ] [26-Pillar Index](../26-PILLAR-INDEX.md)
- [ ] [Docker Documentation](https://docs.docker.com/get-started/)
- [ ] [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)

---

## 🎓 Skills to Develop

### Technical Skills
- [ ] **Git workflow** - Branching, committing, PRs
- [ ] **Docker** - Containers, compose, networking
- [ ] **Python** - FastAPI, async/await, type hints
- [ ] **Testing** - pytest, fixtures, mocking
- [ ] **Code quality** - Black, flake8, mypy

### Soft Skills
- [ ] **Asking questions** - When and how to ask for help
- [ ] **Receiving feedback** - Responding to code review
- [ ] **Documentation** - Writing clear commit messages
- [ ] **Communication** - Slack etiquette, status updates

---

## 🚧 Common Week 1 Blockers

| Blocker | Solution | Escalation |
|---------|----------|------------|
| Docker won't start | Check Docker Desktop is running | Buddy → #help |
| Port already in use | Find and kill process | Buddy → #help |
| Tests failing | Check environment setup | Buddy → Team Lead |
| Git permission denied | Verify SSH key setup | Buddy → IT |
| Dependencies won't install | Check Python/Node versions | Buddy → #help |

---

## 📅 Week 1 Schedule Template

### Daily Standup (15 min)
**Time:** 9:30 AM  
**Format:** What I did yesterday, what I'm doing today, any blockers

### Buddy Check-in (30 min)
**Time:** 4:00 PM daily  
**Topics:** Progress, questions, tomorrow's plan

### Team Meetings
- **Engineering Standup:** Daily 10:00 AM
- **Sprint Planning:** Monday 11:00 AM
- **Demo Day:** Friday 3:00 PM

---

## ✅ Week 1 Completion Checklist

### Environment Setup
- [ ] All development tools installed
- [ ] Docker environment running
- [ ] Application starts locally
- [ ] Tests run successfully

### Code Contribution
- [ ] First feature branch created
- [ ] Code change implemented
- [ ] Tests added and passing
- [ ] Code quality checks pass
- [ ] PR created and merged

### Knowledge Acquisition
- [ ] Understand project structure
- [ ] Know how to run tests
- [ ] Can start/stop Docker services
- [ ] Understand PR workflow

### Team Integration
- [ ] Met all team members
- [ ] Participated in standups
- [ ] Asked questions when stuck
- [ ] Shared learnings with team

---

## 📝 Week 1 Retrospective

### What Went Well
- _________________________________
- _________________________________
- _________________________________

### What Was Challenging
- _________________________________
- _________________________________
- _________________________________

### Questions for Week 2
- _________________________________
- _________________________________

### Feedback for Onboarding Process
- _________________________________
- _________________________________

---

## 🎯 Looking Ahead: Week 2

**Primary Goal:** First deployment to staging environment

**Key Activities:**
- Monitor your merged PR in staging
- Learn deployment process
- Understand monitoring and alerting
- Start on first real feature

**Preparation:**
- [ ] Review deployment documentation
- [ ] Access staging environment
- [ ] Understand monitoring dashboards

---

## 📞 Week 1 Support Contacts

| Role | Name | Slack | Best For |
|------|------|-------|----------|
| **Buddy** | | | Daily questions, code review |
| **Manager** | | | Career, blockers, feedback |
| **Team Lead** | | | Technical decisions, architecture |
| **Platform Team** | | #platform | Docker, infrastructure |
| **Help Channel** | | #help | General questions |

---

## 📚 Quick Reference Commands

```bash
# Daily workflow
git checkout main
git pull origin main
git checkout -b feature/name
# ... make changes ...
git add .
git commit -m "feat: description"
git push origin feature/name

# Testing
pytest                        # Run all tests
pytest -v                     # Verbose
pytest -k test_name           # Specific test
pytest --cov=app              # With coverage

# Docker
docker-compose up -d          # Start services
docker-compose down           # Stop services
docker-compose logs -f        # Follow logs
docker-compose ps             # List services

# Code quality
black app/ tests/             # Format
flake8 app/ tests/            # Lint
mypy app/                     # Type check

# Application
python -m uvicorn app.main:app --reload  # Start dev server
curl http://localhost:8000/health        # Health check
```

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-30  
**Next Review:** 2026-04-30
