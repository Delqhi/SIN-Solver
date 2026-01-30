# 2Captcha Worker - Real-Time Accuracy Tracker

## Übersicht

Der **Real-Time Accuracy Tracker** ist ein Monitoring-System für den 2Captcha Worker, das kontinuierlich die Lösungsqualität überwacht und bei schlechter Performance automatisch stoppt.

## Features

### ✅ Core Features

1. **Real-Time Stats Tracking**
   - Gesamt-Accuracy berechnen
   - Last-10-Result Fenster (rolling window)
   - Konsekutive Fehler tracken
   - Skip-Rate überwachen

2. **Auto-Stop Mechanismen**
   - 🔴 Emergency Stop bei < 90% Gesamt-Accuracy
   - 🟡 Warning bei < 95% Last-10-Accuracy
   - 🟡 Warning bei > 30% Skip-Rate
   - 🟡 Warning bei 5+ konsekutiven Fehlern

3. **Persistent Storage**
   - JSON-basierte Stats-Speicherung
   - Session-History beibehalten
   - Automatisches Speichern nach jedem Submission

4. **Event System**
   - `SUBMISSION_RECORDED` - Jede Lösung wird geloggt
   - `WARNING_ACCURACY_DROP` - Last-10 unter 95%
   - `EMERGENCY_STOP` - Auto-Stop getriggert
   - `WARNING_SKIP_RATE_HIGH` - Zu viele Skips
   - `TRACKER_PAUSED` / `TRACKER_RESUMED` - Status-Änderungen

## Architektur

### Dateien

```
workers/2captcha-worker/src/
├── tracker.ts          # Main AccuracyTracker Klasse
├── result-checker.ts   # 2Captcha Feedback Parser
├── worker.ts           # CaptchaWorker Integration
└── index.ts           # Exports (TODO)
```

### Klassen

#### AccuracyTracker

```typescript
class AccuracyTracker extends EventEmitter {
  recordSubmission(answer: string, wasCorrect: boolean): void
  recordSkipped(): void
  checkTriggers(): void
  pause(): void
  resume(): void
  reset(): void
  getStats(): StatsObject
  getHourlyReport(): HourlyReport
  canContinue(): boolean
}
```

**Stats Object:**
```typescript
{
  total: number;              // Gesamt Submissions
  correct: number;            // Korrekte Lösungen
  skipped: number;            // Übersprungene Captchas
  currentAccuracy: string;    // % als String mit 2 Dezimalstellen
  last10Results: boolean[];   // Array der letzten 10 Ergebnisse
  last10Accuracy: string;     // % der letzten 10
  consecutiveErrors: number;  // Fehler hintereinander
  status: string;             // "RUNNING" | "PAUSED" | "STOPPED"
  sessionDurationMinutes: number;
  sessionStart: string;       // ISO timestamp
  lastUpdate: string;         // ISO timestamp
}
```

#### CaptchaResultChecker

```typescript
class CaptchaResultChecker {
  async checkResult(): Promise<boolean>
  async waitForFeedback(timeoutMs): Promise<{success, text}>
}
```

#### CaptchaWorker

```typescript
class CaptchaWorker {
  async solveCaptchas(maxDuration): Promise<void>
  pause(): void
  resume(): void
  stop(): void
  reset(): void
  getStats(): StatsObject
}
```

## Verwendung

### Grundsätzliches Setup

```typescript
import { chromium } from 'playwright';
import CaptchaWorker from './workers/2captcha-worker/src/worker';

const browser = await chromium.launch();
const page = await browser.newPage();

// Create worker instance
const worker = new CaptchaWorker(page, '/path/to/stats.json');

// Listen to events
worker.getTracker().on('EMERGENCY_STOP', (data) => {
  console.error('Worker stopped:', data.reason);
  // Handle graceful shutdown
});

// Start solving
await worker.solveCaptchas(60 * 60 * 1000); // 1 hour
```

### Event Handling

```typescript
const tracker = worker.getTracker();

// Log every submission
tracker.on('SUBMISSION_RECORDED', (data) => {
  console.log(`Accuracy: ${data.accuracy}%`);
});

// React to warnings
tracker.on('WARNING_ACCURACY_DROP', (data) => {
  console.warn(`Last 10: ${data.last10Accuracy}%`);
  // Maybe alert admin
});

// Handle emergency stop
tracker.on('EMERGENCY_STOP', (data) => {
  console.error(`STOPPED: ${data.reason}`);
  // Cleanup and exit
});
```

### Pause & Resume

```typescript
// Pause the worker
worker.pause();
console.log(worker.getStats());  // Still tracks, just paused

// Resume
worker.resume();
```

### Reset für neuen Session

```typescript
// After worker stops, reset für neuen Durchlauf
worker.reset();
await worker.solveCaptchas(60 * 60 * 1000);
```

## Accuracy Thresholds

| Threshold | Beschreibung | Aktion |
|-----------|-------------|--------|
| **< 90%** | Gesamtgenauigkeit | 🛑 EMERGENCY_STOP |
| **< 95%** | Last-10 Accuracy | 🟡 WARNING |
| **< 85%** | Last-10 Critical | 🛑 EMERGENCY_STOP |
| **5+** | Konsekutive Fehler | 🛑 EMERGENCY_STOP |
| **> 30%** | Skip-Rate | 🟡 WARNING |

## Persistent Storage Format

Stats werden in JSON gespeichert (default: `.captcha-tracker-stats.json`):

```json
{
  "total": 150,
  "correct": 142,
  "skipped": 5,
  "currentAccuracy": 94.67,
  "last10Results": [true, true, true, false, true, true, true, true, true, true],
  "hourlyAccuracy": [
    {"timestamp": 1706553600000, "accuracy": 95.2}
  ],
  "sessionStart": 1706550000000,
  "lastUpdate": 1706554200000,
  "consecutiveErrors": 0,
  "maxConsecutiveErrors": 5,
  "savedAt": "2024-01-30T18:30:00Z"
}
```

## Feedback Detection

Der `CaptchaResultChecker` prüft multiple Feedback-Indikatoren:

1. **Text Content**
   - "Correct", "OK", "Success", "Accepted"

2. **CSS Klassen**
   - `success` oder `correct` → ✅ Correct
   - `error` oder `wrong` → ❌ Wrong

3. **Selektoren** (Fallback-Reihenfolge)
   - `.feedback`
   - `.result`
   - `[data-test="feedback"]`
   - `.success-message`
   - `.error-message`
   - `.status-message`

## Best Practices

### 1. Immer Events beobachten

```typescript
// ❌ FALSCH: Ignoriere Events
worker.solveCaptchas();

// ✅ RICHTIG: Handle alle kritischen Events
tracker.on('EMERGENCY_STOP', handleStop);
tracker.on('WARNING_ACCURACY_DROP', handleWarning);
```

### 2. Stats regelmäßig checken

```typescript
// Log every 10 submissions
let lastLogged = 0;
tracker.on('SUBMISSION_RECORDED', (data) => {
  if (data.total - lastLogged >= 10) {
    console.log(`Progress: ${tracker.getStatusString()}`);
    lastLogged = data.total;
  }
});
```

### 3. Graceful Shutdown

```typescript
async function shutdown() {
  worker.stop();
  const stats = worker.getStats();
  console.log(`Final accuracy: ${stats.currentAccuracy}%`);
  await browser.close();
}
```

### 4. Recovery Strategy

```typescript
// Try multiple times with reset
for (let attempt = 1; attempt <= 3; attempt++) {
  worker.reset();
  await worker.solveCaptchas(30 * 60 * 1000); // 30 min per attempt
  
  const stats = worker.getStats();
  if (stats.status !== 'STOPPED') {
    break;  // Success
  }
  console.log(`Attempt ${attempt} failed, retrying...`);
}
```

## Debugging

### Verbose Logging

```typescript
// Enable all events
tracker.on('SUBMISSION_RECORDED', (data) => console.log('SUB:', data));
tracker.on('CAPTCHA_SKIPPED', (data) => console.log('SKIP:', data));
tracker.on('WARNING_ACCURACY_DROP', (data) => console.log('WARN:', data));
tracker.on('EMERGENCY_STOP', (data) => console.log('STOP:', data));
tracker.on('STORAGE_ERROR', (data) => console.log('ERR:', data));
```

### Check Stats Anytime

```typescript
// Get current stats
const stats = worker.getStats();
console.log(JSON.stringify(stats, null, 2));

// Get hourly report
const hourly = tracker.getHourlyReport();
console.log(`Last hour accuracy: ${hourly.averageLastHour}%`);
```

### File-based Analysis

```bash
# View stored stats
cat .captcha-tracker-stats.json | jq .

# Parse with Node
node -e "console.log(require('./.captcha-tracker-stats.json'))"
```

## Troubleshooting

### Problem: Auto-Stop wird zu früh getriggert

**Lösung**: Überprüfe Feedback-Detection
- Prüfe ob `.feedback` Element korrekt ist
- Füge Custom Selektoren in `CaptchaResultChecker` hinzu
- Debugge mit Page Screenshots

### Problem: Stats werden nicht gespeichert

**Lösung**: Check Dateisystem-Permissions
```bash
# Check write permission
touch /path/to/.captcha-tracker-stats.json
```

### Problem: Last-10 berechnet falsch

**Lösung**: Manuelle Verifikation
```typescript
const stats = tracker.getStats();
const correct = stats.last10Results.filter(r => r).length;
console.log(`Manual: ${correct}/10 = ${correct*10}%`);
```

## Performance

- **Memory**: < 10MB für 1000+ Submissions
- **Storage**: ~200 bytes pro Submission JSON
- **CPU**: Negligible (reine Tracking-Operationen)
- **I/O**: Async writes, non-blocking

## Erweiterungsmöglichkeiten

### 1. Webhook Alerts

```typescript
tracker.on('EMERGENCY_STOP', async (data) => {
  await fetch('https://example.com/alert', {
    method: 'POST',
    body: JSON.stringify(data)
  });
});
```

### 2. Dashboard Integration

```typescript
app.get('/api/tracker/stats', (req, res) => {
  res.json(worker.getStats());
});
```

### 3. Machine Learning

```typescript
// Predict quality drop before it happens
if (shouldAnticipateFailure(stats)) {
  worker.pause();  // Prevent emergency stop
}
```

### 4. Multi-Worker Coordination

```typescript
// Share stats across multiple worker instances
const sharedStats = new SharedTrackerDB();
tracker.on('SUBMISSION_RECORDED', (data) => {
  sharedStats.record(data);
});
```

## Testing

```bash
# Run TypeScript compiler check
npx tsc --noEmit src/tracker.ts

# Build
npx tsc src/tracker.ts --outDir dist/
```

## Lizenz

MIT (or whatever your project uses)
