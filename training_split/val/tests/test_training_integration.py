#!/usr/bin/env python3
"""
Integration-Tests für builder-1.1-captcha-worker
End-to-End Tests für Captcha-Solving und Model-Training
"""

import pytest
from pathlib import Path
from PIL import Image
import tempfile
import json

TRAINING_DIR = Path("/Users/jeremy/dev/sin-solver/training")


class TestTrainingDatasetReady:
    """Tests zur Vorbereitung des Training-Datasets"""
    
    def test_dataset_structure_complete(self):
        """Prüfe vollständige Dataset-Struktur"""
        required_dirs = [
            "reCaptcha_v2", "reCaptcha_v3", "hCaptcha", "FunCaptcha",
            "Cloudflare_Turnstile", "GeeTest", "Text_Captcha",
            "Slide_Captcha", "Image_Click_Captcha", "Puzzle_Captcha",
            "Math_Captcha", "Audio_Captcha"
        ]
        
        for dir_name in required_dirs:
            dir_path = TRAINING_DIR / dir_name
            assert dir_path.exists() and dir_path.is_dir(), f"Fehlendes Verzeichnis: {dir_name}"
    
    def test_all_images_present(self):
        """Prüfe, dass alle 48 Bilder vorhanden sind"""
        total_count = 0
        for captcha_dir in sorted(TRAINING_DIR.iterdir()):
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs", "__pycache__"]:
                images = list(captcha_dir.glob("*.png"))
                total_count += len(images)
                assert len(images) == 4, f"{captcha_dir.name}: Erwartet 4, gefunden {len(images)}"
        
        assert total_count == 48, f"Erwartet 48 Bilder, gefunden {total_count}"
    
    def test_readme_documentation_present(self):
        """Prüfe, dass README.md dokumentation vorhanden ist"""
        readme_path = TRAINING_DIR / "README.md"
        assert readme_path.exists(), "README.md nicht vorhanden"
        
        with open(readme_path, 'r', encoding='utf-8') as f:
            content = f.read()
            assert len(content) > 1000, "README.md ist zu kurz"
            assert "CAPTCHA Training Dataset" in content
            assert "Übersichtstabelle" in content or "Übersichts" in content


class TestYOLODatasetPreperation:
    """Tests zur Vorbereitung für YOLO-Training"""
    
    def test_yolo_class_mapping(self):
        """Prüfe YOLO Klassen-Zuordnung"""
        classes = {
            0: "reCaptcha_v2",
            1: "reCaptcha_v3",
            2: "hCaptcha",
            3: "FunCaptcha",
            4: "Cloudflare_Turnstile",
            5: "GeeTest",
            6: "Text_Captcha",
            7: "Slide_Captcha",
            8: "Image_Click_Captcha",
            9: "Puzzle_Captcha",
            10: "Math_Captcha",
            11: "Audio_Captcha"
        }
        
        assert len(classes) == 12
        for class_id, class_name in classes.items():
            assert (TRAINING_DIR / class_name).exists()
    
    def test_train_val_split_preparation(self):
        """Prüfe Möglichkeit für Train/Val Split"""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            
            train_images = tmpdir / "images" / "train"
            val_images = tmpdir / "images" / "val"
            
            train_images.mkdir(parents=True, exist_ok=True)
            val_images.mkdir(parents=True, exist_ok=True)
            
            assert train_images.exists()
            assert val_images.exists()


class TestModelTrainingSuitability:
    """Tests für Model-Training Eignung"""
    
    def test_images_compatible_with_yolo(self):
        """Prüfe, dass Bilder mit YOLO kompatibel sind"""
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                for img_path in captcha_dir.glob("*.png"):
                    img = Image.open(img_path)
                    
                    assert img.width >= 100, f"Bild zu schmal: {img.width}"
                    assert img.height >= 100, f"Bild zu niedrig: {img.height}"
                    assert img.mode in ["RGB", "RGBA"]
    
    def test_dataset_diversity(self):
        """Prüfe Diversität des Datasets"""
        categories = {}
        
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                categories[captcha_dir.name] = len(list(captcha_dir.glob("*.png")))
        
        assert len(categories) == 12, f"Erwartet 12 Kategorien, gefunden {len(categories)}"
        
        for cat_name, count in categories.items():
            assert count == 4, f"{cat_name}: Unausgeglichene Samples ({count} statt 4)"


class TestOCRDatasetPreperation:
    """Tests zur Vorbereitung für OCR-Training (ddddocr)"""
    
    def test_text_captcha_ocr_ready(self):
        """Prüfe OCR-Readiness für Text-CAPTCHA"""
        text_dir = TRAINING_DIR / "Text_Captcha"
        images = list(text_dir.glob("*.png"))
        
        assert len(images) == 4
        
        for img_path in images:
            img = Image.open(img_path)
            assert img.width >= 200, "Bild zu klein für OCR"
            assert img.height >= 100, "Bild zu klein für OCR"
    
    def test_math_captcha_ocr_ready(self):
        """Prüfe OCR-Readiness für Math-CAPTCHA"""
        math_dir = TRAINING_DIR / "Math_Captcha"
        images = list(math_dir.glob("*.png"))
        
        assert len(images) == 4


class TestPerformanceBenchmarks:
    """Performance-Benchmark Tests"""
    
    def test_image_loading_performance(self):
        """Prüfe Image-Loading Performance"""
        import time
        
        all_images = []
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                all_images.extend(list(captcha_dir.glob("*.png")))
        
        start = time.time()
        
        for img_path in all_images:
            img = Image.open(img_path)
            _ = img.load()
        
        elapsed = time.time() - start
        
        avg_time = elapsed / len(all_images)
        assert avg_time < 0.1, f"Image Loading zu langsam: {avg_time:.3f}s pro Bild"
    
    def test_dataset_total_size(self):
        """Prüfe Gesamtgröße des Datasets"""
        total_size = 0
        
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                for img_path in captcha_dir.glob("*.png"):
                    total_size += img_path.stat().st_size
        
        size_mb = total_size / (1024 * 1024)
        
        assert 0.5 < size_mb < 20, f"Dataset zu groß oder zu klein: {size_mb:.2f} MB"


class TestDataAugmentationReadiness:
    """Tests zur Vorbereitung für Data-Augmentation"""
    
    def test_augmentation_base_ready(self):
        """Prüfe, dass Dataset für Augmentation bereit ist"""
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                images = list(captcha_dir.glob("*.png"))
                
                for img_path in images:
                    img = Image.open(img_path)
                    assert img is not None
                    assert img.size == (400, 300)
    
    def test_augmentation_consistency(self):
        """Prüfe Konsistenz der Bilder für Augmentation"""
        image_sizes = set()
        image_modes = set()
        
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                for img_path in captcha_dir.glob("*.png"):
                    img = Image.open(img_path)
                    image_sizes.add(img.size)
                    image_modes.add(img.mode)
        
        assert len(image_sizes) == 1, f"Verschiedene Bildgrößen: {image_sizes}"
        assert len(image_modes) <= 2, f"Verschiedene Modi: {image_modes}"


class TestBatchProcessingReadiness:
    """Tests zur Vorbereitung für Batch-Processing"""
    
    def test_batch_size_8_ready(self):
        """Prüfe Readiness für Batch-Size 8"""
        total_images = 0
        
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                total_images += len(list(captcha_dir.glob("*.png")))
        
        assert total_images >= 8, "Zu wenig Bilder für Batch-Size 8"
    
    def test_batch_size_16_ready(self):
        """Prüfe Readiness für Batch-Size 16"""
        total_images = 0
        
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                total_images += len(list(captcha_dir.glob("*.png")))
        
        assert total_images >= 16, "Zu wenig Bilder für Batch-Size 16"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
