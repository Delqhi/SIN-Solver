# Communication Plan

**Last Updated:** 2026-01-30

## Communication Principles

1. **Transparency:** Communicate early and often
2. **Accuracy:** Verify facts before communicating
3. **Empathy:** Acknowledge impact on users
4. **Action:** Provide clear next steps

## Incident Communication Flow

```
Detection
    |
    ├─ SEV 1/2 → Immediate notification
    |               |
    |               ├─ Internal: Slack #incidents
    |               ├─ Status Page: Update immediately
    |               └─ Stakeholders: Email within 15 min
    |
    ├─ SEV 3 → Standard notification
    |           |
    |           ├─ Internal: Slack #alerts
    |           └─ Status Page: Update if user-facing
    |
    └─ SEV 4 → Log only
                |
                └─ Internal: Weekly report
```

## Communication Channels

### Internal Channels

| Channel | Purpose | Response Time |
|---------|---------|---------------|
| Slack #incidents | Real-time coordination | Immediate |
| Slack #alerts | Automated monitoring alerts | 15 minutes |
| Email on-call | Escalation | 30 minutes |
| Phone/SMS | Critical escalation | Immediate |

### External Channels

| Channel | Purpose | Update Frequency |
|---------|---------|------------------|
| Status Page | Public status updates | Every 30 min during incident |
| Email newsletter | Post-incident summary | Within 24 hours |
| Twitter/X | Brief updates | As needed |

## Escalation Matrix

### SEV 1 - Critical

| Time | Action | Responsible |
|------|--------|-------------|
| 0 min | Page on-call engineer | PagerDuty |
| 5 min | Notify engineering manager | On-call engineer |
| 15 min | Notify CTO/VP Engineering | Engineering manager |
| 30 min | Executive briefing | CTO |
| 1 hour | Customer communication | Support lead |

### SEV 2 - High

| Time | Action | Responsible |
|------|--------|-------------|
| 0 min | Slack notification | Monitoring system |
| 15 min | Acknowledge incident | On-call engineer |
| 30 min | Update status page | On-call engineer |
| 1 hour | Team lead notification | On-call engineer |

### SEV 3 - Medium

| Time | Action | Responsible |
|------|--------|-------------|
| 0 min | Slack notification | Monitoring system |
| 2 hours | Investigate issue | Available engineer |
| 4 hours | Update ticket | Assigned engineer |

## Status Page Updates

### Template: Incident Started

```
**Investigating:** [Service Name] Degraded Performance

We are currently investigating reports of [issue description]. 
We will provide updates as more information becomes available.

**Affected Services:** [List]
**Impact:** [Description]
**Started:** [Timestamp]
```

### Template: Status Update

```
**Update:** [Service Name] Issue Update

[Current status and actions taken]

**ETA for Resolution:** [Time estimate or "Investigating"]
**Workaround:** [If available]
**Last Updated:** [Timestamp]
```

### Template: Resolution

```
**Resolved:** [Service Name] Performance Restored

The issue has been resolved. All services are operating normally.

**Root Cause:** [Brief description]
**Resolution:** [What was done]
**Duration:** [Total downtime]
**Post-mortem:** [Link to follow-up]
```

## Stakeholder Communication

### Internal Stakeholders

| Role | SEV 1 | SEV 2 | SEV 3 | SEV 4 |
|------|-------|-------|-------|-------|
| Engineering Team | Immediate | 15 min | Daily standup | Weekly |
| Product Team | 30 min | 1 hour | Daily standup | Weekly |
| Executive Team | 15 min | 2 hours | Daily summary | Monthly |
| Customer Success | 1 hour | 4 hours | Daily standup | N/A |

### External Stakeholders

| Audience | Channel | Timing |
|----------|---------|--------|
| All Users | Status Page | Immediate |
| Enterprise Customers | Direct Email | Within 1 hour |
| Partners | Partner Portal | Within 4 hours |
| Public | Social Media | As needed |

## Communication Best Practices

### Do
- Acknowledge incidents quickly
- Provide regular updates (every 30 min minimum)
- Be honest about what you don't know
- Share workarounds when available
- Follow up with post-mortem

### Don't
- Wait for full diagnosis before communicating
- Make promises you can't keep
- Use technical jargon in public updates
- Blame third parties publicly
- Forget to update when resolved

## Post-Incident Communication

### Internal Post-Mortem

Within 48 hours of resolution:
1. Schedule post-mortem meeting
2. Document timeline
3. Identify root cause
4. Define action items
5. Share with team

### External Post-Incident Summary

Within 24 hours of resolution:
```
Subject: Incident Report - [Date] - [Service]

Summary:
- What happened
- Impact assessment
- Root cause
- Actions taken
- Preventive measures
```

## Communication Tools

- **Incident Management:** PagerDuty / Opsgenie
- **Status Page:** Statuspage.io / Better Uptime
- **Internal Chat:** Slack
- **Video Calls:** Zoom / Google Meet
- **Documentation:** Notion / Confluence
