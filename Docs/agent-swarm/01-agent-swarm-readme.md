# Agent Swarm & Orchestration (Delqhi-Platform)

## 🐝 THE CLUSTER
Wir nutzen ein High-Court Modell mit 5 spezialisierten Agenten.

1.  **Prometheus**: Planer (Zimmer-02).
2.  **Sisyphus**: Executor (Zimmer-14).
3.  **Atlas**: Architect (Zimmer-03).
4.  **Oracle**: Debugger (Zimmer-13).
5.  **Momus**: Auditor (Zimmer-08).

## 🎼 WORKFLOW
- `@plan` -> Prometheus erstellt `plans/*.md`.
- `/start-work` -> Sisyphus führt Shards aus.
- Verification -> Momus prüft gegen Blueprint.
