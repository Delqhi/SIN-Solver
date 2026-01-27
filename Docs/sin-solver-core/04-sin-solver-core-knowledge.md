# Wissenssammlung SIN-Solver Core

## Best Practices
1. **Zimmer-Isolierung:** Jeder Agent darf nur über den API-Koordinator kommunizieren.
2. **Logging:** Nutze das zentrale Logging in Zimmer 15 (SurfSense).

## Datenfluss
1. Request -> API Koordinator (13)
2. Task -> n8n (01)
3. Vision -> Skyvern (06)
4. Execution -> Worker (14) + Steel (05)
