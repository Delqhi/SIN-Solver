# 2Captcha Worker - Final Documentation

## 🎯 Übersicht

Vollständiger automatisierter Worker für 2Captcha.com mit 3-Agent Consensus System und Anti-Ban Protection.

## ✅ Features

### Core Features
- **Steel Browser Automation** - Verbindet sich zum Steel Browser Docker Container
- **3-Agent Consensus** - Drei unabhängige AI-Modelle für höchste Genauigkeit
- **95% Accuracy Rule** - Nur submit wenn ≥95% Confidence
- **Anti-Ban Protection** - Menschliches Verhalten (Delays, Breaks, Work Hours)
- **Real-time Monitoring** - Accuracy Tracking mit Auto-Stop
- **Autonome Fehlerkorrektur** - KI korrigiert Workflow selbstständig

### Sicherheitsfeatures
- Auto-Stop bei <95% Accuracy (letzte 10)
- Emergency Stop bei <90% Overall
- Max 2.5h Sessions mit Breaks
- Human-like Delays (10-45s)
- 7% Skip Rate (Cannot Solve)

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    2Captcha Worker                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Steel Browser │  │  2captcha.com│  │   Dashboard  │      │
│  │  Controller  │──│    Website   │──│   Monitor    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                 │                                 │
│         ▼                 ▼                                 │
│  ┌──────────────────────────────────────────────┐          │
│  │           CAPTCHA Solving Pipeline           │          │
│  ├──────────────────────────────────────────────┤          │
│  │  1. Detect CAPTCHA (Screenshot)              │          │
│  │  2. Send to 3 Vision Agents                  │          │
│  │  3. Consensus Engine (95% Rule)              │          │
│  │  4. Submit OR Cannot Solve                   │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │              3-Agent System                   │          │
│  ├──────────────────────────────────────────────┤          │
│  │  Agent 1: Gemini Vision (Google)             │          │
│  │  Agent 2: Mistral Vision (OpenRouter)        │          │
│  │  Agent 3: Local OCR (ddddocr)                │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Installation

### 1. Voraussetzungen
- Docker (für Steel Browser)
- Node.js 18+
- npm

### 2. Setup

```bash
cd /Users/jeremy/dev/SIN-Solver/workers/2captcha-worker

# Dependencies installieren
npm install

# Environment konfigurieren
cp .env.example .env
# .env editieren mit deinen Credentials
```

### 3. Environment Variables

```env
# 2Captcha Credentials (werden erst bei echten Tests gebraucht)
TWOCAPTCHA_EMAIL=your-email@example.com
TWOCAPTCHA_PASSWORD=your-password

# Steel Browser (läuft als Docker Container)
STEEL_BROWSER_URL=http://localhost:3005

# Vision AI APIs
GEMINI_API_KEY=your-gemini-key
MISTRAL_API_KEY=your-mistral-key

# Monitoring
DASHBOARD_URL=http://localhost:3011
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

## 🚀 Usage

### Demo Test (Empfohlen zum Start)

Testet den Worker auf 2captcha.com/demo mit sichtbarem Browser:

```bash
npm run test:demo
```

Das macht:
1. Öffnet Browser (sichtbar)
2. Geht zu 2captcha.com/demo
3. Löst 10 Test-CAPTCHAs
4. Zeigt Accuracy an

### Production Start

```bash
npm start
```

## 📊 Test-Plan

### Phase 1: Demo Test (Text CAPTCHAs)
**Ziel:** Grundfunktionalität verifizieren

```bash
npm run test:demo
```

**Erwartet:**
- 90%+ Accuracy auf Text-CAPTCHAs
- Browser öffnet sichtbar
- Alle 10 Tests durchlaufen

### Phase 2: Echte 2captcha.com (nach erfolgreichem Demo)
**Ziel:** Echten Geldverdienst testen

1. Credentials in `.env` eintragen
2. `npm start` ausführen
3. Browser beobachten
4. Earnings im Dashboard tracken

**Wichtig:**
- Starte mit kleinem Budget ($5-10)
- Teste 1-2 Stunden
- Prüfe Accuracy
- Erhöhe erst wenn >95% stabil

## 🛡️ Safety Rules

### Automatische Schutzmaßnahmen

| Trigger | Aktion |
|---------|--------|
| Accuracy <95% (letzte 10) | ⚠️ Warning + Alert |
| Accuracy <90% overall | 🚨 Emergency Stop |
| 2.5h continuous work | 🛑 Auto-Break |
| Outside work hours (8-22) | ⏸️ Pause |
| 3+ Fehler in Folge | 🔍 Investigation Mode |

### Manueller Stop

```bash
# Worker stoppen
Ctrl+C

# Oder über Dashboard
# Oder: kill $(pgrep -f "2captcha-worker")
```

## 💰 Earnings

### Erwartete Raten
- Text CAPTCHA: $0.0003 - $0.001
- Image CAPTCHA: $0.001 - $0.003
- reCAPTCHA: $0.002 - $0.005

### Realistische Earnings
| Modus | CAPTCHAs/Tag | Earnings/Tag |
|-------|--------------|--------------|
| Konservativ | 100-200 | $0.10 - $0.40 |
| Moderat | 200-500 | $0.40 - $1.50 |
| Aggressiv | 500+ | $1.50+ |

**Wichtig:** Quality > Quantity! Lieber langsamer mit 98% Accuracy als schnell mit 90%.

## 🔧 Troubleshooting

### "Cannot connect to Steel Browser"
```bash
# Prüfe ob Container läuft
docker ps | grep steel

# Starte falls nötig
docker start agent-05-steel-browser
```

### "Accuracy too low"
1. Stop Worker sofort
2. Prüfe Vision AI APIs (Gemini/Mistral)
3. Erhöhe Confidence Threshold
4. Teste mit Demo erneut

### "2captcha account banned"
1. Akzeptiere Ban (kein Appeal möglich)
2. Dokumentiere was schiefging
3. Erstelle neuen Account:
   - Neue Email
   - Neues IP/VPN
   - Neue Payment Methode
4. Starte konservativer

## 📁 Datei-Struktur

```
2captcha-worker/
├── src/
│   ├── index.ts              # Entry point
│   ├── browser.ts            # Steel Browser Controller
│   ├── detector.ts           # CAPTCHA Detection
│   ├── consensus.ts          # 3-Agent Consensus
│   ├── anti-ban.ts           # Human Behavior
│   ├── accuracy-tracker.ts   # Real-time Tracking
│   ├── submitter.ts          # UI Automation
│   ├── worker.service.ts     # Main Service
│   ├── demo-test.ts          # Test Script
│   └── solvers/              # Vision AI Solvers
│       ├── ddddocr-solver.ts
│       ├── multi-agent-solver.ts
│       ├── skyvern-solver.ts
│       └── vision-model-solver.ts
├── package.json
├── tsconfig.json
├── .env.example
├── TEST-PLAN.md
└── README.md
```

## 🔗 Integrationen

### Dashboard
- Echtzeit-Accuracy
- Earnings Tracking
- Chat-Benachrichtigungen
- Workflow-Steuerung

### n8n
- Workflow-Automatisierung
- Autonome Fehlerkorrektur
- Conditional Logic
- Webhook Integration

### Telegram
- Alerts bei Problemen
- Daily Reports
- Emergency Stop
- Remote Control

## 📚 Weitere Dokumentation

- [Worker Rules](./worker-rules/worker-captcha/worker-2captcha.md)
- [Test Plan](./TEST-PLAN.md)
- [API Docs](./docs/api-reference/)

## ⚠️ Wichtige Hinweise

1. **NIEMALS** unter 95% Accuracy arbeiten
2. **IMMER** Demo-Test vor echten Tests
3. **KEINE** 24/7 Operation (max 8h/Tag)
4. **REGELMÄSSIG** Breaks einlegen
5. **DOKUMENTIERE** alle Bans/Fehler

## 🎯 Next Steps

1. ✅ **Demo Test ausführen**
   ```bash
   npm run test:demo
   ```

2. ✅ **Ergebnisse prüfen**
   - Accuracy >90%?
   - Alle Tests bestanden?
   - Keine Fehler?

3. ✅ **Echte Tests**
   - Credentials eintragen
   - Klein budget ($5-10)
   - 1-2h testen
   - Accuracy tracken

4. ✅ **Scale up**
   - Erhöhe Budget
   - Längere Sessions
   - Mehr CAPTCHAs/Tag

---

**Status:** ✅ Ready for Testing  
**Version:** 1.0.0  
**Last Updated:** 2026-01-30
