# Disaster Recovery Plan - Overview

**Project:** SIN-Solver
**Version:** 1.0
**Last Updated:** 2026-01-30
**Status:** Active

## Executive Summary

This Disaster Recovery Plan provides comprehensive procedures for recovering SIN-Solver infrastructure and services in the event of catastrophic failures.

### Recovery Objectives

| Metric | Target | Maximum Acceptable |
|--------|--------|-------------------|
| RTO | 15 minutes | 1 hour |
| RPO | 5 minutes | 1 hour |

### Criticality Classification

| Tier | Services | RTO | RPO |
|------|----------|-----|-----|
| Tier 1 | PostgreSQL, Redis, Cloudflare Tunnel | 15 min | 5 min |
| Tier 2 | N8N, Steel Browser, Dashboard | 30 min | 15 min |
| Tier 3 | Monitoring, Training Jobs | 2 hours | 1 hour |
| Tier 4 | Documentation | 24 hours | 24 hours |

## Document Structure

- 01-overview.md - This file
- 02-risk-assessment.md
- 03-rto-rpo-objectives.md
- 04-backup-strategy.md
- 05-failover-procedures.md
- 06-communication-plan.md
- 07-testing-schedule.md
- 08-post-recovery-verification.md
- 09-lessons-learned.md
- scenarios/ - Scenario runbooks
- runbooks/ - Quick reference

## Service Inventory

| Service | Container | Port | Tier |
|---------|-----------|------|------|
| PostgreSQL | room-03-postgres-master | 5432 | Tier 1 |
| Redis | room-04-redis-cache | 6379 | Tier 1 |
| N8N | agent-01-n8n-orchestrator | 5678 | Tier 2 |
| Steel Browser | agent-05-steel-browser | 3005 | Tier 2 |
| Dashboard | room-01-dashboard | 3011 | Tier 2 |

## Incident Severity Levels

**SEV 1 - Critical:** All services down, data loss, security breach
**SEV 2 - High:** Primary services degraded
**SEV 3 - Medium:** Non-critical services affected
**SEV 4 - Low:** Monitoring or cosmetic issues

## Plan Maintenance

- DR Plan Review: Quarterly
- Backup Test: Monthly
- Full DR Drill: Semi-annually
