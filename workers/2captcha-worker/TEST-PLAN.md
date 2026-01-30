# 2Captcha Worker - Test Plan

## Test-CAPTCHA Seiten

### 1. 2Captcha Demo (Haupttest)
**URL:** https://2captcha.com/demo

**Verfügbare CAPTCHA-Typen:**
- ✅ Normal Captcha (Text) - EINFACH
- ✅ Image Captcha - MITTEL
- ✅ Click Captcha - MITTEL
- ✅ Rotate Captcha - SCHWER
- ✅ reCAPTCHA V2 - SCHWER
- ✅ GeeTest - SCHWER
- ✅ Cloudflare Turnstile - MITTEL
- ✅ Text Captcha - EINFACH
- ✅ MTCaptcha - MITTEL

### 2. Google reCAPTCHA Demo
**URL:** https://www.google.com/recaptcha/api2/demo

**Typ:** reCAPTCHA V2 Checkbox

### 3. Weitere Test-Seiten
- **https://www.textcaptchas.com/** - Text CAPTCHAs
- **https://captcha.com/demos/features/captcha-demo.aspx** - BotDetect
- **https://demo.hcaptcha.com/** - hCaptcha (wenn verfügbar)

---

## Test-Strategie

### Phase 1: Einfache CAPTCHAs (Text)
**Ziel:** Grundfunktionalität testen

**Test-Seite:** https://2captcha.com/demo → "Normal Captcha"

**Steps:**
1. Steel Browser öffnet Demo-Seite
2. Wartet auf CAPTCHA-Image
3. Screenshot machen
4. 3-Agent Consensus:
   - Agent 1: OCR (ddddocr)
   - Agent 2: Vision AI (Gemini)
   - Agent 3: Vision AI (Mistral)
5. Antwort eintragen
6. "Submit" klicken
7. Ergebnis prüfen

**Erfolg wenn:**
- CAPTCHA erkannt
- Lösung korrekt
- Keine Fehler

### Phase 2: Image CAPTCHAs
**Ziel:** Bilderkennung testen

**Test-Seite:** https://2captcha.com/demo → "Image Captcha"

**Steps:**
1. Bild-CAPTCHA laden
2. Vision AI analysiert Bild
3. Objekte/Grid identifizieren
4. Klicks simulieren
5. Ergebnis prüfen

### Phase 3: reCAPTCHA
**Ziel:** Komplexe CAPTCHAs

**Test-Seite:** https://www.google.com/recaptcha/api2/demo

**Steps:**
1. reCAPTCHA iframe laden
2. Checkbox klicken
3. Falls Bild-Challenge: Lösen
4. Submit

---

## Test-Checkliste

### Vor dem Test
- [ ] Steel Browser läuft (Port 3005)
- [ ] Worker Service gestartet
- [ ] 3 Vision Agents konfiguriert
- [ ] Demo-Seite erreichbar

### Während des Tests (Headfull)
- [ ] Browser öffnet sichtbar
- [ ] Navigation funktioniert
- [ ] CAPTCHA wird erkannt
- [ ] Screenshot wird gemacht
- [ ] 3 Agents antworten
- [ ] Consensus erreicht
- [ ] Antwort wird eingetragen
- [ ] Submit funktioniert
- [ ] Ergebnis wird angezeigt

### Nach dem Test
- [ ] Accuracy berechnet
- [ ] Logs geprüft
- [ ] Screenshots gespeichert
- [ ] Fehler dokumentiert

---

## Erwartete Ergebnisse

### Minimum (Akzeptabel)
- 70% Accuracy auf einfachen Text-CAPTCHAs
- 50% Accuracy auf Image-CAPTCHAs
- 30% Accuracy auf reCAPTCHA

### Ziel (Gut)
- 90% Accuracy auf Text-CAPTCHAs
- 75% Accuracy auf Image-CAPTCHAs
- 50% Accuracy auf reCAPTCHA

### Excellent (Production-Ready)
- 95%+ Accuracy auf Text-CAPTCHAs
- 85%+ Accuracy auf Image-CAPTCHAs
- 70%+ Accuracy auf reCAPTCHA

---

## Test-Durchführung

### Manuelle Beobachtung
User beobachtet den Bildschirm und bewertet:
- "CAPTCHA erkannt?" ✅/❌
- "Lösung korrekt?" ✅/❌
- "Geschwindigkeit OK?" ✅/❌
- "Verhalten menschlich?" ✅/❌

### Automatische Metriken
- Erkennungsrate
- Lösungsgenauigkeit
- Durchschnittliche Zeit
- Fehlertypen

---

## Fehlerbehandlung

### Wenn CAPTCHA nicht erkannt
1. Screenshot prüfen
2. Selector anpassen
3. Timeout erhöhen
4. Retry-Logik implementieren

### Wenn Lösung falsch
1. Vision AI Logs prüfen
2. Confidence-Threshold anpassen
3. Anderes Model testen
4. Training-Daten prüfen

### Wenn Submit fehlschlägt
1. Button-Selector prüfen
2. Form-Validation checken
3. JavaScript-Fehler suchen
4. Network-Requests analysieren

---

## Test-Start

```bash
# 1. Steel Browser starten (falls nicht läuft)
docker start agent-05-steel-browser

# 2. Worker im DEV-Modus starten
npm run dev

# 3. Test-Script ausführen
npm run test:demo

# 4. Browser beobachten!
# Der Browser öffnet sich sichtbar
# Du siehst jeden Schritt
```

---

## Erfolgskriterien für 2captcha.com

**Wenn alle Tests bestehen:**
- ✅ Text-CAPTCHAs: 95%+ Accuracy
- ✅ Image-CAPTCHAs: 85%+ Accuracy
- ✅ Keine offensichtlichen Bot-Muster
- ✅ Menschliches Verhalten

**Dann:**
- 2captcha Credentials eintragen
- Auf 2captcha.com wechseln
- Echte Tests durchführen
- Geld verdienen starten! 💰
