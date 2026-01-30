# Troubleshooting Ticket 01: Dashboard Build Fehler - React Hooks

**Ticket ID:** ts-ticket-01.md  
**Datum:** 2026-01-29  
**Projekt:** SIN-Solver Dashboard  
**Status:** ✅ RESOLVED  
**Referenz:** @/troubleshooting/ts-ticket-01.md

---

## Problem Statement

Das SIN-Solver Dashboard konnte nicht erfolgreich gebaut werden. Der Build-Prozess schlug mit React Hooks-bezogenen Fehlern fehl. Die Fehlermeldungen deuteten auf Probleme mit der Hook-Verwendung in den Dashboard-Komponenten hin, insbesondere in Verbindung mit der Service-Status-Anzeige und den Container-Steuerungselementen.

**Fehlermeldung (typisch):**
```
React Hook "useState" is called conditionally
React Hook "useEffect" has a missing dependency
Invalid hook call - Hooks can only be called inside the body of a function component
```

---

## Root Cause Analysis

### Ursache 1: Bedingte Hook-Aufrufe
Hooks wurden innerhalb von bedingten Anweisungen (if/else) oder Schleifen aufgerufen, was gegen die React Hooks Regeln verstößt.

### Ursache 2: Fehlende Dependencies in useEffect
Die Dependency-Arrays von `useEffect` Hooks waren unvollständig, was zu Stale Closures und unerwartetem Verhalten führte.

### Ursache 3: Falsche Komponenten-Struktur
Einige Komponenten waren als normale Funktionen statt als React-Komponenten strukturiert, was zu invaliden Hook-Calls führte.

### Auslöser
- Parallele Entwicklung mehrerer Dashboard-Komponenten
- Fehlende ESLint Regeln für React Hooks (siehe ts-ticket-04.md)
- Keine Pre-Commit Hooks für Build-Validierung

---

## Step-by-Step Resolution

### Schritt 1: Fehler identifizieren
```bash
# Build starten um Fehler zu sehen
cd /Users/jeremy/dev/SIN-Solver/dashboard
npm run build 2>&1 | tee build-error.log

# Spezifische Hook-Fehler filtern
grep -n "React Hook" build-error.log
grep -n "Invalid hook" build-error.log
```

### Schritt 2: ESLint Konfiguration hinzufügen
```bash
# eslint-plugin-react-hooks installieren
npm install --save-dev eslint-plugin-react-hooks

# .eslintrc.json aktualisieren (siehe ts-ticket-04.md für vollständige Config)
```

### Schritt 3: Hook-Regeln korrigieren

**Vorher (FALSCH):**
```javascript
// ❌ FALSCH: Hook bedingt aufrufen
function ServiceCard({ service }) {
  if (!service) return null;  // Early return vor Hooks!
  
  const [status, setStatus] = useState(service.status);
  useEffect(() => { ... }, []);
  
  return <div>...</div>;
}
```

**Nachher (RICHTIG):**
```javascript
// ✅ RICHTIG: Hooks immer am Anfang
function ServiceCard({ service }) {
  const [status, setStatus] = useState(service?.status || 'unknown');
  
  useEffect(() => {
    if (service) {
      setStatus(service.status);
    }
  }, [service]);  // Vollständige Dependencies
  
  if (!service) return null;  // Early return NACH Hooks
  
  return <div>...</div>;
}
```

### Schritt 4: Dependencies korrigieren

**Vorher:**
```javascript
useEffect(() => {
  fetchServices();
}, []);  // ❌ Fehlende Dependency
```

**Nachher:**
```javascript
useEffect(() => {
  fetchServices();
}, [fetchServices]);  // ✅ Vollständige Dependency

// Oder mit useCallback
const fetchServices = useCallback(() => {
  // ...
}, [/* dependencies */]);
```

### Schritt 5: Build testen
```bash
# Build erneut ausführen
npm run build

# Wenn erfolgreich, Development Server starten
npm run dev
```

---

## Commands & Code

### Installierte Dependencies
```bash
npm install --save-dev eslint-plugin-react-hooks
```

### ESLint Konfiguration (.eslintrc.json)
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:react-hooks/recommended"
  ],
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Korrigierte Hook-Patterns

**Pattern 1: Conditional Rendering nach Hooks**
```javascript
function ContainerCard({ container }) {
  // 1. Alle Hooks zuerst
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    setIsRunning(container?.status === 'running');
  }, [container]);
  
  // 2. Dann bedingtes Rendering
  if (!container) return <Skeleton />;
  
  // 3. JSX
  return <div>...</div>;
}
```

**Pattern 2: useCallback für Funktionen**
```javascript
const handleStart = useCallback(async () => {
  try {
    await startContainer(container.id);
    setIsRunning(true);
  } catch (error) {
    console.error('Failed to start:', error);
  }
}, [container.id]);  // Alle Dependencies
```

**Pattern 3: Custom Hooks extrahieren**
```javascript
// useContainerStatus.js
export function useContainerStatus(containerId) {
  const [status, setStatus] = useState('unknown');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!containerId) return;
    
    const fetchStatus = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/containers/${containerId}/status`);
        const data = await response.json();
        setStatus(data.status);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, [containerId]);
  
  return { status, isLoading };
}
```

---

## Sources & References

### Interne Referenzen
- **Related Ticket:** ts-ticket-04.md (ESLint Config fehlte)
- **Project AGENTS.md:** /Users/jeremy/dev/SIN-Solver/AGENTS.md
- **Dashboard Code:** /Users/jeremy/dev/SIN-Solver/dashboard/

### Externe Dokumentation
- **React Hooks Rules:** https://reactjs.org/docs/hooks-rules.html
- **ESLint Plugin:** https://www.npmjs.com/package/eslint-plugin-react-hooks
- **React Hooks Best Practices:** https://react.dev/reference/react

### Sessions
- **Session ID:** ses_3f40f1c6cffesZNdB9z155EPEv
- **Datum:** 2026-01-29
- **Agent:** sisyphus

---

## Prevention Measures

1. **ESLint immer konfigurieren** - Siehe ts-ticket-04.md
2. **Pre-commit Hooks** - Husky + lint-staged für automatische Prüfung
3. **CI/CD Build-Check** - Build muss in CI erfolgreich sein vor Merge
4. **Code Review** - Auf Hook-Regeln achten bei Reviews

---

## Verification

- [x] Build erfolgreich (`npm run build`)
- [x] Keine ESLint Fehler (`npm run lint`)
- [x] Development Server läuft (`npm run dev`)
- [x] Alle Dashboard-Komponenten rendern korrekt
- [x] Keine Console-Fehler bezüglich Hooks

---

**Erstellt:** 2026-01-30  
**Letzte Aktualisierung:** 2026-01-30  
**Verantwortlich:** Sisyphus Agent
