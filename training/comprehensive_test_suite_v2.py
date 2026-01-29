#!/usr/bin/env python3
"""
COMPREHENSIVE TEST SUITE FOR CAPTCHA TRAINING DATASET - PHASE 2.3+

After data augmentation (48 → 528 images):
- 12 Captcha types
- 44 images per type (4 original + 40 augmented)
- 528 total images
- All tests validate augmented dataset readiness
"""

import pytest
import os
import sys
from pathlib import Path
from PIL import Image
import json
import time
from collections import defaultdict

TRAINING_DIR = Path("/Users/jeremy/dev/sin-solver/training")

CAPTCHA_TYPES = [
    "reCaptcha_v2",
    "reCaptcha_v3", 
    "hCaptcha",
    "FunCaptcha",
    "Cloudflare_Turnstile",
    "GeeTest",
    "Text_Captcha",
    "Slide_Captcha",
    "Image_Click_Captcha",
    "Puzzle_Captcha",
    "Math_Captcha",
    "Audio_Captcha"
]

class TestDatasetAfterAugmentation:
    """Tests for augmented dataset (528 images)"""
    
    def test_total_images_528(self):
        all_images = list(TRAINING_DIR.glob("*/*.png"))
        assert len(all_images) == 528, f"Expected 528 images, found {len(all_images)}"
    
    def test_each_type_has_44_images(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = list(captcha_dir.glob("*.png"))
            assert len(images) == 44, f"{captcha_type}: expected 44, found {len(images)}"
    
    def test_base_images_4_per_type(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            base_images = list(captcha_dir.glob("bild[1-4].png"))
            assert len(base_images) == 4, f"{captcha_type}: missing base images"
    
    def test_augmented_images_40_per_type(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            aug_images = list(captcha_dir.glob("*_aug*.png"))
            assert len(aug_images) == 40, f"{captcha_type}: expected 40 augmented, found {len(aug_images)}"
    
    def test_all_images_are_png(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            all_files = list(captcha_dir.glob("*"))
            png_files = list(captcha_dir.glob("*.png"))
            assert len(all_files) == len(png_files), f"{captcha_type}: contains non-PNG files"
    
    def test_all_images_valid_format(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            for img_path in captcha_dir.glob("*.png"):
                img = Image.open(img_path)
                assert img.size == (400, 300), f"{img_path.name}: wrong size {img.size}"
                assert img.mode == "RGB", f"{img_path.name}: wrong mode {img.mode}"
    
    def test_dataset_size_under_15mb(self):
        total_size = sum(f.stat().st_size for f in TRAINING_DIR.glob("*/*.png"))
        total_mb = total_size / (1024 * 1024)
        assert total_mb < 15, f"Dataset too large: {total_mb:.2f} MB (limit: 15 MB)"
    
    def test_no_corrupted_images(self):
        corrupted = []
        for img_path in TRAINING_DIR.glob("*/*.png"):
            try:
                img = Image.open(img_path)
                _ = img.tobytes()
            except Exception as e:
                corrupted.append((img_path.name, str(e)))
        
        assert len(corrupted) == 0, f"Corrupted images: {corrupted}"


class TestYOLOTrainingReadiness:
    """Tests for YOLO v8 classification training"""
    
    def test_minimum_images_per_class(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = len(list(captcha_dir.glob("*.png")))
            assert images >= 30, f"{captcha_type}: {images} < 30 (minimum for YOLO)"
    
    def test_balanced_class_distribution(self):
        counts = {}
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            count = len(list(captcha_dir.glob("*.png")))
            counts[captcha_type] = count
        
        # All classes should have 44 images (perfectly balanced)
        assert all(c == 44 for c in counts.values()), f"Unbalanced distribution: {counts}"
    
    def test_image_resolution_400x300(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            for img_path in captcha_dir.glob("*.png"):
                img = Image.open(img_path)
                assert img.size == (400, 300), f"{img_path.name}: {img.size} != (400, 300)"
    
    def test_rgb_color_space(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            for img_path in captcha_dir.glob("*.png"):
                img = Image.open(img_path)
                assert img.mode == "RGB", f"{img_path.name}: mode {img.mode} != RGB"
    
    def test_train_val_split_possible(self):
        # With 44 images per class: 35 train, 9 val (80/20)
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = list(captcha_dir.glob("*.png"))
            assert len(images) >= 20, f"{captcha_type}: {len(images)} too small for 80/20 split"


class TestOCRTrainingReadiness:
    """Tests for OCR model training (Text/Math Captchas)"""
    
    def test_text_captcha_augmented(self):
        text_dir = TRAINING_DIR / "Text_Captcha"
        images = list(text_dir.glob("*.png"))
        assert len(images) == 44, f"Text_Captcha: {len(images)} != 44"
    
    def test_math_captcha_augmented(self):
        math_dir = TRAINING_DIR / "Math_Captcha"
        images = list(math_dir.glob("*.png"))
        assert len(images) == 44, f"Math_Captcha: {len(images)} != 44"
    
    def test_ocr_training_samples_sufficient(self):
        ocr_types = ["Text_Captcha", "Math_Captcha"]
        for ocr_type in ocr_types:
            ocr_dir = TRAINING_DIR / ocr_type
            images = len(list(ocr_dir.glob("*.png")))
            assert images >= 40, f"{ocr_type}: {images} < 40 (minimum for OCR training)"


class TestDetectionModelReadiness:
    """Tests for custom detection models (Slider, Click, Puzzle)"""
    
    def test_slider_captcha_augmented(self):
        slider_dir = TRAINING_DIR / "Slide_Captcha"
        images = list(slider_dir.glob("*.png"))
        assert len(images) == 44, f"Slide_Captcha: {len(images)} != 44"
    
    def test_image_click_augmented(self):
        click_dir = TRAINING_DIR / "Image_Click_Captcha"
        images = list(click_dir.glob("*.png"))
        assert len(images) == 44, f"Image_Click_Captcha: {len(images)} != 44"
    
    def test_puzzle_captcha_augmented(self):
        puzzle_dir = TRAINING_DIR / "Puzzle_Captcha"
        images = list(puzzle_dir.glob("*.png"))
        assert len(images) == 44, f"Puzzle_Captcha: {len(images)} != 44"


class TestTrainingIntegration:
    """Integration tests for complete training pipeline"""
    
    def test_all_types_ready_for_yolo(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = list(captcha_dir.glob("*.png"))
            
            assert len(images) == 44
            
            for img_path in images:
                img = Image.open(img_path)
                assert img.size == (400, 300)
                assert img.mode == "RGB"
    
    def test_balanced_distribution_for_training(self):
        counts = defaultdict(int)
        
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            count = len(list(captcha_dir.glob("*.png")))
            counts[captcha_type] = count
        
        unique_counts = set(counts.values())
        assert len(unique_counts) == 1, f"Unbalanced: {counts}"
        assert list(unique_counts)[0] == 44
    
    def test_complete_dataset_statistics(self):
        stats = {
            "total_images": 0,
            "total_size_mb": 0,
            "types_count": 0,
            "images_per_type": {}
        }
        
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = list(captcha_dir.glob("*.png"))
            size_mb = sum(img.stat().st_size for img in images) / (1024 * 1024)
            
            stats["total_images"] += len(images)
            stats["total_size_mb"] += size_mb
            stats["images_per_type"][captcha_type] = len(images)
        
        stats["types_count"] = len(CAPTCHA_TYPES)
        
        assert stats["total_images"] == 528
        assert stats["total_size_mb"] < 15
        assert stats["types_count"] == 12
        
        print(f"\n📊 Dataset Statistics:")
        print(f"   Total Images: {stats['total_images']}")
        print(f"   Total Size: {stats['total_size_mb']:.2f} MB")
        print(f"   Types: {stats['types_count']}")


class TestAugmentationQuality:
    """Tests to verify augmentation quality"""
    
    def test_augmented_images_different_from_base(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            
            base_images = list(captcha_dir.glob("bild[1-4].png"))
            aug_images = list(captcha_dir.glob("*_aug*.png"))
            
            if len(base_images) > 0 and len(aug_images) > 0:
                base = Image.open(base_images[0])
                aug = Image.open(aug_images[0])
                
                assert base.size == aug.size, f"{captcha_type}: size mismatch"
                
                base_bytes = base.tobytes()
                aug_bytes = aug.tobytes()
                
                # Augmented should be different from base
                assert base_bytes != aug_bytes, f"{captcha_type}: aug not different from base"


def run_all_tests():
    """Run all test suites"""
    pytest.main([__file__, "-v", "--tb=short"])


if __name__ == "__main__":
    run_all_tests()
