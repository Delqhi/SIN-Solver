---

## 🤖 INTELLIGENT CAPTCHA WORKER (2026-01-30)

**WICHTIG:** Der Worker ist KI-gesteuert, NICHT script-basiert!

### Architektur

```
User Input (natürliche Sprache)
    ↓
IntelligentCaptchaWorker
    ↓
KI parst Anweisung → Workflow
    ↓
Selbstheilung bei Fehlern
    ↓
OpenCode ZEN Free Models
    ↓
Rocket.Chat Benachrichtigung
```

### KI-Modelle (Free - Token sparen!)

| Modell | Verwendung | Status |
|--------|-----------|--------|
| `opencode/kimi-k2.5-free` | Vision (Bild-CAPTCHAs) | ✅ AKTIV |
| `opencode/glm-4.7-free` | Text/OCR | ✅ AKTIV |
| `gemini-*` | Alles | ⛔ DEAKTIVIERT (nicht gelöscht!) |
| `mistral-*` | Alles | ⛔ DEAKTIVIERT (nicht gelöscht!) |

### API Keys (in .env)

```env
OPENCODE_ZEN_API_KEY=sk-wsoDvbl0JOfbSk5lmYJ5JZEx3fzChVBAn9xdb5NkOKuaDCdjudzFyU2UJ975ozdT
OPENCODE_ZEN_MODEL=grok-code
DEFAULT_AI_PROVIDER=opencode_zen
```

### Features

1. **Natural Language**: User sagt "Gehe auf 2captcha.com...", KI versteht
2. **API Caching**: Gleiche CAPTCHAs = Kein API Call = Token sparen
3. **Self-Healing**: Findet automatisch neue Selektoren bei Fehlern
4. **Rocket.Chat**: Benachrichtigt User bei Problemen
5. **Workflow Integration**: Perfekt in Delqhi-Platform eingebunden

### Dateien

- `/workers/2captcha-worker/src/intelligent-worker.ts` - Haupt-Worker
- `/workers/2captcha-worker/src/detector.ts` - Smarte CAPTCHA-Erkennung
- `/workers/2captcha-worker/AGENTS.md` - Diese Dokumentation

### Usage

```typescript
const worker = new IntelligentCaptchaWorker(browser, page, rocketChatWebhook);
await worker.executeInstruction("Gehe auf 2captcha.com und löse CAPTCHAs");
```

**ACHTUNG:** Niemals löschen! Nur deaktivieren wenn nötig!
