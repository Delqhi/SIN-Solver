# SIN-Solver Documentation

**Version:** 1.0.0  
**Last Updated:** 2026-01-30  
**Status:** Production Ready

---

## 📚 Documentation Structure

This project follows the **Trinity Documentation Standard** (MANDATE 0.16):

```
/projectname/
├── docs/
│   ├── non-dev/       # For Users: Guides, Tutorials, FAQs, Screenshots
│   ├── dev/           # For Coders: API Ref, Auth, Architecture, Setup
│   ├── project/       # For Team: Deployment, Changelog, Roadmap
│   └── postman/       # For Everyone: Hoppscotch/Postman Collections
├── DOCS.md            # THIS FILE - The Rulebook (Index & Standards)
└── README.md          # The Gateway (Points to everything)
```

---

## 📖 Documentation Categories

### 🚀 Getting Started
| Document | Description | Audience |
|----------|-------------|----------|
| [README.md](../README.md) | Project overview, quick start, main gateway | Everyone |
| [QUICKSTART.md](./QUICKSTART.md) | Get running in 5 minutes | New Users |
| [INSTALLATION.md](./INSTALLATION.md) | Detailed installation guide | Developers |
| [CONFIGURATION.md](./CONFIGURATION.md) | Configuration options | Developers |

### 🏗️ Architecture & Technical
| Document | Description | Audience |
|----------|-------------|----------|
| [SIN-SOLVER-TECHNICAL-ARCHITECTURE.md](./SIN-SOLVER-TECHNICAL-ARCHITECTURE.md) | System architecture & design | Architects |
| [AGENT-REFERENCE.md](./AGENT-REFERENCE.md) | Agent capabilities & usage | Developers |
| [WORKER-REFERENCE.md](./WORKER-REFERENCE.md) | Worker systems & task execution | Developers |
| [ARCHITECTURE-MODULAR.md](./ARCHITECTURE-MODULAR.md) | Modular container architecture | DevOps |
| [CONTAINER-REGISTRY.md](./CONTAINER-REGISTRY.md) | All containers with ports & domains | DevOps |

### 🔌 API & Integration
| Document | Description | Audience |
|----------|-------------|----------|
| [API-REFERENCE.md](./API-REFERENCE.md) | Complete REST API documentation | Developers |
| [INTEGRATION-GUIDE.md](./INTEGRATION-GUIDE.md) | Integration with external systems | Developers |
| [WEBHOOKS.md](./WEBHOOKS.md) | Webhook configuration & examples | Developers |

### 🚀 Operations & Deployment
| Document | Description | Audience |
|----------|-------------|----------|
| [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | Production deployment | DevOps |
| [SIN-SOLVER-OPERATIONAL-GUIDE.md](./SIN-SOLVER-OPERATIONAL-GUIDE.md) | Day-to-day operations | Operations |
| [MONITORING-SETUP.md](./MONITORING-SETUP.md) | Monitoring & alerting configuration | DevOps |

### 🛠️ Development
| Document | Description | Audience |
|----------|-------------|----------|
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution guidelines | Contributors |
| [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | Community standards | Everyone |
| [SECURITY.md](../SECURITY.md) | Security policy | Everyone |
| [AGENTS.md](../AGENTS.md) | Project conventions & agent rules | Developers |
| [SIN-Solver-lastchanges.md](../SIN-Solver-lastchanges.md) | Session tracking & history | Developers |

### 🧪 Training & ML
| Document | Description | Audience |
|----------|-------------|----------|
| [02-CAPTCHA-TRAINING-GUIDE.md](./02-CAPTCHA-TRAINING-GUIDE.md) | Comprehensive training guide | ML Engineers |
| [training/README.md](../training/README.md) | Training setup & usage | ML Engineers |
| [training/training-lastchanges.md](../training/training-lastchanges.md) | Training session logs | ML Engineers |

### 🐛 Troubleshooting & Support
| Document | Description | Audience |
|----------|-------------|----------|
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues & solutions | Everyone |
| [FAQ.md](./FAQ.md) | Frequently asked questions | Everyone |
| [SUPPORT.md](./SUPPORT.md) | Getting help & support channels | Everyone |

---

## 📋 Documentation Standards

### Writing Guidelines

1. **Clear and Concise**: Use simple language, avoid jargon
2. **Code Examples**: Include working code snippets
3. **Screenshots**: Add visuals for UI-related docs
4. **Step-by-Step**: Numbered instructions for procedures
5. **Cross-References**: Link to related documents

### File Naming Convention
- Use kebab-case: `my-document-name.md`
- Prefix with numbers for ordering: `01-overview.md`
- Use descriptive names: `api-authentication.md` not `auth.md`

### Required Sections
Every document should include:
1. **Title** - Clear, descriptive heading
2. **Description** - What this document covers
3. **Prerequisites** - What you need to know/have
4. **Main Content** - The actual documentation
5. **Examples** - Code snippets, screenshots
6. **References** - Links to related docs
7. **Changelog** - When and what changed

---

## 🔍 Quick Reference

### Container Quick Reference
| Container | Port | Domain | Purpose |
|-----------|------|--------|---------|
| agent-01-n8n | 5678 | n8n.delqhi.com | Workflow Orchestration |
| agent-03-agentzero | 8050 | agentzero.delqhi.com | AI Code Generation |
| agent-05-steel | 3005 | steel.delqhi.com | Stealth Browser |
| agent-06-skyvern | 8030 | skyvern.delqhi.com | Visual AI Automation |
| room-13-api-brain | 8000 | api.delqhi.com | FastAPI Gateway |
| room-26-grafana | 3001 | grafana.delqhi.com | Monitoring Dashboard |

### API Quick Reference
```bash
# Health Check
curl http://localhost:8000/health

# List Workflows
curl http://localhost:8000/workflows

# Execute Workflow
curl -X POST http://localhost:8000/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "example", "params": {}}'
```

---

## 🔄 Documentation Maintenance

### Update Frequency
- **README.md**: Every major release
- **API docs**: Every API change
- **Troubleshooting**: Every new issue resolution
- **Changelog**: Every commit

### Review Process
1. Update relevant docs with code changes
2. Review for accuracy and completeness
3. Test all code examples
4. Update cross-references
5. Commit with `docs:` prefix

---

## 📞 Getting Help

- **Documentation Issues**: Open an issue with `documentation` label
- **Missing Docs**: Request via GitHub Discussions
- **Outdated Info**: Submit a PR with updates
- **Questions**: Check [FAQ.md](./FAQ.md) first

---

## 📝 Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-30 | 1.0.0 | Initial documentation structure | sisyphus |

---

<div align="center">

**SIN-Solver Documentation**  
*Enterprise-Grade AI Automation Platform*

[GitHub](https://github.com/jeremy-daa/SIN-Solver) · [Issues](https://github.com/jeremy-daa/SIN-Solver/issues) · [Discussions](https://github.com/jeremy-daa/SIN-Solver/discussions)

</div>
