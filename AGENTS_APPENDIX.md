---

## 🤖 INTELLIGENT CAPTCHA WORKER (2026-01-30) - REVOLUTIONARY UPDATE

**WICHTIG:** Der Worker ist KI-gesteuert, NICHT script-basiert!
**ARCHITEKTUR-UPDATE:** Steel Browser (CDP) + Skyvern + Mistral AI

### 🏆 THE HOLY TRINITY (Neue Architektur)

```
┌─────────────────────────────────────────────────────────────┐
│  OPTIMAL ARCHITECTURE - DO NOT DEVIATE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🧠 Skyvern (The Brain)                                     │
│     └─► AI Orchestrator                                     │
│     └─► Decision maker                                      │
│     └─► Error handler                                       │
│                                                              │
│  🖥️  agent-05-steel-browser (The Hands)                     │
│     └─► CDP-based browser (NOT Playwright!)                 │
│     └─► Real-time DOM updates                               │
│     └─► Port: 9223 (CDP), 3005 (API)                       │
│                                                              │
│  👁️  Mistral AI (The Eyes)                                  │
│     └─► Vision analysis                                     │
│     └─► Model: pixtral-12b-2409                            │
│     └─► 10x cheaper than OpenAI                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight:**
> "Steel Browser is the Ferrari, Skyvern is the F1 Driver, Mistral is the Navigator"
> Without the driver and navigator, the Ferrari won't win the race!

### KI-Modelle (Aktualisiert 2026-01-30)

| Modell | Verwendung | Status |
|--------|-----------|--------|
| `mistral/pixtral-12b-2409` | Vision (Bild-CAPTCHAs) | ✅ **AKTIV** |
| `mistral/mistral-small-latest` | Text/OCR | ✅ **AKTIV** |
| `opencode/kimi-k2.5-free` | Vision | ⛔ DEPRECATED (endpoint not working) |
| `opencode/glm-4.7-free` | Text | ⛔ DEPRECATED (endpoint not working) |
| `gemini-*` | Alles | ⛔ DEAKTIVIERT (nicht gelöscht!) |

### API Keys (in .env)

```env
# ⚠️  ABSOLUTE WARNING: NEVER DELETE THESE KEYS (MANDATE 0.21)
# ⚠️  If invalid, mark as DEPRECATED but KEEP the entry!

MISTRAL_API_KEY=lteNYoXTsKUz6oYLGEHdxs1OTLTAkaw4
OPENCODE_ZEN_API_KEY=sk-wsoDvbl0JOfbSk5lmYJ5JZEx3fzChVBAn9xdb5NkOKuaDCdjudzFyU2UJ975ozdT

DEFAULT_AI_PROVIDER=mistral
DEFAULT_VISION_MODEL=mistral/pixtral-12b-2409
```

### ⚠️ CRITICAL ARCHITECTURE RULES

**MANDATORY STACK (No Exceptions):**
1. **Browser Engine:** agent-05-steel-browser (CDP) ONLY
2. **Orchestrator:** Skyvern (primary) or Stagehand (fallback)
3. **Vision AI:** Mistral AI (pixtral-12b) ONLY

**FORBIDDEN (Never Use):**
- ❌ Direct Playwright (too slow, polling-based)
- ❌ OpenAI GPT-4V (too expensive)
- ❌ Hardcoded selectors (breaks easily)
- ❌ OpenCode CLI (not for browser automation)
- ❌ api.opencode.ai (tested: returns "Not Found")

### Features

1. **Natural Language**: User sagt "Gehe auf 2captcha.com...", KI versteht
2. **Real-time DOM**: CDP events instead of polling (10x faster)
3. **Cheap Vision**: Mistral 10x cheaper than OpenAI GPT-4V
4. **Self-Healing**: Skyvern finds alternatives bei Fehlern
5. **Rocket.Chat**: Benachrichtigt User bei Problemen
6. **Workflow Integration**: Perfekt in Delqhi-Platform eingebunden

### Dateien

- `/workers/2captcha-worker/src/truly-intelligent-demo.ts` - Haupt-Worker (to be refactored)
- `/workers/2captcha-worker/src/visual-mouse-tracker.ts` - Visual feedback
- `/workers/2captcha-worker/src/detector.ts` - Smarte CAPTCHA-Erkennung
- `/workers/2captcha-worker/AGENTS.md` - Lokale Dokumentation
- `/workers/2captcha-worker/.session-19-ses_3f9bc1908ffeVibfrKEY3Kybu5.md` - Session log

### Usage

```typescript
// 1. Connect to Steel Browser (CDP)
const steel = await connectToSteelBrowser('localhost:9223');

// 2. Skyvern orchestrates
const skyvern = new SkyvernOrchestrator(steel, mistralClient);
await skyvern.executeWorkflow("Löse CAPTCHAs auf 2captcha.com");
```

### Warum Diese Änderung?

**Problem mit alter Architektur:**
- OpenCode ZEN API endpoint funktioniert nicht ("Not Found")
- Playwright ist zu langsam (polling-basiert)
- OpenAI GPT-4V ist zu teuer

**Lösung (Neue Architektur):**
- Steel Browser CDP = Real-time (kein polling)
- Mistral AI = 10x günstiger als OpenAI
- Skyvern = AI-Orchestration statt hardcoded scripts

**ACHTUNG:** Niemals löschen! Nur deaktivieren wenn nötig!
