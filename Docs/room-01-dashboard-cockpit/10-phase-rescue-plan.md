# 🚀 SIN-COCKPIT RESCUE PLAN - 10-PHASE MASTER TRACK (V1.0)
<!-- [TIMESTAMP: 2026-01-29 00:00] [ACTION: RESCUE MISSION] [TARGET: ROOM-01 COCKPIT] -->

## 🚨 MISSION STATEMENT
The current "Dashboard" is a static status monitor with hardcoded mocks. This is unacceptable.
**OBJECTIVE:** Transform `room-01-dashboard-cockpit` into a **Real-Time Mission Control Center** that aggregates, embeds, and controls the entire 26-Room Empire via Docker Socket and Iframe Integration.

---

## 📊 THE 10-PHASE MASTER TRACK

### PHASE 1: FOUNDATION & CLEANUP (The "Purge")
- **Goal:** Remove all mocks, demo toggles, and hardcoded lists.
- **Action:**
  - Delete `services.js` hardcoded arrays.
  - Remove "Demo Mode" from `Settings.js`.
  - Install `dockerode` for real infrastructure communication.
- **Deliverable:** A broken but honest dashboard (no fake data).

### PHASE 2: INFRASTRUCTURE BRIDGE (The "Truth")
- **Goal:** Establish a real-time link to the Docker Daemon.
- **Action:**
  - Create `lib/docker.js` singleton using `dockerode`.
  - Mount `/var/run/docker.sock` into the container (ensure permissions).
  - Create API endpoint `/api/docker/containers` to list *actually running* services.
  - Map container names (e.g., `agent-01-n8n`) to readable metadata dynamically.
- **Deliverable:** API returning live JSON of the 26-room swarm.

### PHASE 3: THE COCKPIT ARCHITECTURE (The "Frame")
- **Goal:** Shift from "Page-based" to "App-Frame-based" layout.
- **Action:**
  - Create `components/Layout/Sidebar.js`: Persistent navigation on the left.
  - Create `components/Layout/MainStage.js`: Dynamic content area on the right.
  - Implement "App Mode": Clicking a sidebar item (e.g., n8n) keeps the sidebar but loads the tool in the Main Stage.
- **Deliverable:** A persistent shell that feels like an IDE/OS, not a website.

### PHASE 4: EMBEDDING ENGINE (The "Integration")
- **Goal:** Seamlessly integrate external tools (n8n, Skyvern, Portainer) into the stage.
- **Action:**
  - Implement `components/Tools/IframeView.js` with full height/width.
  - Configure `next.config.js` rewrites/proxies if CORS is an issue (or assume localhost access).
  - Add "Open in New Tab" fallback for tools that refuse embedding (X-Frame-Options).
- **Deliverable:** Working n8n and Skyvern editors *inside* the Cockpit.

### PHASE 5: REAL-TIME TELEMETRY (The "Pulse")
- **Goal:** Live stats without page refreshes.
- **Action:**
  - Implement React Query / SWR for polling `/api/docker/stats`.
  - Show CPU/RAM usage per container in the Sidebar or Tooltip.
  - Live "Green/Red" status dots based on Docker State (running/exited).
- **Deliverable:** UI that breathes with the system.

### PHASE 6: COMMAND & CONTROL (The "Power")
- **Goal:** Control the infrastructure from the UI.
- **Action:**
  - Add "Actions Menu" (Three dots) per container in Sidebar.
  - Implement API endpoints: `/api/docker/restart`, `/api/docker/stop`, `/api/docker/logs`.
  - Frontend buttons to trigger these actions.
- **Deliverable:** Ability to restart a crashed n8n agent from the UI.

### PHASE 7: LOGS & TERMINAL (The "Black Box")
- **Goal:** View container logs without leaving the Cockpit.
- **Action:**
  - Create `components/Terminal/LogViewer.js` (using `xterm.js` or simple pre-wrap).
  - Stream logs via API.
- **Deliverable:** "Matrix style" log view for debugging agents.

### PHASE 8: VISUAL ENGINEERING 2026 (The "Vibe")
- **Goal:** Elite UI/UX that screams "Enterprise AI".
- **Action:**
  - Apply Glassmorphism (blur backgrounds).
  - Use Monospace fonts (JetBrains Mono) for all data.
  - "Bento Grid" layout for the Home/Overview page.
  - Dark Mode Default (Light Mode is deprecated).
- **Deliverable:** A UI indistinguishable from a Sci-Fi movie interface.

### PHASE 9: SELF-REFLECTION (The "Mirror")
- **Goal:** The Dashboard should document itself.
- **Action:**
  - Embed `lastchanges.md` and `AGENTS.md` viewer.
  - Show current "System Health" (Disk space, Host CPU).
- **Deliverable:** Full introspection.

### PHASE 10: SWARM DEPLOYMENT (The "Release")
- **Goal:** Production readiness.
- **Action:**
  - Docker multi-stage build optimization.
  - Final E2E Playwright test (verify iframes load).
  - Update `AGENTS.md` and `lastchanges.md`.
- **Deliverable:** The Ultimate SIN-COCKPIT V2.0.

---

## 🛠 TECH STACK
- **Frontend:** Next.js 14, TailwindCSS, Framer Motion, Lucide Icons
- **Backend:** Next.js API Routes
- **Docker Integration:** `dockerode`
- **State:** React Query (TanStack Query)
