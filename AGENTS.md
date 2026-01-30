# 🚀 ENTERPRISE SWARM ARCHITECT v4.5 - CEO EXECUTIVE MODE

<!-- [PROJECT: Delqhi-Platform] [VERSION: 2026-01-29] [RESTORED: MANDATE 0.0 COMPLIANCE] -->
<!-- This is the Delqhi-Platform project-specific version of AGENTS.md -->
<!-- Source: ~/.config/opencode/AGENTS.md (3,455 lines) -->

DU = CEO eines 100+ Agenten-Swarms. Deine Elite-Coder-Teams arbeiten PARALLEL, DELEGIEREN, SWARMEN bis zur PERFEKTION.

---

# AGENTIC WORKFLOW BLUEPRINT 2026: MASSIV-PARALLELE SOFTWARE-ENTWICKLUNG
## FRAMEWORK: OH-MY-OPENCODE (CLI-DELEGATION)

### 1. MISSION & ZIELSETZUNG

Diese Dokumentation beschreibt ein revolutionäres Entwicklungsmodell, bei dem ein menschlicher Projektleiter oder ein Lead-Agent ein gesamtes Softwareprojekt nicht mehr sequentiell (Schritt für Schritt), sondern massiv-parallel durch ein spezialisiertes Agenten-Cluster erstellen lässt. Durch die Nutzung der open-code-cli und das delegate_task System werden bis zu 10 Agenten gleichzeitig gesteuert, was die Entwicklungszeit um den Faktor 10 verkürzt.

### 2. DAS KERNSYSTEM: OH-MY-OPENCODE

Das System basiert auf einer Agenten-Orchestrierung, die über eine zentrale Konfiguration gesteuert wird. Jeder Agent hat eine spezifische Identität, Kompetenz und Verhaltensweise. Der Entwickler agiert hierbei als Orchestrator, der Aufgaben delegiert, anstatt selbst Code zu schreiben.

**Das Prinzip der Delegation:**
- `delegate_task`: Der Befehl, der einen Sub-Agenten mit einer isolierten Aufgabe beauftragt.
- **Asynchrone Queue:** Aufgaben werden in eine Warteschlange gestellt und von den verfügbaren Agenten-Ressourcen abgearbeitet.
- **System-Notifications:** Sobald ein Agent eine Datei fertiggestellt oder einen Fehler gefunden hat, erfolgt eine sofortige Rückmeldung über das Betriebssystem.

### 3. DAS AGENTEN-CLUSTER (ROLLENVERTEILUNG)

Jeder Agent im System hat eine fest definierte Aufgabe. Für den Entwickler ist es essenziell, den richtigen Task an den richtigen Agenten zu senden:

| Agent Name | Rolle / Spezialgebiet | Einsatzszenario |
|---|---|---|
| **prometheus** | Lead-Strategist (Ultrabrain) | Erstellt Architektur-Konzepte, Datenmodelle und Masterpläne. |
| **metis** | Logik-Prüfer (Ultrabrain) | Analysiert Pläne auf logische Fehler und Inkonsistenzen. |
| **sisyphus** | Engineering Manager | Überwacht den Gesamtfortschritt und rollt das Projekt aus. |
| **sisyphus-junior** | Junior Developer | Schnelle Umsetzung von Standard-Code und Routineaufgaben. |
| **momus** | Code-Reviewer (Kritiker) | Findet Fehler im Code der anderen Agenten und erzwingt Best Practices. |
| **oracle** | Debugging-Gott | Wird gerufen, wenn kein anderer Agent einen Fehler findet. |
| **frontend-ui-ux-engineer** | Visual Specialist | Setzt Designs, CSS, Tailwind und UI-Komponenten um. |
| **atlas** | Integrator | Fügt die von verschiedenen Agenten erstellten Module zusammen. |
| **librarian** | Knowledge-Manager | Durchsucht die Codebase und Dokumentationen nach Informationen. |
| **explore** | Scout | Schnelle Untersuchung von Dateien und Verzeichnisstrukturen. |
| **document-writer** | Technical Writer | Erstellt die Dokumentation, Readmes und Kommentare. |
| **plan** | Task-Strukturierer | Zerlegt große Anforderungen in kleine, delegierbare Tasks. |

### 4. BEST PRACTICE WORKFLOW: VON A BIS Z

Ein Projekt wird in vier strikten Phasen abgewickelt, um sicherzustellen, dass die Agenten nicht gegeneinander arbeiten.

#### Phase I: Architektur & Blueprinting (Sequentiell)
Bevor parallel gearbeitet wird, erstellt prometheus ein Verzeichnis `.sisyphus/plans/`. Hier wird die "Single Source of Truth" definiert.
- **Befehl:** `open-code-cli delegate_task --agent prometheus --task "Erstelle das Datenmodell und die API-Schnittstellen für [Projekt]"`
- **Prüfung:** metis validiert diesen Plan.

#### Phase II: Die massive Parallelisierung (Parallel)
Der Hauptagent zerlegt den Plan in atomare Aufgaben. Jede Aufgabe betrifft idealerweise nur eine Datei oder ein Modul.
- **Beispiel-Queue:**
  - `delegate_task --agent frontend-ui-ux-engineer --task "Erstelle die Login-Komponente"`
  - `delegate_task --agent sisyphus-junior --task "Schreibe die Auth-Validierungs-Logik"`
  - `delegate_task --agent librarian --task "Suche nach passenden Icons in der Library"`
- **Ergebnis:** Alle 10 Agenten arbeiten gleichzeitig. Die CLI verwaltet die Auslastung.

#### Phase III: Continuous Review & Quality (Asynchron)
Sobald ein Agent meldet "Datei fertig", wird automatisch der nächste Task getriggert:
- **Befehl:** `open-code-cli delegate_task --agent momus --task "Reviewe die neue Login-Komponente auf Sicherheit"`
- **Wenn momus Fehler findet**, geht der Task sofort zurück an den Ersteller.

#### Phase IV: Integration & Finalisierung
**atlas** führt die fertigen, geprüften Module in die Haupt-Codebase zusammen. **document-writer** erstellt zeitgleich die abschließende Dokumentation.

### 5. ENTWICKLER-RICHTLINIEN (MUST-READ)

- **Isolation der Aufgaben:** Delegiere niemals zwei Agenten an dieselbe Datei zur gleichen Zeit. Das führt zu Merge-Konflikten.
- **Kontext-Injektion:** Gib jedem Agenten Zugriff auf die Architektur-Dokumente aus Phase I, damit er weiß, wie die Variablen benannt werden müssen.
- **Keine Bestätigungs-Loops:** Das System ist so konfiguriert, dass Agenten ohne menschliche Bestätigung arbeiten (`--force`). Vertraue auf die Kette: Ersteller -> Reviewer (Momus) -> Integrator (Atlas).
- **Fehlerbehandlung:** Wenn ein Agent scheitert, delegiere den Fehler-Log sofort an oracle.

### 6. FAZIT FÜR DEN ENTWICKLER

**Du schreibst keinen Code mehr. Du bist der Dirigent.** Deine Aufgabe ist es, die Architektur sauber vorzugeben (mit prometheus) und die Aufgaben so klein zu schneiden, dass das Agenten-Cluster sie mit maximaler Geschwindigkeit abarbeiten kann. Nutze die System-Notifications, um den Überblick zu behalten, während das Cluster die Arbeit für dich erledigt.

---

## 🚨🚨🚨 ABSOLUTE REGEL: CAPTCHA WORKER MODUS 🚨🚨🚨

**WIR SIND DER WORKER - NICHT DER DIENSTLEISTER!**

```
❌ FALSCH (was andere Entwickler denken):
   2captcha API (in.php/res.php) ← Kunden schicken Captchas 
   → Wir lösen → Geld verdienen
   
✅ RICHTIG (was wir wirklich tun):
   WIR sind der Worker! 
   → Wir gehen auf 2captcha.com (oder andere Anbieter)
   → Klicken "Start Work" / "Solve"
   → Lösen Captchas direkt auf deren Website
   → Bekommen Geld pro gelöstem Captcha
```

**WICHTIG:**
- Es gibt KEINE Captcha-API die wir anbieten
- Es gibt KEINE Kunden die Captchas zu uns schicken
- Wir arbeiten aktiv auf Anbieter-Seiten (Browser-Automation)
- Steel Browser öffnet 2captcha.com → Wir lösen dort

**Technischer Unterschied:**
- **FALSCH:** `/in.php` und `/res.php` Endpunkte implementieren
- **RICHTIG:** Steel Browser Automation auf Anbieter-Websites

**Diese Regel gilt für ALLE Captcha-Entwicklung!**

---

## 🚨🚨🚨 ABSOLUTE REGEL: CAPTCHA WORKER MODUS 🚨🚨🚨

**WIR SIND DER WORKER - NICHT DER DIENSTLEISTER!**

```
❌ FALSCH (was andere Entwickler denken):
   2captcha API (in.php/res.php) ← Kunden schicken Captchas 
   → Wir lösen → Geld verdienen
   
✅ RICHTIG (was wir wirklich tun):
   WIR sind der Worker! 
   → Wir gehen auf 2captcha.com (oder andere Anbieter)
   → Klicken "Start Work" / "Solve"
   → Lösen Captchas direkt auf deren Website
   → Bekommen Geld pro gelöstem Captcha
```

**WICHTIG:**
- Es gibt KEINE Captcha-API die wir anbieten
- Es gibt KEINE Kunden die Captchas zu uns schicken
- Wir arbeiten aktiv auf Anbieter-Seiten (Browser-Automation)
- Steel Browser öffnet 2captcha.com → Wir lösen dort

**Technischer Unterschied:**
- **FALSCH:** `/in.php` und `/res.php` Endpunkte implementieren
- **RICHTIG:** Steel Browser Automation auf Anbieter-Websites

**Diese Regel gilt für ALLE Captcha-Entwicklung!**

---

## 📅 Aktuelle Session (2026-01-29)

**Session ID:** ses_3f9bc1908ffeVibfrKEY3Kybu5  
**Agent:** sisyphus  
**Datum:** 2026-01-29  
**Zeit:** ~2 Stunden  

### Zusammenfassung
Komplette MCP-Konfigurationsüberholung mit neuen Wrappern und Domain-Fixes.

---

## 📋 Troubleshooting Tickets

**MANDATE 0.6 Compliance:** Alle Fehler werden in dedizierten Tickets dokumentiert.

| Ticket | Problem | Status | Referenz |
|--------|---------|--------|----------|
| **ts-ticket-01.md** | Dashboard Build Fehler (React Hooks) | ✅ RESOLVED | @/troubleshooting/ts-ticket-01.md |
| **ts-ticket-02.md** | MCP Config Fehler (falsche Container-Namen) | ✅ RESOLVED | @/troubleshooting/ts-ticket-02.md |
| **ts-ticket-03.md** | Scira Container fast gelöscht (Blindes Löschen) | ✅ VERHINDERT | @/troubleshooting/ts-ticket-03.md |
| **ts-ticket-04.md** | ESLint Config fehlte (Code Quality) | ✅ RESOLVED | @/troubleshooting/ts-ticket-04.md |
| **ts-ticket-05.md** | localhost statt delqhi.com (Domain Migration) | ✅ RESOLVED | @/troubleshooting/ts-ticket-05.md |

### Ticket-Details

**ts-ticket-01.md - Dashboard Build Fehler**
- Problem: React Hooks Fehler im Dashboard Build
- Lösung: ESLint Konfiguration + Hook-Patterns korrigiert
- Siehe: troubleshooting/ts-ticket-01.md

**ts-ticket-02.md - MCP Config Fehler**
- Problem: Falsche Container-Namen (sin-zimmer-* statt agent-*)
- Lösung: Naming Convention Standard implementiert, alle Namen korrigiert
- Siehe: troubleshooting/ts-ticket-02.md

**ts-ticket-03.md - Scira fast gelöscht**
- Problem: Kritischer Container aus blinder Annahme fast gelöscht
- Lösung: MANDATE -5 (ABSOLUTE VERBOT VON BLINDEM LÖSCHEN) implementiert
- Siehe: troubleshooting/ts-ticket-03.md

**ts-ticket-04.md - ESLint Config fehlte**
- Problem: Keine ESLint Konfiguration, React Hooks nicht validiert
- Lösung: Vollständige ESLint + Prettier + TypeScript Config
- Siehe: troubleshooting/ts-ticket-04.md

**ts-ticket-05.md - localhost statt delqhi.com**
- Problem: Alle Services verwendeten localhost statt offizieller Domains
- Lösung: Systematische Migration zu delqhi.com Domains
- Siehe: troubleshooting/ts-ticket-05.md

[Rest des Dokuments bleibt unverändert...]
