# Zimmer-19: Captcha Worker

**Port:** 8019 | **IP:** 172.20.0.81

FREE captcha solving service using open-source AI models.

## 🎯 Purpose

Solves captchas without paid services:
- Text/OCR captchas (ddddocr)
- Slider captchas (template matching)
- Audio captchas (Whisper transcription)
- Image classification (YOLOv8 for hCaptcha)

## 🔧 Features

- **OCR Solver** - ddddocr for text recognition
- **Slider Solver** - Computer vision offset detection
- **Audio Solver** - OpenAI Whisper (local)
- **Image Classifier** - YOLOv8 for object detection
- **Click Detection** - Target coordinate detection

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/solve/ocr` | POST | Solve text captcha |
| `/solve/slider` | POST | Solve slider puzzle |
| `/solve/audio` | POST | Transcribe audio captcha |
| `/solve/image` | POST | Classify image captcha |
| `/solve/click` | POST | Find click targets |

## 🚀 Quick Start

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run server
python -m uvicorn src.main:app --host 0.0.0.0 --port 8019

# Docker
docker build -t sin-captcha-worker .
docker run -p 8019:8019 sin-captcha-worker
```

## 📁 Structure

```
zimmer-19-captcha-worker/
├── src/
│   ├── main.py              # FastAPI server
│   ├── __init__.py
│   └── solvers/
│       ├── __init__.py
│       ├── ocr_solver.py    # ddddocr text recognition
│       ├── slider_solver.py # Template matching
│       ├── audio_solver.py  # Whisper transcription
│       ├── image_classifier.py # YOLOv8
│       └── click_solver.py  # Coordinate detection
├── Dockerfile
└── requirements.txt
```

## 💰 Cost

**100% FREE** - All open-source models:
- ddddocr (OCR)
- OpenCV (computer vision)
- Whisper (audio)
- YOLOv8 (image classification)

---

**Version:** 1.0.0 | **Last Updated:** 2026-01-27
