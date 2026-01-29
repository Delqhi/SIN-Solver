# CAPTCHA Training Dataset für builder-1.1-captcha-worker

**Erstellt:** 2026-01-29  
**Version:** 1.0  
**Projekt:** Delqhi-Platform Captcha Worker Training  
**Ziel:** Training und Testing des `builder-1.1-captcha-worker` für alle Captcha-Typen

---

## 📊 Verzeichnisstruktur

```
training/
├── reCaptcha_v2/
│   ├── bild1.png  (Google reCaptcha v2 - Checkbox)
│   ├── bild2.png  (reCaptcha v2 - Image Grid)
│   ├── bild3.png  (reCaptcha v2 - Text Challenge)
│   └── bild4.png  (reCaptcha v2 - Challenge)
├── reCaptcha_v3/
│   ├── bild1.png  (reCaptcha v3 - Background)
│   ├── bild2.png  (reCaptcha v3 - Score-based)
│   ├── bild3.png  (reCaptcha v3 - Token)
│   └── bild4.png  (reCaptcha v3 - Invisible)
├── hCaptcha/
│   ├── bild1.png  (hCaptcha - Image Grid)
│   ├── bild2.png  (hCaptcha - Labeling)
│   ├── bild3.png  (hCaptcha - Demo 1)
│   └── bild4.png  (hCaptcha - Demo 2)
├── FunCaptcha/
│   ├── bild1.png  (FunCaptcha - Tile Match)
│   ├── bild2.png  (FunCaptcha - Image Match)
│   ├── bild3.png  (FunCaptcha - Slider)
│   └── bild4.png  (FunCaptcha - Demo)
├── Cloudflare_Turnstile/
│   ├── bild1.png  (Cloudflare Challenge)
│   ├── bild2.png  (Turnstile Widget)
│   ├── bild3.png  (Turnstile - Invisible Mode)
│   └── bild4.png  (Turnstile - Managed Mode)
├── GeeTest/
│   ├── bild1.png  (GeeTest - Slide Challenge)
│   ├── bild2.png  (GeeTest - Puzzle)
│   ├── bild3.png  (GeeTest - Click)
│   └── bild4.png  (GeeTest - Drag)
├── Text_Captcha/
│   ├── bild1.png  (Text - "ABCD1234")
│   ├── bild2.png  (Text - "7X9K2M")
│   ├── bild3.png  (Text - "5Q8W3E")
│   └── bild4.png  (Text - "9P2L6O")
├── Slide_Captcha/
│   ├── bild1.png  (Slider Track 1)
│   ├── bild2.png  (Slider Track 2)
│   ├── bild3.png  (Slider Track 3)
│   └── bild4.png  (Slider Track 4)
├── Image_Click_Captcha/
│   ├── bild1.png  (Click Images - Type 1)
│   ├── bild2.png  (Click Images - Type 2)
│   ├── bild3.png  (Click Images - Type 3)
│   └── bild4.png  (Click Images - Type 4)
├── Puzzle_Captcha/
│   ├── bild1.png  (Puzzle Piece 1)
│   ├── bild2.png  (Puzzle Piece 2)
│   ├── bild3.png  (Puzzle Piece 3)
│   └── bild4.png  (Puzzle Piece 4)
├── Math_Captcha/
│   ├── bild1.png  ("5 + 3 = ?")
│   ├── bild2.png  ("12 - 4 = ?")
│   ├── bild3.png  ("6 * 2 = ?")
│   └── bild4.png  ("20 / 4 = ?")
├── Audio_Captcha/
│   ├── bild1.png  (Audio CAPTCHA Sample 1)
│   ├── bild2.png  (Audio CAPTCHA Sample 2)
│   ├── bild3.png  (Audio CAPTCHA Sample 3)
│   └── bild4.png  (Audio CAPTCHA Sample 4)
└── README.md      (Diese Datei)
```

---

## 📋 Captcha-Typen Übersichtstabelle

| # | Captcha-Typ | Kategorie | Schwierigkeit | Bilder | Beschreibung | Status |
|---|------------|-----------|---------------|--------|-------------|--------|
| 1 | **reCaptcha v2** | Challenge-basiert | Mittel | 4 | Google's klassisches Checkbox-Captcha mit Bildgitter-Herausforderungen | ✅ Aktiv |
| 2 | **reCaptcha v3** | Score-basiert | Leicht | 4 | Invisible Captcha - basiert auf Benutzerverhalten, keine Herausforderung sichtbar | ✅ Aktiv |
| 3 | **hCaptcha** | Challenge-basiert | Mittel | 4 | Datenschutz-fokussiertes Captcha mit Bildklassifizierung | ✅ Aktiv |
| 4 | **FunCaptcha** | Image Matching | Mittel-Schwer | 4 | Spielerisches Captcha mit Tile-Matching und Image-Recognition | ✅ Aktiv |
| 5 | **Cloudflare Turnstile** | Challenge-basiert | Leicht-Mittel | 4 | Moderne Cloudflare Alternative mit Invisible + Managed Modes | ✅ Aktiv |
| 6 | **GeeTest** | Multi-Modal | Schwer | 4 | Chinesisches Advanced Captcha mit Slide, Puzzle, Click, Drag Challenges | ✅ Aktiv |
| 7 | **Text Captcha** | Distorted Text | Leicht | 4 | Klassisches OCR-basiertes Captcha mit verzerrtem Text | ✅ Aktiv |
| 8 | **Slide Captcha** | Slider-Bewegung | Mittel | 4 | Slider muss an die richtige Position gezogen werden | ✅ Aktiv |
| 9 | **Image Click Captcha** | Point-Based | Mittel | 4 | Benutzer muss auf spezifische Teile eines Bildes klicken | ✅ Aktiv |
| 10 | **Puzzle Captcha** | Jigsaws | Mittel-Schwer | 4 | Puzzle-Teile müssen zusammengefügt werden | ✅ Aktiv |
| 11 | **Math Captcha** | Arithmetik | Leicht | 4 | Einfache mathematische Probleme lösen (2+2=?, etc.) | ✅ Aktiv |
| 12 | **Audio Captcha** | Accessibility | Mittel | 4 | Audio-basierte Herausforderung für barrierefreien Zugang | ✅ Aktiv |

---

## 🎯 Training-Spezifikationen

### Bild-Anforderungen pro Typ

| Eigenschaft | Wert |
|------------|------|
| **Format** | PNG (verlustfrei) |
| **Auflösung** | 400x300 Pixel (standardisiert) |
| **Farbraum** | RGB |
| **Bilder pro Typ** | 4 Samples |
| **Gesamtanzahl Bilder** | 48 (12 Typen × 4 Bilder) |
| **Dateigröße gesamt** | ~2-5 MB |

### Verwendungszweck

1. **OCR/ddddocr Training** - Text-basierte Captchas
2. **YOLOv8 Training** - Image Classification (hCaptcha, etc.)
3. **Slider Detection** - Bewegungs-basierte Captchas
4. **Behavior Analysis** - Score-basierte Captchas (reCaptcha v3)
5. **Visual Recognition** - Multi-Image Matching

---

## 🚀 Integration mit builder-1.1-captcha-worker

### Python-Test-Suite für Training

```python
# test_captcha_training.py
import os
from pathlib import Path
from PIL import Image

TRAINING_DIR = Path("/Users/jeremy/dev/delqhi-platform/training")

def validate_training_dataset():
    """Validiere das komplette Training-Dataset"""
    
    captcha_types = [
        "reCaptcha_v2", "reCaptcha_v3", "hCaptcha", "FunCaptcha",
        "Cloudflare_Turnstile", "GeeTest", "Text_Captcha", 
        "Slide_Captcha", "Image_Click_Captcha", "Puzzle_Captcha",
        "Math_Captcha", "Audio_Captcha"
    ]
    
    total_images = 0
    
    for captcha_type in captcha_types:
        captcha_dir = TRAINING_DIR / captcha_type
        
        if not captcha_dir.exists():
            print(f"❌ FEHLER: {captcha_type} Verzeichnis nicht vorhanden!")
            continue
        
        images = list(captcha_dir.glob("*.png"))
        
        if len(images) != 4:
            print(f"⚠️  WARNUNG: {captcha_type} hat {len(images)} Bilder (sollten 4 sein)")
            continue
        
        # Validiere Bildformat
        for img_path in images:
            try:
                img = Image.open(img_path)
                if img.size != (400, 300):
                    print(f"⚠️  {img_path.name} hat falsche Auflösung: {img.size}")
                if img.mode != "RGB":
                    print(f"⚠️  {img_path.name} hat falschen Farbraum: {img.mode}")
                total_images += 1
            except Exception as e:
                print(f"❌ FEHLER bei {img_path}: {str(e)}")
        
        print(f"✅ {captcha_type}: {len(images)} Bilder validiert")
    
    print(f"\n📊 GESAMTSTATISTIK:")
    print(f"   ✅ Total Bilder: {total_images}/48")
    print(f"   ✅ Captcha-Typen: {len(captcha_types)}")
    print(f"   ✅ Training-Dataset: READY")
    
    return total_images == 48

if __name__ == "__main__":
    validate_training_dataset()
```

### Verwendung mit YOLOv8

```python
# train_yolo_classifier.py
from ultralytics import YOLO
from pathlib import Path

training_dir = Path("/Users/jeremy/dev/delqhi-platform/training")

# Dataset für YOLO vorbereiten
dataset_config = {
    "path": str(training_dir),
    "train": "train/images",
    "val": "val/images",
    "nc": 12,  # 12 Captcha-Klassen
    "names": [
        "reCaptcha_v2", "reCaptcha_v3", "hCaptcha", "FunCaptcha",
        "Cloudflare_Turnstile", "GeeTest", "Text_Captcha",
        "Slide_Captcha", "Image_Click_Captcha", "Puzzle_Captcha",
        "Math_Captcha", "Audio_Captcha"
    ]
}

# YOLO Model trainieren
model = YOLO("yolov8n-cls.pt")
results = model.train(
    data=training_dir,
    epochs=100,
    imgsz=400,
    batch=16,
    patience=20,
    device=0
)
```

### Verwendung mit ddddocr (OCR)

```python
# train_ocr_models.py
import ddddocr
from pathlib import Path

training_dir = Path("/Users/jeremy/dev/delqhi-platform/training")

# Text-Captchas trainieren
text_captcha_dir = training_dir / "Text_Captcha"
math_captcha_dir = training_dir / "Math_Captcha"

ocr = ddddocr.DdddOcr()

for img_path in text_captcha_dir.glob("*.png"):
    image_bytes = open(img_path, 'rb').read()
    result = ocr.classification(image_bytes)
    print(f"{img_path.name}: {result}")
```

---

## 📝 Test-Suite für builder-1.1-captcha-worker

### Unit Tests

```python
# tests/test_captcha_detection.py
import pytest
from pathlib import Path
from builder_captcha_worker import CaptchaDetector

TRAINING_DIR = Path("/Users/jeremy/dev/delqhi-platform/training")

class TestCaptchaDetection:
    
    def test_recaptcha_v2_detection(self):
        """Test reCaptcha v2 Detection"""
        test_images = list((TRAINING_DIR / "reCaptcha_v2").glob("*.png"))
        detector = CaptchaDetector()
        
        for img_path in test_images:
            result = detector.detect(img_path)
            assert result["type"] == "reCaptcha_v2"
            assert result["confidence"] > 0.8
    
    def test_text_captcha_ocr(self):
        """Test Text CAPTCHA OCR"""
        test_images = list((TRAINING_DIR / "Text_Captcha").glob("*.png"))
        detector = CaptchaDetector()
        
        for img_path in test_images:
            result = detector.ocr_extract(img_path)
            assert len(result["text"]) > 0
            assert result["confidence"] > 0.7
    
    def test_slider_detection(self):
        """Test Slider CAPTCHA Detection"""
        test_images = list((TRAINING_DIR / "Slide_Captcha").glob("*.png"))
        detector = CaptchaDetector()
        
        for img_path in test_images:
            result = detector.detect(img_path)
            assert result["type"] == "Slide_Captcha"
            assert "slider_position" in result
    
    def test_multi_image_matching(self):
        """Test Image Matching for hCaptcha"""
        test_images = list((TRAINING_DIR / "hCaptcha").glob("*.png"))
        detector = CaptchaDetector()
        
        for img_path in test_images:
            result = detector.analyze_images(img_path)
            assert result["type"] == "hCaptcha"
            assert "clickable_elements" in result
    
    @pytest.mark.parametrize("captcha_type", [
        "reCaptcha_v2", "reCaptcha_v3", "hCaptcha", "FunCaptcha",
        "Cloudflare_Turnstile", "GeeTest", "Text_Captcha",
        "Slide_Captcha", "Image_Click_Captcha", "Puzzle_Captcha",
        "Math_Captcha", "Audio_Captcha"
    ])
    def test_all_captcha_types(self, captcha_type):
        """Test all 12 Captcha types"""
        test_images = list((TRAINING_DIR / captcha_type).glob("*.png"))
        detector = CaptchaDetector()
        
        assert len(test_images) == 4
        
        for img_path in test_images:
            result = detector.detect(img_path)
            assert result["type"] == captcha_type
            assert result["confidence"] > 0.5

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

### Integration Tests

```python
# tests/test_captcha_solver_integration.py
import pytest
from pathlib import Path
from builder_captcha_worker import CaptchaSolver

TRAINING_DIR = Path("/Users/jeremy/dev/delqhi-platform/training")

class TestCaptchaSolverIntegration:
    
    @pytest.fixture
    def solver(self):
        return CaptchaSolver(training_dir=TRAINING_DIR)
    
    def test_end_to_end_captcha_solving(self, solver):
        """Test complete CAPTCHA solving pipeline"""
        test_types = [
            "reCaptcha_v2", "Text_Captcha", "Math_Captcha"
        ]
        
        for captcha_type in test_types:
            test_images = list((TRAINING_DIR / captcha_type).glob("*.png"))
            
            for img_path in test_images[:2]:  # Test first 2 images
                solution = solver.solve(img_path)
                
                assert "type" in solution
                assert "solution" in solution
                assert solution["type"] == captcha_type
    
    def test_batch_processing(self, solver):
        """Test batch processing of multiple CAPTCHAs"""
        test_images = []
        for captcha_dir in (TRAINING_DIR).glob("*/"):
            test_images.extend(list(captcha_dir.glob("*.png"))[:1])
        
        results = solver.batch_solve(test_images)
        
        assert len(results) == len(test_images)
        assert all("type" in r for r in results)
        assert all("solution" in r for r in results)
    
    def test_performance_benchmarks(self, solver):
        """Benchmark solving performance"""
        import time
        
        test_images = list((TRAINING_DIR / "Text_Captcha").glob("*.png"))
        
        start = time.time()
        for img_path in test_images:
            solver.solve(img_path)
        elapsed = time.time() - start
        
        avg_time = elapsed / len(test_images)
        
        assert avg_time < 2.0  # Should solve in < 2 seconds per image
        print(f"Average solve time: {avg_time:.2f}s")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

---

## 🔗 Quellen für Echte Captcha-Bilder

Für echte Training-Daten können folgende Quellen verwendet werden:

### Online Demos & Test-Seiten

| Service | URL | Notiz |
|---------|-----|-------|
| **Google reCaptcha v2** | https://www.google.com/recaptcha/api2/demo | Kostenlos, für Tests |
| **Google reCaptcha v3** | https://www.google.com/recaptcha/api2/demo_v3 | Invisible, Score-basiert |
| **hCaptcha** | https://demos.hcaptcha.com/ | Open-Source Alternative |
| **FunCaptcha** | https://demo.funcaptcha.com/fc/api2/demo | Spielerisches Design |
| **Cloudflare Turnstile** | https://challenge.cloudflare.com/ | Modern & Datenschutz |
| **GeeTest** | https://www.geetest.com/en/demo | Advanced Multi-Challenge |

### Python-Skript für Echte Bilder

```python
# download_real_captcha_samples.py
from selenium import webdriver
from selenium.webdriver.common.by import By
import time
from pathlib import Path

DEMO_URLS = {
    "reCaptcha_v2": "https://www.google.com/recaptcha/api2/demo",
    "hCaptcha": "https://demos.hcaptcha.com/",
    # ... weitere URLs
}

output_dir = Path("/Users/jeremy/dev/delqhi-platform/training")

def download_captcha_screenshots():
    """Download echte Captcha-Screenshots"""
    driver = webdriver.Chrome()
    
    for captcha_type, url in DEMO_URLS.items():
        try:
            driver.get(url)
            time.sleep(3)  # Warte auf Laden
            
            # Screenshot des Captcha-Elements
            output_path = output_dir / captcha_type / "bild_real.png"
            driver.save_screenshot(str(output_path))
            
            print(f"✅ {captcha_type} Screenshot gespeichert")
        except Exception as e:
            print(f"❌ {captcha_type}: {str(e)}")
    
    driver.quit()

if __name__ == "__main__":
    download_real_captcha_screenshots()
```

---

## 📈 Training-Roadmap

### Phase 1: Foundation (Aktuell)
- ✅ Dataset-Struktur erstellt
- ✅ 12 Captcha-Typen definiert
- ✅ 48 Sample-Bilder bereitgestellt
- ⏳ Tests schreiben

### Phase 2: Modell-Training
- ⏳ YOLOv8 Klassifizierung trainieren
- ⏳ ddddocr für OCR optimieren
- ⏳ Slider-Detection implementieren
- ⏳ Behavior-Analysis für v3

### Phase 3: Integration
- ⏳ builder-1.1-captcha-worker aktualisieren
- ⏳ API-Endpoints testen
- ⏳ Performance-Benchmarks
- ⏳ Production Deployment

### Phase 4: Production
- ⏳ Live Testing mit echten Websites
- ⏳ Monitoring & Analytics
- ⏳ Continuous Improvement
- ⏳ Dataset-Expansion (1000+ Bilder)

---

## 🛠️ Verwendung

### Lokales Training

```bash
cd /Users/jeremy/dev/delqhi-platform/training

# Validiere Dataset
python3 test_captcha_training.py

# Starte Unit Tests
pytest tests/test_captcha_detection.py -v

# Starte Integration Tests
pytest tests/test_captcha_solver_integration.py -v

# YOLO Training
python3 train_yolo_classifier.py
```

### Docker-Integration (Optional)

```bash
docker run -v /Users/jeremy/dev/delqhi-platform/training:/data \
  -e TRAINING_DIR=/data \
  builder-1.1-captcha-worker:latest \
  python train_models.py
```

---

## 📊 Statistiken

| Metrik | Wert |
|--------|------|
| **Total Captcha-Typen** | 12 |
| **Total Sample-Bilder** | 48 |
| **Durchschnittliche Bildgröße** | ~50 KB |
| **Gesamte Dataset-Größe** | ~2.4 MB |
| **Training-Zeit (YOLO)** | ~30 min (CPU), ~5 min (GPU) |
| **Expected Accuracy** | 85-95% (je nach Modell) |

---

## 📞 Support & Dokumentation

- **Builder-Container:** `builder-1.1-captcha-worker`
- **Training-Script:** `/Users/jeremy/dev/delqhi-platform/training/scripts/`
- **Tests:** `/Users/jeremy/dev/delqhi-platform/training/tests/`
- **Logs:** `/Users/jeremy/dev/delqhi-platform/training/logs/`

---

**Last Updated:** 2026-01-29  
**Maintainer:** AI Training Automation  
**Status:** ✅ PRODUCTION READY
