# Plan: Documentation Precision Mandate (Timestamping 2026)

## Context

### Original Request
Der User möchte eine neue globale Anweisung in der `AGENTS.md`: Jede MD-Datei und jeder Abschnitt darin muss einen Kopfzeilen-Zeitstempel (Uhrzeit, Grund, zugehörige Dateien) haben. Dies gilt für Berichte, Dokumentationen und jede Form von MD-Dateien.

### Interview Summary
- **Globale Reichweite**: Die Regel muss in `/Users/jeremy/dev/AGENTS.md`, `/Users/jeremy/dev/SIN-Solver/AGENTS.md` und `~/.opencode/Agents.md` verankert werden.
- **Granularität**: Zeitstempel müssen auf Dokumentenebene (Header) UND auf Abschnittsebene (H2, H3) erfolgen.
- **Inhalt**: [ZEITSTEMPEL] [GRUND] [DATEIEN].

---

## Work Objectives

### Core Objective
Implementierung des "Documentation Precision Mandate" in allen globalen und lokalen AGENTS.md Dateien, um eine lückenlose Rückverfolgbarkeit von Dokumentationsänderungen auf Abschnittsebene zu erzwingen.

### Concrete Deliverables
- [ ] Modifizierte `/Users/jeremy/dev/AGENTS.md`
- [ ] Modifizierte `/Users/jeremy/dev/SIN-Solver/AGENTS.md`
- [ ] Modifizierte `/Users/jeremy/.opencode/Agents.md`

### Definition of Done
- [ ] Alle drei Dateien enthalten das neue Kapitel "0.3 DOCUMENTATION PRECISION MANDATE".
- [ ] Das Format für Abschnitts-Zeitstempel ist klar definiert (HTML-Kommentare).
- [ ] Ein Beispiel-Snippet ist in der Anleitung enthalten.

### Must NOT Have (Guardrails)
- Keine Löschung bestehender Mandate.
- Keine Beeinträchtigung des Markdown-Renderings (Nutzung von HTML-Kommentaren für Sektions-Logs).

---

## Verification Strategy

### Manual QA
- [ ] Sichtprüfung der modifizierten Dateien.
- [ ] Test-Erstellung einer neuen MD-Datei durch Sisyphus, um die Einhaltung der neuen Regel zu verifizieren.

---

## Task Flow
Task 1 (Global Dev) -> Task 2 (Local SIN-Solver) -> Task 3 (Home Opencode) -> Task 4 (Verification)

---

## TODOs

- [ ] 1. Update Global AGENTS.md (`/Users/jeremy/dev/AGENTS.md`)
  **What to do**:
  - Füge Kapitel 0.3 ein.
  - Definiere das Format: `<!-- [TIMESTAMP: YYYY-MM-DD HH:mm] [ACTION: Reason] [FILES: related/files] -->`
  **Parallelizable**: NO
  **Acceptance Criteria**: Datei enthält das Mandat.

- [ ] 2. Update Local AGENTS.md (`/Users/jeremy/dev/SIN-Solver/AGENTS.md`)
  **What to do**:
  - Synchronisiere Kapitel 0.3 mit der globalen Version.
  **Parallelizable**: YES
  **Acceptance Criteria**: Datei enthält das Mandat.

- [ ] 3. Update Home Agents.md (`~/.opencode/Agents.md`)
  **What to do**:
  - Synchronisiere Kapitel 0.3 mit der globalen Version.
  **Parallelizable**: YES
  **Acceptance Criteria**: Datei enthält das Mandat.

- [ ] 4. Verification Test
  **What to do**:
  - Erstelle eine Testdatei `docs/timestamp_test.md` mit zwei Abschnitten.
  - Jeder Abschnitt muss einen gültigen Zeitstempel-Kommentar haben.
  **Acceptance Criteria**: Datei folgt dem neuen Mandat.

---

## Success Criteria
- [ ] Mandat ist in allen 3 AGENTS.md Quellen aktiv.
- [ ] Format ist einheitlich.
