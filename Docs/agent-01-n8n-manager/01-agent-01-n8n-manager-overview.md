# 01-agent-01-n8n-manager-overview.md

## Agent 01: n8n Manager - Workflow Orchestration Service

**Service Name:** `agent-01-n8n-manager`  
**Public URL:** `https://n8n.delqhi.com`  
**Internal Port:** `5678`  
**Category:** Agent (AI Workers)  
**Status:** ✅ Active  
**Last Updated:** 2026-01-30

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Service Overview](#service-overview)
3. [Key Features & Capabilities](#key-features--capabilities)
4. [Architecture & Design](#architecture--design)
5. [Integration Points](#integration-points)
6. [Use Cases & Applications](#use-cases--applications)
7. [Service Dependencies](#service-dependencies)
8. [Performance Characteristics](#performance-characteristics)
9. [Security Considerations](#security-considerations)
10. [Operational Status](#operational-status)
11. [Related Documentation](#related-documentation)

---

## Executive Summary

The **n8n Manager** (`agent-01-n8n-manager`) serves as the primary workflow orchestration engine within the SIN-Solver platform. Built on the powerful n8n (nodemation) open-source framework, this service provides a visual, node-based interface for creating, executing, and managing complex automation workflows. It acts as the central nervous system of the platform, coordinating tasks across all other services and external integrations.

With support for over 200+ native integrations and the ability to connect to virtually any API through custom HTTP requests, n8n Manager enables both technical and non-technical users to build sophisticated automation pipelines without writing code. The service handles everything from simple scheduled tasks to complex multi-step workflows involving AI agents, data transformations, conditional logic, and error handling.

---

## Service Overview

### What is n8n?

n8n (pronounced "n-eight-n" or "nodemation") is a fair-code licensed workflow automation tool that enables users to connect different services and APIs together. Unlike proprietary solutions like Zapier or Make (formerly Integromat), n8n can be self-hosted, giving users complete control over their data and workflows.

### Role in SIN-Solver Platform

Within the SIN-Solver ecosystem, the n8n Manager fulfills several critical roles:

1. **Workflow Orchestration:** Coordinates the execution of multi-step processes across multiple services
2. **Task Scheduling:** Provides cron-like scheduling capabilities for recurring tasks
3. **Integration Hub:** Acts as the central connection point between internal services and external APIs
4. **Event Processing:** Handles webhooks and triggers from external systems
5. **Data Transformation:** Transforms and routes data between different formats and services
6. **Error Handling:** Implements retry logic and error recovery mechanisms

### Service Identification

| Attribute | Value |
|-----------|-------|
| **Container Name** | `agent-01-n8n-manager` |
| **Service Name** | `n8n` |
| **Internal Hostname** | `agent-01-n8n-manager` |
| **Internal Port** | `5678` |
| **Public Domain** | `n8n.delqhi.com` |
| **Docker Network** | `sin-network` |
| **IP Address** | `172.20.0.10` (example) |

---

## Key Features & Capabilities

### 1. Visual Workflow Editor

The n8n Manager provides an intuitive drag-and-drop interface for building workflows:

- **Node-Based Design:** Each step in a workflow is represented as a node
- **Visual Connections:** Draw connections between nodes to define data flow
- **Real-Time Preview:** See workflow structure and connections visually
- **Zoom & Navigation:** Navigate complex workflows with ease
- **Node Search:** Quickly find and add nodes from a comprehensive library

### 2. 200+ Native Integrations

n8n comes with built-in support for popular services:

**Communication & Collaboration:**
- Slack, Discord, Microsoft Teams
- Email (SMTP, IMAP, Gmail, Outlook)
- Telegram, WhatsApp

**Databases & Storage:**
- PostgreSQL, MySQL, MongoDB
- Redis, Elasticsearch
- AWS S3, Google Cloud Storage

**AI & Machine Learning:**
- OpenAI (GPT-4, GPT-3.5)
- Google AI (Gemini)
- Anthropic (Claude)
- Custom AI endpoints

**Productivity & Business:**
- Google Workspace (Sheets, Docs, Drive)
- Microsoft 365
- Notion, Airtable
- Trello, Asana, Jira

**Development & DevOps:**
- GitHub, GitLab, Bitbucket
- Docker, Kubernetes
- AWS, Azure, GCP
- Jenkins, CircleCI

**Marketing & CRM:**
- HubSpot, Salesforce
- Mailchimp, SendGrid
- Stripe, PayPal

### 3. Advanced Workflow Capabilities

**Conditional Logic:**
- IF nodes for branching workflows
- Switch nodes for multiple conditions
- Comparison operations (equals, contains, greater than, etc.)

**Data Transformation:**
- Code nodes (JavaScript/Python)
- Set nodes for data manipulation
- Function nodes for custom logic
- HTTP Request nodes for API calls

**Looping & Iteration:**
- Split In Batches node
- Loop Over Items node
- Recursive workflow execution

**Error Handling:**
- Continue On Fail option
- Error workflows
- Retry logic with exponential backoff
- Custom error handling nodes

**Execution Control:**
- Wait nodes for delays
- Merge nodes for joining branches
- No Operation nodes for organization
- Execute Workflow nodes for sub-workflows

### 4. Scheduling & Triggers

**Trigger Types:**
- **Manual:** Execute on-demand via UI or API
- **Webhook:** HTTP POST/GET triggers
- **Schedule:** Cron-based scheduling
- **Polling:** Periodic checks for changes
- **Event-Driven:** Real-time triggers from services

**Scheduling Options:**
- Minute, hourly, daily, weekly, monthly
- Custom cron expressions
- Timezone support
- Execution limits and windows

### 5. Execution Management

**Execution Monitoring:**
- Real-time execution status
- Step-by-step execution view
- Input/output data inspection
- Execution duration tracking

**Execution History:**
- Complete execution logs
- Success/failure tracking
- Data retention policies
- Execution replay capability

**Bulk Operations:**
- Execute multiple workflows
- Bulk enable/disable
- Import/export workflows

---

## Architecture & Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     n8n.delqhi.com                          │
│                  (Public Access via Cloudflare)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              agent-01-n8n-manager (Port 5678)               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │   Web UI    │  │  API Server  │  │  Workflow Engine    │ │
│  │  (Editor)   │  │   (REST)     │  │  (Execution)        │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Trigger    │  │   Queue      │  │  Credential Store   │ │
│  │  Manager    │  │  (Redis)     │  │  (Vault)            │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis     │  │    Vault     │
│  (Workflows) │  │   (Queue)    │  │  (Secrets)   │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Component Breakdown

**Web UI (Editor):**
- React-based frontend
- Visual workflow canvas
- Node configuration panels
- Execution monitoring views

**API Server:**
- RESTful API for all operations
- Authentication & authorization
- Webhook endpoints
- Workflow CRUD operations

**Workflow Engine:**
- Core execution logic
- Node execution orchestration
- Data flow management
- Error handling

**Trigger Manager:**
- Webhook listener
- Schedule manager
- Polling scheduler
- Event subscribers

**Queue System:**
- Bull queue (Redis-based)
- Job prioritization
- Concurrency control
- Retry management

**Credential Store:**
- Integration with HashiCorp Vault
- Encrypted credential storage
- OAuth token management
- API key rotation

### Data Flow

1. **Trigger Activation:**
   - Webhook receives HTTP request, OR
   - Scheduler triggers based on time, OR
   - Manual execution from UI

2. **Workflow Loading:**
   - Workflow definition fetched from PostgreSQL
   - Credentials retrieved from Vault
   - Execution context initialized

3. **Node Execution:**
   - Starting node(s) executed
   - Output passed to connected nodes
   - Each node transforms or acts on data
   - Conditional branches evaluated

4. **Completion:**
   - Final nodes executed
   - Results stored
   - Execution logged
   - Notifications sent (if configured)

---

## Integration Points

### Internal Service Integrations

**room-02-tresor-vault (Secrets Management):**
- Credential storage and retrieval
- OAuth token management
- API key rotation
- Secure credential injection

**room-03-archiv-postgres (Database):**
- Workflow persistence
- Execution history storage
- User data storage
- Audit logging

**room-04-memory-redis (Cache):**
- Job queue management
- Session storage
- Rate limiting
- Real-time notifications

**room-13-api-brain (API Gateway):**
- Authentication proxy
- Rate limiting
- Request routing
- Service discovery

**agent-05-steel-browser (Stealth Browser):**
- Web automation workflows
- CAPTCHA solving integration
- Session-based browsing
- Anti-detection measures

**agent-06-skyvern-solver (Visual AI):**
- Visual workflow automation
- Screenshot analysis
- Element detection
- AI-powered interactions

**solver-1.1-captcha-worker (CAPTCHA Solver):**
- Automated CAPTCHA solving
- Image recognition workflows
- Challenge-response handling

### External Integrations

**Cloudflare:**
- Public domain exposure
- SSL/TLS termination
- DDoS protection
- Access control

**AI Services:**
- OpenAI API
- Google Gemini
- Anthropic Claude
- Custom AI endpoints

**Communication:**
- Slack webhooks
- Email services
- Telegram bots
- Discord integrations

**Storage:**
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- FTP/SFTP servers

---

## Use Cases & Applications

### 1. Automated Reporting

**Scenario:** Generate and distribute daily/weekly reports

**Workflow:**
1. Schedule trigger (daily at 8 AM)
2. Query database for metrics
3. Transform data into report format
4. Generate PDF/Excel
5. Email to stakeholders
6. Post summary to Slack

### 2. Lead Processing

**Scenario:** Process and route incoming leads

**Workflow:**
1. Webhook from website form
2. Validate lead data
3. Enrich with Clearbit/Apollo
4. Score lead quality
5. Create CRM entry
6. Send notification to sales team
7. Add to email sequence

### 3. Social Media Automation

**Scenario:** Cross-post content across platforms

**Workflow:**
1. RSS feed trigger (new blog post)
2. Extract content and images
3. Generate platform-specific versions
4. Post to Twitter/X
5. Post to LinkedIn
6. Post to Facebook
7. Log to analytics

### 4. Data Synchronization

**Scenario:** Keep multiple systems in sync

**Workflow:**
1. Database change trigger
2. Transform data format
3. Update CRM
4. Update ERP
5. Update warehouse
6. Log sync status

### 5. AI-Powered Content Creation

**Scenario:** Generate content with AI

**Workflow:**
1. Manual trigger with topic
2. Research with web search
3. Generate outline with GPT-4
4. Generate sections
5. Review and edit
6. Publish to CMS
7. Notify team

### 6. Incident Response

**Scenario:** Automated incident handling

**Workflow:**
1. PagerDuty alert webhook
2. Create incident ticket
3. Notify on-call engineer
4. Gather system metrics
5. Run diagnostic scripts
6. Post updates to status page
7. Escalate if unresolved

---

## Service Dependencies

### Required Dependencies

| Service | Purpose | Criticality |
|---------|---------|-------------|
| `room-03-archiv-postgres` | Workflow storage | **Critical** |
| `room-04-memory-redis` | Job queue | **Critical** |
| `room-02-tresor-vault` | Credential storage | High |
| `room-00-cloudflared-tunnel` | Public access | Medium |

### Optional Dependencies

| Service | Purpose | Usage |
|---------|---------|-------|
| `agent-05-steel-browser` | Web automation | Optional |
| `agent-06-skyvern-solver` | Visual AI | Optional |
| `solver-1.1-captcha-worker` | CAPTCHA solving | Optional |
| `room-13-api-brain` | API gateway | Recommended |

### Startup Order

1. `room-03-archiv-postgres` (must be ready)
2. `room-04-memory-redis` (must be ready)
3. `room-02-tresor-vault` (should be ready)
4. `agent-01-n8n-manager` (can start)

---

## Performance Characteristics

### Resource Requirements

| Resource | Minimum | Recommended | Notes |
|----------|---------|-------------|-------|
| **CPU** | 1 core | 2+ cores | More for concurrent executions |
| **RAM** | 2 GB | 4+ GB | Depends on workflow complexity |
| **Disk** | 10 GB | 50+ GB | For execution history |
| **Network** | 100 Mbps | 1 Gbps | For external API calls |

### Performance Metrics

**Throughput:**
- Simple workflows: 100+ executions/minute
- Complex workflows: 10-50 executions/minute
- Webhook response time: < 100ms

**Concurrency:**
- Default: 5 concurrent executions
- Configurable up to 50+ (depends on resources)
- Queue-based for high load

**Latency:**
- Workflow start: < 1 second
- Node execution: 10ms - 5s (depends on node type)
- Database operations: < 50ms

### Scaling Considerations

**Horizontal Scaling:**
- n8n supports queue mode for multiple workers
- Requires Redis for coordination
- Load balancer for API/UI

**Vertical Scaling:**
- Increase CPU for more concurrent executions
- Increase RAM for complex workflows
- SSD for faster database operations

---

## Security Considerations

### Authentication & Authorization

**User Authentication:**
- Built-in user management
- LDAP/Active Directory integration
- SAML 2.0 SSO support
- OAuth 2.0 providers

**API Authentication:**
- API keys
- JWT tokens
- OAuth 2.0
- Webhook signature verification

**Role-Based Access Control:****
- Admin: Full access
- Member: Create/edit own workflows
- Guest: View only

### Data Security

**Encryption:**
- Credentials encrypted at rest (AES-256)
- TLS 1.3 for all connections
- Secure credential storage in Vault

**Network Security:**
- Internal Docker network isolation
- Cloudflare WAF protection
- IP whitelisting available
- Rate limiting

**Audit & Compliance:**
- Complete execution logs
- User action logging
- Data retention policies
- GDPR compliance features

### Best Practices

1. **Use Vault for all credentials** - Never hardcode secrets
2. **Enable 2FA for all users** - Prevent unauthorized access
3. **Regular security updates** - Keep n8n version current
4. **Network segmentation** - Isolate sensitive workflows
5. **Monitor executions** - Watch for suspicious activity
6. **Backup regularly** - Protect workflow definitions

---

## Operational Status

### Current Status: ✅ Active

**Health Indicators:**
- ✅ Service running and accessible
- ✅ Database connectivity established
- ✅ Redis queue operational
- ✅ Vault integration functional
- ✅ Public domain responding

### Recent Activity

| Date | Event | Status |
|------|-------|--------|
| 2026-01-30 | Documentation created | ✅ Complete |
| 2026-01-29 | Service health check | ✅ Healthy |
| 2026-01-28 | Version update | ✅ Complete |

### Known Issues

| Issue | Severity | Status | Workaround |
|-------|----------|--------|------------|
| None currently | - | - | - |

### Planned Maintenance

| Date | Activity | Impact |
|------|----------|--------|
| TBD | Version upgrade | Brief downtime |

---

## Related Documentation

### Internal Documentation

- [02-agent-01-n8n-manager-lastchanges.md](./02-agent-01-n8n-manager-lastchanges.md) - Change log
- [03-agent-01-n8n-manager-troubleshooting.md](./03-agent-01-n8n-manager-troubleshooting.md) - Troubleshooting guide
- [04-agent-01-n8n-manager-architecture.md](./04-agent-01-n8n-manager-architecture.md) - Detailed architecture
- [05-agent-01-n8n-manager-api-reference.md](./05-agent-01-n8n-manager-api-reference.md) - API documentation
- [06-agent-01-n8n-manager-configuration.md](./06-agent-01-n8n-manager-configuration.md) - Configuration guide

### External Resources

- [n8n Official Documentation](https://docs.n8n.io/)
- [n8n Workflow Examples](https://n8n.io/workflows/)
- [n8n Community Forum](https://community.n8n.io/)
- [n8n GitHub Repository](https://github.com/n8n-io/n8n)

### Related Services

- [../room-02-tresor-secrets/01-room-02-overview.md](../room-02-tresor-secrets/01-room-02-overview.md) - Secrets management
- [../room-03-archiv-postgres/01-room-03-overview.md](../room-03-archiv-postgres/01-room-03-overview.md) - Database service
- [../room-04-memory-redis/01-room-04-overview.md](../room-04-memory-redis/01-room-04-overview.md) - Cache service
- [../agent-05-steel-browser/01-agent-05-overview.md](../agent-05-steel-browser/01-agent-05-overview.md) - Browser automation

---

## Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | DOC-AGENT-01-001 |
| **Version** | 1.0.0 |
| **Author** | SIN-Solver Documentation Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Quarterly |
| **Next Review** | 2026-04-30 |

---

*This document is part of the SIN-Solver 26-Pillar Documentation System. For the complete documentation set, see the [Documentation Index](../DOCS.md).*
