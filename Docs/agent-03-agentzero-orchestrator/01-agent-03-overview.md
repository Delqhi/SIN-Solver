# 01-agent-03-overview.md

## Agent 03: Agent Zero Orchestrator

**Service Name:** `agent-03-agentzero-orchestrator`  
**Public URL:** `https://codeserver.delqhi.com`  
**Internal Port:** `8050`  
**Category:** Agent (AI Workers)  
**Status:** ✅ Active  
**Last Updated:** 2026-01-30

---

## Executive Summary

The **Agent Zero Orchestrator** (`agent-03-agentzero-orchestrator`) is an advanced AI-powered code generation and development assistant service within the SIN-Solver platform. Built on the Agent Zero framework, this service provides autonomous coding capabilities, intelligent code analysis, and automated software development workflows.

Agent Zero represents the next generation of AI-assisted development, combining large language models with specialized coding tools to enable autonomous software creation, debugging, refactoring, and maintenance. It serves as the primary AI coding assistant for the entire SIN-Solver ecosystem.

---

## Service Identity

| Attribute | Value |
|-----------|-------|
| **Container Name** | `agent-03-agentzero-orchestrator` |
| **Service Name** | `agentzero` |
| **Internal Hostname** | `agent-03-agentzero-orchestrator` |
| **Internal Port** | `8050` |
| **Public Domain** | `codeserver.delqhi.com` |
| **Docker Network** | `sin-network` |
| **Category** | Agent (AI Workers) |

---

## Key Capabilities

### 1. Autonomous Code Generation
- Full-stack application development
- API endpoint creation
- Database schema design
- Frontend component generation

### 2. Intelligent Code Analysis
- Static code analysis
- Security vulnerability detection
- Performance bottleneck identification
- Code quality assessment

### 3. Automated Refactoring
- Legacy code modernization
- Language migration (e.g., Python 2 to 3)
- Framework upgrades
- Design pattern implementation

### 4. Debugging Assistance
- Error analysis and diagnosis
- Stack trace interpretation
- Root cause identification
- Fix suggestion and implementation

### 5. Documentation Generation
- API documentation (OpenAPI/Swagger)
- Code comments and docstrings
- README and wiki generation
- Architecture diagrams

---

## Use Cases

- **Rapid Prototyping:** Generate MVPs in hours instead of days
- **Code Reviews:** Automated quality checks and suggestions
- **Legacy Modernization:** Upgrade outdated codebases automatically
- **Learning Assistant:** Help developers understand complex code
- **Maintenance Automation:** Automated bug fixes and updates

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  codeserver.delqhi.com                      │
│                  (Public Access)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         agent-03-agentzero-orchestrator (Port 8050)         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │   Web UI    │  │  API Server  │  │  Code Executor      │ │
│  │  (React)    │  │   (FastAPI)  │  │  (Sandbox)          │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  AI Engine  │  │   Session    │  │  File System        │ │
│  │  (LLM)      │  │   Manager    │  │  (Workspace)        │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis     │  │    Vault     │
│  (Sessions)  │  │   (Cache)    │  │  (Secrets)   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Dependencies

### Required Dependencies

| Service | Purpose | Criticality |
|---------|---------|-------------|
| `room-03-archiv-postgres` | Session storage | **Critical** |
| `room-04-memory-redis` | Cache & queue | **Critical** |
| `room-02-tresor-vault` | Secrets management | High |

### Optional Dependencies

| Service | Purpose | Usage |
|---------|---------|-------|
| `agent-01-n8n-manager` | Workflow integration | Optional |
| `room-13-api-brain` | API gateway | Recommended |

---

## Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | DOC-AGENT-03-001 |
| **Version** | 1.0.0 |
| **Author** | SIN-Solver Documentation Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
