# Troubleshooting Delqhi-Platform Core

## Core Fehler

### Zimmer unreachable
**Symptom:** API Anfragen an einen Container schlagen fehl.
**Fix:** Prüfe den Container-Status via `docker-compose ps`. Starte betroffene Zimmer neu: `docker-compose restart zimmer-[name]`.

### Vision Timeout
**Symptom:** Skyvern benötigt zu lange für die Analyse.
**Fix:** Prüfe GPU-Auslastung für YOLOv8x. Fallback auf Pixtral 12B kontrollieren.
