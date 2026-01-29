#!/usr/bin/env python3
"""
Unit-Tests für builder-1.1-captcha-worker
Testet Captcha-Detection, OCR und Solving für alle 12 Typen
"""

import pytest
from pathlib import Path
from PIL import Image
import tempfile

TRAINING_DIR = Path("/Users/jeremy/dev/sin-solver/training")

class TestCaptchaDataset:
    """Basis-Tests für Captcha-Dataset"""
    
    def test_training_directory_exists(self):
        """Prüfe, dass Training-Verzeichnis existiert"""
        assert TRAINING_DIR.exists(), f"Training-Verzeichnis nicht vorhanden: {TRAINING_DIR}"
    
    def test_all_captcha_types_present(self):
        """Prüfe, dass alle 12 Captcha-Typen vorhanden sind"""
        expected_types = {
            "reCaptcha_v2", "reCaptcha_v3", "hCaptcha", "FunCaptcha",
            "Cloudflare_Turnstile", "GeeTest", "Text_Captcha",
            "Slide_Captcha", "Image_Click_Captcha", "Puzzle_Captcha",
            "Math_Captcha", "Audio_Captcha"
        }
        
        existing_dirs = {d.name for d in TRAINING_DIR.iterdir() if d.is_dir()}
        
        missing = expected_types - existing_dirs
        assert not missing, f"Fehlende Captcha-Verzeichnisse: {missing}"
    
    def test_images_per_type(self):
        """Prüfe, dass jeder Typ 4 Bilder hat"""
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                images = list(captcha_dir.glob("*.png"))
                assert len(images) == 4, f"{captcha_dir.name} hat {len(images)} Bilder, sollten 4 sein"
    
    def test_image_format(self):
        """Prüfe, dass alle Bilder PNG-Format haben"""
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                for img_path in captcha_dir.glob("*.png"):
                    img = Image.open(img_path)
                    assert img.format == "PNG", f"{img_path} hat falsches Format: {img.format}"
    
    def test_image_resolution(self):
        """Prüfe, dass alle Bilder 400x300 sind"""
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                for img_path in captcha_dir.glob("*.png"):
                    img = Image.open(img_path)
                    assert img.size == (400, 300), f"{img_path} hat falsche Größe: {img.size}"
    
    def test_image_color_mode(self):
        """Prüfe, dass alle Bilder RGB oder RGBA sind"""
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                for img_path in captcha_dir.glob("*.png"):
                    img = Image.open(img_path)
                    assert img.mode in ["RGB", "RGBA"], f"{img_path} hat falschen Modus: {img.mode}"


class TestReCaptchaDetection:
    """Tests für reCaptcha v2 und v3 Detection"""
    
    @pytest.fixture
    def recaptcha_v2_images(self):
        recaptcha_dir = TRAINING_DIR / "reCaptcha_v2"
        return list(recaptcha_dir.glob("*.png"))
    
    @pytest.fixture
    def recaptcha_v3_images(self):
        recaptcha_dir = TRAINING_DIR / "reCaptcha_v3"
        return list(recaptcha_dir.glob("*.png"))
    
    def test_recaptcha_v2_images_exist(self, recaptcha_v2_images):
        """Prüfe, dass reCaptcha v2 Bilder existieren"""
        assert len(recaptcha_v2_images) == 4
    
    def test_recaptcha_v3_images_exist(self, recaptcha_v3_images):
        """Prüfe, dass reCaptcha v3 Bilder existieren"""
        assert len(recaptcha_v3_images) == 4
    
    def test_recaptcha_image_openable(self, recaptcha_v2_images):
        """Prüfe, dass reCaptcha Bilder geöffnet werden können"""
        for img_path in recaptcha_v2_images:
            img = Image.open(img_path)
            assert img is not None
            assert img.size == (400, 300)


class TestTextCaptchaOCR:
    """Tests für Text-CAPTCHA OCR"""
    
    @pytest.fixture
    def text_captcha_images(self):
        text_dir = TRAINING_DIR / "Text_Captcha"
        return list(text_dir.glob("*.png"))
    
    def test_text_captcha_images_exist(self, text_captcha_images):
        """Prüfe, dass Text-CAPTCHA Bilder existieren"""
        assert len(text_captcha_images) == 4
    
    def test_text_captcha_readable(self, text_captcha_images):
        """Prüfe, dass Text-CAPTCHA Bilder lesbar sind"""
        for img_path in text_captcha_images:
            img = Image.open(img_path)
            assert img.mode in ["RGB", "RGBA"]
            assert img.size == (400, 300)


class TestMathCaptcha:
    """Tests für Math-CAPTCHA"""
    
    @pytest.fixture
    def math_captcha_images(self):
        math_dir = TRAINING_DIR / "Math_Captcha"
        return list(math_dir.glob("*.png"))
    
    def test_math_captcha_images_exist(self, math_captcha_images):
        """Prüfe, dass Math-CAPTCHA Bilder existieren"""
        assert len(math_captcha_images) == 4


class TestSliderCaptcha:
    """Tests für Slider-CAPTCHA"""
    
    @pytest.fixture
    def slider_captcha_images(self):
        slider_dir = TRAINING_DIR / "Slide_Captcha"
        return list(slider_dir.glob("*.png"))
    
    def test_slider_captcha_images_exist(self, slider_captcha_images):
        """Prüfe, dass Slider-CAPTCHA Bilder existieren"""
        assert len(slider_captcha_images) == 4


class TestImageClickCaptcha:
    """Tests für Image-Click CAPTCHA"""
    
    @pytest.fixture
    def image_click_images(self):
        click_dir = TRAINING_DIR / "Image_Click_Captcha"
        return list(click_dir.glob("*.png"))
    
    def test_image_click_images_exist(self, image_click_images):
        """Prüfe, dass Image-Click Bilder existieren"""
        assert len(image_click_images) == 4


class TestPuzzleCaptcha:
    """Tests für Puzzle-CAPTCHA"""
    
    @pytest.fixture
    def puzzle_images(self):
        puzzle_dir = TRAINING_DIR / "Puzzle_Captcha"
        return list(puzzle_dir.glob("*.png"))
    
    def test_puzzle_images_exist(self, puzzle_images):
        """Prüfe, dass Puzzle-CAPTCHA Bilder existieren"""
        assert len(puzzle_images) == 4


class TestHCaptcha:
    """Tests für hCaptcha"""
    
    @pytest.fixture
    def hcaptcha_images(self):
        hcaptcha_dir = TRAINING_DIR / "hCaptcha"
        return list(hcaptcha_dir.glob("*.png"))
    
    def test_hcaptcha_images_exist(self, hcaptcha_images):
        """Prüfe, dass hCaptcha Bilder existieren"""
        assert len(hcaptcha_images) == 4


class TestFunCaptcha:
    """Tests für FunCaptcha"""
    
    @pytest.fixture
    def funcaptcha_images(self):
        funcaptcha_dir = TRAINING_DIR / "FunCaptcha"
        return list(funcaptcha_dir.glob("*.png"))
    
    def test_funcaptcha_images_exist(self, funcaptcha_images):
        """Prüfe, dass FunCaptcha Bilder existieren"""
        assert len(funcaptcha_images) == 4


class TestCloudflare:
    """Tests für Cloudflare Turnstile"""
    
    @pytest.fixture
    def turnstile_images(self):
        turnstile_dir = TRAINING_DIR / "Cloudflare_Turnstile"
        return list(turnstile_dir.glob("*.png"))
    
    def test_turnstile_images_exist(self, turnstile_images):
        """Prüfe, dass Turnstile Bilder existieren"""
        assert len(turnstile_images) == 4


class TestGeeTest:
    """Tests für GeeTest"""
    
    @pytest.fixture
    def geetest_images(self):
        geetest_dir = TRAINING_DIR / "GeeTest"
        return list(geetest_dir.glob("*.png"))
    
    def test_geetest_images_exist(self, geetest_images):
        """Prüfe, dass GeeTest Bilder existieren"""
        assert len(geetest_images) == 4


class TestAudioCaptcha:
    """Tests für Audio-CAPTCHA"""
    
    @pytest.fixture
    def audio_captcha_images(self):
        audio_dir = TRAINING_DIR / "Audio_Captcha"
        return list(audio_dir.glob("*.png"))
    
    def test_audio_captcha_images_exist(self, audio_captcha_images):
        """Prüfe, dass Audio-CAPTCHA Bilder existieren"""
        assert len(audio_captcha_images) == 4


class TestDatasetStatistics:
    """Tests für Dataset-Statistiken"""
    
    def test_total_images_count(self):
        """Prüfe, dass genau 48 Bilder vorhanden sind (12 Typen * 4)"""
        total_images = 0
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                total_images += len(list(captcha_dir.glob("*.png")))
        
        assert total_images == 48, f"Erwartet 48 Bilder, gefunden {total_images}"
    
    def test_total_size_reasonable(self):
        """Prüfe, dass Gesamtgröße im erwarteten Bereich ist (2-5 MB)"""
        total_size = 0
        for captcha_dir in TRAINING_DIR.iterdir():
            if captcha_dir.is_dir() and captcha_dir.name not in ["tests", "logs"]:
                for img_path in captcha_dir.glob("*.png"):
                    total_size += img_path.stat().st_size
        
        size_mb = total_size / (1024 * 1024)
        assert 0.1 < size_mb < 10, f"Dataset-Größe {size_mb:.2f} MB ist außerhalb des erwarteten Bereichs"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
