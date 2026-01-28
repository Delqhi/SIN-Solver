# Room 24 - Hoppscotch (API Workbench)

**Version:** V1.0  
**Status:** OPERATIONAL  
**Port:** 3024  

---

## Overview

Hoppscotch is an open-source API development ecosystem (Postman alternative). It is used to test, document, and share API requests for all services in the SIN-Solver empire.

## Quick Start

```bash
cd /Users/jeremy/dev/sin-code/Docker/rooms/room-24-hoppscotch
docker compose up -d
```

## Access

- **URL:** http://localhost:3024
- **Network:** haus-netzwerk (172.20.0.95)

## Mandates

1. **Keep Collections Updated:** Every API change in `docs/postman/` must be reflected here.
2. **Use Environments:** Use variables for `{{base_url}}` to switch between Local/Prod.

## Integration

- Connects to `room-13-delqhi-api` (Port 8130)
- Connects to `room-12-delqhi-rest` (Port 3112)
- Connects to `room-11-plane-api` (Port 8000)

---

*Part of the SIN-Solver V18.3 Infrastructure*
