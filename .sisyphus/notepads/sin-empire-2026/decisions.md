# 🎯 SIN-EMPIRE 2026 - ARCHITECTURAL DECISIONS

## [2026-01-27 07:00] Initial Decisions

### ADR-001: Event-Driven Architecture
**Decision:** Use Redis Pub/Sub as central event bus
**Rationale:** 
- Already have Redis in infrastructure
- Low latency for real-time events
- Simple to implement in both Node.js and Python
- Supports fire-and-forget and request-reply patterns

### ADR-002: Messenger Priority Chain
**Decision:** Telegram → WhatsApp → Discord → Email
**Rationale:**
- Telegram: Fastest, most reliable, best bot API
- WhatsApp: High engagement, business use
- Discord: Developer community, rich embeds
- Email: Fallback for everything

### ADR-003: N8N Custom Nodes
**Decision:** Create custom N8N node per Zimmer
**Rationale:**
- Visual workflow design
- Non-technical users can create automations
- Standardized interface across all services
- Built-in retry and error handling

### ADR-004: Health Check Standard
**Decision:** All services must expose /health and /ready
**Rationale:**
- Docker HEALTHCHECK compatibility
- Kubernetes-ready for future scaling
- N8N can poll for service availability
- Dashboard can show real-time status

---
