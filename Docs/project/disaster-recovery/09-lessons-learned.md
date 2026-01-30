# Lessons Learned Process

**Last Updated:** 2026-01-30

## Philosophy

Every incident is a learning opportunity. The goal is not to assign blame but to improve systems and processes to prevent future incidents.

## Post-Incident Review Process

### Timeline

| Phase | Timing | Duration | Participants |
|-------|--------|----------|--------------|
| Incident Resolution | Immediate | - | Response Team |
| Cool-down Period | 24 hours | - | All |
| Data Collection | 24-48 hours | 2-4 hours | Incident Commander |
| Post-Mortem Meeting | Within 48 hours | 1-2 hours | All stakeholders |
| Action Item Implementation | 1-30 days | Varies | Assigned owners |
| Follow-up Review | 30 days | 30 min | Team Lead |

## Post-Mortem Meeting Structure

### 1. Incident Summary (5 minutes)

- What happened (one-sentence summary)
- Impact assessment (users affected, duration, severity)
- How it was detected

### 2. Timeline Review (10 minutes)

Create detailed timeline:

```
Time (UTC)          Event
--------            -----
2026-01-30 08:00    First error logged
2026-01-30 08:05    Monitoring alert fired
2026-01-30 08:10    On-call engineer paged
2026-01-30 08:15    Incident declared, team assembled
2026-01-30 08:30    Root cause identified
2026-01-30 09:00    Fix deployed
2026-01-30 09:15    Service fully restored
2026-01-30 09:30    Monitoring confirmed stable
```

### 3. Root Cause Analysis (15 minutes)

Use the 5 Whys technique:

```
Problem: PostgreSQL database became corrupted

Why? Write operation failed due to disk error
Why? Disk reached end of life
Why? No disk health monitoring in place
Why? Monitoring scope didn't include hardware
Why? DR plan focused on software, not hardware

Root Cause: Inadequate hardware monitoring and lifecycle management
```

### 4. What Went Well (5 minutes)

- Backup restoration worked perfectly
- Team communication was clear
- Failover procedures executed correctly

### 5. What Could Be Improved (10 minutes)

- Detection took too long
- Documentation was outdated
- Communication to users was delayed

### 6. Action Items (10 minutes)

| Priority | Action | Owner | Due Date | Status |
|----------|--------|-------|----------|--------|
| P0 | Implement disk health monitoring | DevOps | 2026-02-15 | Open |
| P1 | Update DR runbooks | SRE | 2026-02-10 | Open |
| P2 | Add automated user notifications | Product | 2026-02-28 | Open |

## Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

**Date:** YYYY-MM-DD
**Incident ID:** INC-YYYY-MM-DD-XXX
**Severity:** SEV 1/2/3/4
**Duration:** X hours Y minutes
**Reporter:** [Name]

## Executive Summary

[One-paragraph summary of what happened and impact]

## Impact Assessment

- **Users Affected:** [Number or percentage]
- **Services Affected:** [List]
- **Data Loss:** [Yes/No, amount if yes]
- **Financial Impact:** [If applicable]
- **Reputational Impact:** [Brief assessment]

## Timeline

| Time (UTC) | Event | Owner |
|------------|-------|-------|
| HH:MM | Event description | Name |

## Root Cause Analysis

### 5 Whys

1. Why? [Answer]
2. Why? [Answer]
3. Why? [Answer]
4. Why? [Answer]
5. Why? [Answer]

**Root Cause:** [Final conclusion]

### Contributing Factors

- [Factor 1]
- [Factor 2]
- [Factor 3]

## Resolution

[How the incident was resolved]

## What Went Well

1. [Positive aspect]
2. [Positive aspect]

## What Could Be Improved

1. [Area for improvement]
2. [Area for improvement]

## Action Items

| ID | Priority | Action | Owner | Due Date | Status |
|----|----------|--------|-------|----------|--------|
| 1 | P0 | [Action] | [Name] | YYYY-MM-DD | Open |

## Lessons Learned

### Technical
- [Technical lesson]

### Process
- [Process lesson]

### Communication
- [Communication lesson]

## Attachments

- [Link to logs]
- [Link to metrics]
- [Link to screenshots]

## Sign-Off

| Role | Name | Date |
|------|------|------|
| Incident Commander | | |
| Engineering Manager | | |
| Product Manager | | |
```

## Action Item Tracking

### Tracking Process

1. **Create:** Add to incident tracking system (e.g., Plane, Jira)
2. **Assign:** Clear owner with deadline
3. **Prioritize:** P0 (immediate), P1 (this sprint), P2 (next sprint)
4. **Review:** Weekly action item review
5. **Verify:** Confirm completion and effectiveness

### Action Item Categories

| Category | Examples | Typical Timeline |
|----------|----------|------------------|
| Immediate Fix | Patch deployment, config change | 24 hours |
| Monitoring | Add alerts, dashboards | 1 week |
| Documentation | Update runbooks, procedures | 2 weeks |
| Automation | Automated recovery, self-healing | 1 month |
| Architecture | Redesign, redundancy improvements | 1-3 months |

## Knowledge Management

### Incident Database

Maintain a searchable incident database:

```yaml
incident_id: INC-2026-01-30-001
date: 2026-01-30
severity: SEV-1
category: database
cause: hardware_failure
resolution: backup_restore
rto_met: true
rpo_met: true
action_items_completed: 3/3
```

### Pattern Analysis

Quarterly review of incidents to identify patterns:

| Category | Q1 | Q2 | Q3 | Q4 | Trend |
|----------|----|----|----|----|-------|
| Database | 2 | 1 | 0 | 1 | Improving |
| Network | 1 | 2 | 1 | 0 | Improving |
| Human Error | 3 | 2 | 1 | 1 | Improving |
| Third-Party | 2 | 3 | 2 | 2 | Stable |

## Continuous Improvement

### DR Plan Updates

Update DR plan based on lessons learned:

| Trigger | Action | Owner |
|---------|--------|-------|
| Every incident | Review and update relevant runbook | Incident Commander |
| Quarterly | Full DR plan review | Infrastructure Lead |
| Post-major incident | Schedule additional DR drill | SRE |
| After failed test | Emergency plan update | DevOps |

### Metrics Tracking

| Metric | Target | Q1 | Q2 | Q3 | Q4 |
|--------|--------|----|----|----|----|
| MTTR (Mean Time To Recovery) | < 30 min | 25 | 20 | 18 | 15 |
| MTTD (Mean Time To Detection) | < 5 min | 8 | 6 | 5 | 4 |
| Action Item Completion | > 90% | 85% | 92% | 95% | 98% |
| Repeat Incidents | 0 | 2 | 1 | 0 | 0 |

## Communication of Learnings

### Internal Communication

- **Team Meeting:** Share lessons learned in next team meeting
- **Documentation:** Update relevant wiki pages
- **Training:** Incorporate into onboarding materials

### External Communication (if applicable)

- **Blog Post:** Technical deep-dive (optional)
- **Status Page:** Summary of improvements made
- **Customer Communication:** If customer-impacting

## Blameless Culture

### Principles

1. **Focus on systems, not people:** "How did the system allow this?" not "Who did this?"
2. **Assume good intent:** Everyone is trying to do the right thing
3. **Psychological safety:** People must feel safe to report and learn
4. **Continuous improvement:** Every incident makes us better

### Language Guidelines

| Instead of... | Say... |
|---------------|--------|
| "Someone deleted the database" | "The database was deleted" |
| "John didn't follow the procedure" | "The procedure was unclear" |
| "Human error caused the outage" | "The system allowed an unsafe action" |
| "They should have known better" | "The training didn't cover this scenario" |

## Follow-Up Process

### 30-Day Follow-Up

Review action items:
- Were they completed?
- Were they effective?
- Did they prevent similar incidents?

### 90-Day Review

Assess long-term impact:
- Has MTTR improved?
- Have similar incidents been prevented?
- Are new processes being followed?

### Annual DR Plan Review

Incorporate all lessons learned:
- Update all runbooks
- Revise RTO/RPO if needed
- Update contact lists
- Refresh training materials
