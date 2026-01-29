# 🚨 ARCHITEKTUR-PROBLEME GEFUNDEN

**Datum:** 2026-01-29  
**Agent:** sisyphus  
**Status:** KRITISCHE NAMENS-KONFLIKTE

---

## 🔴 KRITISCHE DUPLIKATE

### 1. Agent-05: Steel Browser (2x vorhanden!)

| Verzeichnis | Container Name | Status |
|-------------|----------------|--------|
| `Docker/agents/agent-05-steel/` | `agent-05-steel-browser` | ✅ Sollte behalten werden |
| `Docker/agents/agent-05-steel-browser/` | `agent-05-steel-browser` | 🚨 **LÖSCHEN!** Duplikat |

**Problem:** Beide haben denselben Container-Namen!  
**Lösung:** `agent-05-steel-browser/` Verzeichnis löschen

---

### 2. Agent-06: Skyvern (2x vorhanden!)

| Verzeichnis | Container Name | Status |
|-------------|----------------|--------|
| `Docker/agents/agent-06-skyvern/` | `agent-06-skyvern-solver` | ✅ Sollte behalten werden |
| `Docker/agents/agent-06-skyvern-solver/` | `agent-06-skyvern-solver` | 🚨 **LÖSCHEN!** Duplikat |

**Problem:** Beide haben denselben Container-Namen!  
**Lösung:** `agent-06-skyvern-solver/` Verzeichnis löschen

---

### 3. Room-01: Dashboard (2x vorhanden + falscher Name!)

| Verzeichnis | Container Name | Status |
|-------------|----------------|--------|
| `Docker/rooms/room-01-dashboard/` | `room-01-dashboard-cockpit` | 🚨 **FALSCHER NAME!** Sollte `room-01-dashboard` sein |
| `Docker/rooms/room-01-dashboard-cockpit/` | `room-01-dashboard-cockpit` | 🚨 **DUPLIKAT!** |

**Problem:** 
1. `room-01-dashboard/` hat falschen Container-Namen
2. `room-01-dashboard-cockpit/` ist ein Duplikat

**Lösung:**
1. In `room-01-dashboard/docker-compose.yml`: Container-Name ändern zu `room-01-dashboard`
2. `room-01-dashboard-cockpit/` Verzeichnis löschen

---

## 📋 BEST PRACTICES VERLETZUNGEN

### Naming Convention
**Erwartet:** `{category}-{number}-{name}`  
**Beispiel:** `agent-05-steel-browser`, `room-01-dashboard`

**Gefunden:**
- ❌ Duplikate mit identischen Container-Namen
- ❌ Verzeichnis-Name != Container-Name (bei room-01-dashboard)

### User Experience
**Problem:**
- Verwirrend: Zwei Verzeichnisse für denselben Service
- Nicht klar welcher der "echte" ist
- Potenzielle Konflikte beim Starten

---

## ✅ EMPFOHLENE AKTIONEN

### Sofort (P0):
1. [ ] Duplikat `agent-05-steel-browser/` löschen
2. [ ] Duplikat `agent-06-skyvern-solver/` löschen
3. [ ] Duplikat `room-01-dashboard-cockpit/` löschen
4. [ ] Container-Name in `room-01-dashboard/docker-compose.yml` fixen

### Danach (P1):
5. [ ] Alle docker-compose.yml auf Konsistenz prüfen
6. [ ] READMEs aktualisieren
7. [ ] Git commit + push

---

## 🔍 WEITERE PRÜFUNGEN LAUFEN

Hintergrund-Agenten analysieren:
- ✅ Container Naming (Duplikate gefunden!)
- ⏳ Architecture Best Practices
- ⏳ User Experience Issues
- ⏳ Missing Integrations

---

**Dringend:** Diese Duplikate müssen vor dem nächsten Deployment behoben werden!
