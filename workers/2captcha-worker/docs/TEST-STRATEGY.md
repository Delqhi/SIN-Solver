# Test-Strategie: Holy Trinity CAPTCHA Worker

**Projekt:** SIN-Solver workers/2captcha-worker  
**Datum:** 2026-01-30  
**Status:** Planungsphase  
**Agenten:** 3 parallele Hintergrundtasks aktiv

---

## 🎯 Test-Phasen

### Phase 1: Unit Tests (Woche 1)

**Ziel:** Einzelne Module isoliert testen

#### 1.1 Steel Browser CDP Tests
```typescript
describe('SteelBrowserCDP', () => {
  test('should connect to CDP endpoint')
  test('should navigate to URL')
  test('should take screenshot')
  test('should click element')
  test('should fill input field')
  test('should handle connection errors')
  test('should retry on failure')
})
```

#### 1.2 Mistral Vision Tests
```typescript
describe('MistralVision', () => {
  test('should analyze CAPTCHA image')
  test('should make decision from screenshot')
  test('should handle API errors')
  test('should parse JSON responses')
  test('should fallback on invalid JSON')
  test('should respect rate limits')
})
```

#### 1.3 Anti-Ban Module Tests
```typescript
describe('IP-Manager', () => {
  test('should detect IP changes')
  test('should calculate geo-distance')
  test('should enforce 15min cooldown')
  test('should trigger router reconnect')
})

describe('Humanizer', () => {
  test('should generate gaussian delays')
  test('should simulate typos')
  test('should vary mouse trajectories')
  test('should not be predictable')
})

describe('Session-Controller', () => {
  test('should manage login/logout')
  test('should persist fingerprints')
  test('should enforce trust-level')
})
```

### Phase 2: Integration Tests (Woche 2)

**Ziel:** Zusammenspiel der Module testen

#### 2.1 Holy Trinity Integration
```typescript
describe('HolyTrinityWorker Integration', () => {
  test('should initialize all components')
  test('should solve simple text CAPTCHA')
  test('should solve image CAPTCHA')
  test('should handle reCAPTCHA v2')
  test('should fallback on failure')
  test('should maintain session state')
})
```

#### 2.2 Anti-Ban Integration
```typescript
describe('Anti-Ban Integration', () => {
  test('should detect and handle IP ban')
  test('should rotate IP on flagging')
  test('should maintain human-like behavior')
  test('should recover from errors')
  test('should coordinate multiple accounts')
})
```

#### 2.3 End-to-End Workflow
```typescript
describe('E2E Workflow', () => {
  test('complete workflow: login → solve → logout')
  test('multiple CAPTCHAs in sequence')
  test('error recovery mid-workflow')
  test('performance under load')
})
```

### Phase 3: E2E Tests mit 2captcha.com (Woche 3)

**Ziel:** Reale Tests auf der Plattform

#### 3.1 Demo-Seite Tests
```bash
# Test auf 2captcha.com/demo
npm run test:e2e:demo

Tests:
- ✅ Normal CAPTCHA solving
- ✅ reCAPTCHA v2
- ✅ hCaptcha
- ✅ Image-based CAPTCHAs
```

#### 3.2 Live-System Tests (Vorsicht!)
```bash
# Test mit echtem Account (nur manuell!)
npm run test:e2e:live

Tests:
- ✅ Login-Prozess
- ✅ "Start Work" Navigation
- ✅ Echte CAPTCHA-Lösung
- ✅ Earnings-Tracking
- ✅ Account-Health-Check
```

### Phase 4: Performance & Belastungstests (Woche 4)

**Ziel:** Skalierbarkeit und Stabilität

#### 4.1 Lasttests
```typescript
describe('Performance Tests', () => {
  test('should handle 10 CAPTCHAs/minute')
  test('should handle 50 CAPTCHAs/minute')
  test('should maintain <5s response time')
  test('should not leak memory over 24h')
  test('should recover from high load')
})
```

#### 4.2 Langzeit-Tests
```bash
# 72-Stunden Dauertest
npm run test:longterm

Metriken:
- Success rate >95%
- Average solve time <10s
- Zero memory leaks
- Uptime 99.9%
```

### Phase 5: Anti-Detection Tests (Woche 5)

**Ziel:** Bot-Erkennung vermeiden

#### 5.1 Fingerprint-Tests
```bash
# Browser-Fingerprint-Konsistenz
test:fingerprint

Checks:
- Canvas fingerprint stable
- WebGL fingerprint stable
- User-Agent consistent
- No automation flags exposed
```

#### 5.2 Verhaltens-Tests
```bash
# Human-like behavior verification
test:behavior

Checks:
- Mouse movements natural
- Typing rhythm human-like
- Response times variable
- No predictable patterns
```

#### 5.3 Ban-Evasion Tests
```bash
# Test IP-Rotation und Recovery
test:ban-recovery

Scenarios:
- IP gets flagged → Rotate
- Account gets limited → Cooldown
- CAPTCHA difficulty increases → Adapt
```

---

## 📊 Test-Metriken

### Erfolgskriterien

| Metrik | Minimum | Ziel | Optimal |
|--------|---------|------|---------|
| **Solve Rate** | 85% | 95% | 98% |
| **Avg Response Time** | <15s | <10s | <5s |
| **False Positive Rate** | <5% | <2% | <1% |
| **Uptime** | 95% | 99% | 99.9% |
| **Memory Usage** | <500MB | <300MB | <200MB |
| **Ban Rate** | <10%/day | <5%/day | <2%/day |

### Monitoring

```typescript
// Metriken während Tests sammeln
interface TestMetrics {
  captchasSolved: number
  captchasFailed: number
  avgSolveTime: number
  minSolveTime: number
  maxSolveTime: number
  apiCalls: number
  apiErrors: number
  ipRotations: number
  bansDetected: number
  memoryUsage: number
  cpuUsage: number
}
```

---

## 🛠 Test-Infrastruktur

### Lokale Test-Umgebung

```bash
# 1. Steel Browser starten
docker start agent-05-steel-browser

# 2. Test-Datenbank starten
docker start captcha-postgres-dev

# 3. Redis Cache starten
docker start captcha-redis-dev

# 4. Tests ausführen
npm run test:unit
npm run test:integration
npm run test:e2e
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Holy Trinity Worker

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start Services
        run: docker-compose -f docker-compose.test.yml up -d
      
      - name: Unit Tests
        run: npm run test:unit
      
      - name: Integration Tests
        run: npm run test:integration
      
      - name: E2E Tests
        run: npm run test:e2e
      
      - name: Performance Tests
        run: npm run test:performance
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
```

---

## 🚨 Kritische Test-Szenarien

### Szenario 1: IP-Ban
```
1. Worker läuft normal
2. IP wird von 2captcha.com geflaggt
3. Watcher erkennt erhöhte Fehlerrate
4. IP-Manager triggert Router-Reconnect
5. 15-Minuten Cooldown
6. Worker resumed mit neuer IP
7. ✅ Test bestanden wenn kein Account-Ban
```

### Szenario 2: Rate Limiting
```
1. Worker löst 20 CAPTCHAs in 2 Minuten
2. API rate limit triggert
3. Circuit breaker öffnet
4. Exponentieller Backoff
5. Worker resumed nach cooldown
6. ✅ Test bestanden wenn graceful recovery
```

### Szenario 3: CAPTCHA-Type-Wechsel
```
1. Worker löst text-basierte CAPTCHAs
2. Plötzlich reCAPTCHA v2 erscheint
3. Auto-detection erkennt Typ-Wechsel
4. Strategy switch zu reCAPTCHA-Modus
5. Worker resumed mit neuer Strategie
6. ✅ Test bestanden wenn erfolgreich adaptiert
```

### Szenario 4: Account-Health-Degradation
```
1. Account hat hohes Trust-Level
2. Nach 100 CAPTCHAs sinkt Trust-Level
3. Health-Monitor erkennt Degradation
4. Automatische Pause + Cooldown
5. Trust-Level recovery Strategie
6. ✅ Test bestanden wenn Account gesund bleibt
```

---

## 📋 Test-Checklisten

### Vor jedem Release

- [ ] Alle Unit Tests passing (>90% coverage)
- [ ] Alle Integration Tests passing
- [ ] E2E Tests auf Demo-Seite passing
- [ ] Performance Tests: Response time <10s
- [ ] Memory leak test: 24h Dauertest
- [ ] Anti-detection test: Fingerprint konsistent
- [ ] Ban-recovery test: IP-Rotation funktioniert
- [ ] Dokumentation aktualisiert
- [ ] CHANGELOG.md aktualisiert
- [ ] Version bumped

### Vor Produktiv-Einsatz

- [ ] Live-Test mit kleinem Budget ($10)
- [ ] Account-Health über 48h überwacht
- [ ] Keine Bans oder Restrictions
- [ ] Earnings-Rate im erwarteten Bereich
- [ ] Support-Kontakt getestet (falls Probleme)
- [ ] Rollback-Plan bereit

---

## 🎯 Test-Automatisierung

### Nightly Tests
```bash
# Jede Nacht um 3 Uhr
0 3 * * * cd /workers/2captcha-worker && npm run test:nightly
```

Tests:
- Vollständiger E2E-Workflow
- 100 CAPTCHAs lösen
- Performance-Metriken sammeln
- Bericht generieren

### Weekly Load Tests
```bash
# Jeden Sonntag
0 2 * * 0 cd /workers/2captcha-worker && npm run test:load
```

Tests:
- 1000 CAPTCHAs in 1 Stunde
- Max load test
- Recovery test

---

## 📈 Test-Reporting

### Automatische Reports

```typescript
// Nach jedem Test-Run
interface TestReport {
  timestamp: string
  duration: number
  tests: {
    total: number
    passed: number
    failed: number
    skipped: number
  }
  metrics: TestMetrics
  coverage: {
    lines: number
    functions: number
    branches: number
  }
  artifacts: string[] // Screenshot paths
}
```

### Benachrichtigungen

- ❌ Test failure → Slack + Email
- ⚠️ Performance degradation → Slack
- ✅ All tests passing → Slack (daily summary)

---

## 🔄 Kontinuierliche Verbesserung

### Test-Driven Development

1. **Red:** Test schreiben (sollte failen)
2. **Green:** Code implementieren (Test sollte passen)
3. **Refactor:** Optimieren (Tests müssen weiterhin passen)

### Feedback-Loop

```
Test → Metriken → Analyse → Optimierung → Test
```

---

**Status:** Planung abgeschlossen, warte auf Agenten-Tasks  
**Nächster Schritt:** Tests implementieren nach Abschluss der Agenten-Tasks  
**Geschätzte Dauer:** 5 Wochen (alle Phasen)
