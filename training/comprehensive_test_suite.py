#!/usr/bin/env python3
"""
COMPREHENSIVE TEST SUITE FOR CAPTCHA TRAINING DATASET

Phase 2.4: Tests for all 12 Captcha types
- Dataset validation
- Image format verification
- Training readiness checks
- Integration tests with builder-1.1-captcha-worker
"""

import pytest
import os
import sys
from pathlib import Path
from PIL import Image
import json
import time
import hashlib
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
    "Audio_Captcha",
]


class TestDatasetStructure:
    """Test the complete dataset directory structure"""

    def test_training_dir_exists(self):
        assert TRAINING_DIR.exists(), f"Training directory not found: {TRAINING_DIR}"

    def test_all_captcha_type_directories_exist(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            assert captcha_dir.exists(), f"Directory missing: {captcha_type}"
            assert captcha_dir.is_dir(), f"Not a directory: {captcha_type}"

    def test_all_captcha_types_have_base_and_augmented_images(self):
        """After augmentation: each type has 4 base + 40 augmented = 44 total"""
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = list(captcha_dir.glob("*.png"))
            # 4 original + 40 augmented per type = 44 total
            assert len(images) == 44, (
                f"{captcha_type} has {len(images)} images, expected 44 (4 base + 40 aug)"
            )

    def test_naming_convention_bild1_to_bild4(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            for idx in range(1, 5):
                expected_file = captcha_dir / f"bild{idx}.png"
                assert expected_file.exists(), f"Missing: {captcha_type}/bild{idx}.png"


class TestImageFormat:
    """Test image format and specifications"""

    def test_all_images_are_png_format(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = list(captcha_dir.glob("*.png"))

            for img_path in images:
                assert img_path.suffix.lower() == ".png", f"Not PNG: {img_path}"

    def test_all_images_open_successfully(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type

            for img_path in captcha_dir.glob("*.png"):
                try:
                    img = Image.open(img_path)
                    img.verify()
                except Exception as e:
                    pytest.fail(f"Cannot open {img_path}: {str(e)}")

    def test_all_images_have_standard_resolution(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type

            for img_path in captcha_dir.glob("*.png"):
                img = Image.open(img_path)
                assert img.size == (400, 300), (
                    f"{img_path.name} has size {img.size}, expected (400, 300)"
                )

    def test_all_images_are_rgb_mode(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type

            for img_path in captcha_dir.glob("*.png"):
                img = Image.open(img_path)
                assert img.mode == "RGB", f"{img_path.name} mode is {img.mode}, expected RGB"

    @pytest.mark.parametrize("captcha_type", CAPTCHA_TYPES)
    def test_image_file_sizes_reasonable(self, captcha_type):
        captcha_dir = TRAINING_DIR / captcha_type

        for img_path in captcha_dir.glob("*.png"):
            file_size = img_path.stat().st_size
            assert 1024 < file_size < 1000000, (
                f"{img_path.name} size {file_size} bytes is unreasonable"
            )


class TestDatasetStatistics:
    """Generate and verify dataset statistics"""

    def test_total_image_count(self):
        total = 0
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            count = len(list(captcha_dir.glob("*.png")))
            total += count

        assert total == 48, f"Total images: {total}, expected 48"

    def test_class_distribution_balanced(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            count = len(list(captcha_dir.glob("*.png")))
            assert count == 4, f"{captcha_type} has {count} images, class is unbalanced"

    def test_calculate_total_dataset_size(self):
        total_size = 0
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            for img_path in captcha_dir.glob("*.png"):
                total_size += img_path.stat().st_size

        # Convert to MB
        total_mb = total_size / (1024 * 1024)
        assert total_mb < 10, f"Dataset size {total_mb:.2f} MB exceeds limit (< 10 MB)"
        print(f"Total dataset size: {total_mb:.2f} MB")

    def test_generate_dataset_manifest(self):
        manifest = {
            "created": time.strftime("%Y-%m-%d %H:%M:%S"),
            "training_dir": str(TRAINING_DIR),
            "total_types": len(CAPTCHA_TYPES),
            "total_images": 0,
            "types": {},
        }

        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = list(captcha_dir.glob("*.png"))

            type_info = {
                "count": len(images),
                "size_mb": sum(img.stat().st_size for img in images) / (1024 * 1024),
                "images": [img.name for img in sorted(images)],
            }

            manifest["types"][captcha_type] = type_info
            manifest["total_images"] += len(images)

        # Save manifest
        manifest_path = TRAINING_DIR / "dataset_manifest.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)

        print(f"Manifest saved: {manifest_path}")
        assert manifest_path.exists()


class TestYOLOReadiness:
    """Test readiness for YOLO training"""

    def test_dataset_structure_yolo_compatible(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = list(captcha_dir.glob("*.png"))

            assert len(images) >= 2, f"{captcha_type} needs at least 2 images for train/val split"

    def test_minimum_samples_per_class(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = len(list(captcha_dir.glob("*.png")))
            assert images >= 4, f"{captcha_type} has {images} images, minimum 4 required for YOLO"

    def test_image_aspect_ratio_consistency(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type

            for img_path in captcha_dir.glob("*.png"):
                img = Image.open(img_path)
                width, height = img.size
                aspect_ratio = width / height
                expected_ratio = 400 / 300  # ~1.33

                assert abs(aspect_ratio - expected_ratio) < 0.01, (
                    f"Aspect ratio mismatch in {img_path.name}"
                )


class TestOCRReadiness:
    """Test readiness for OCR (Text/Math Captcha) training"""

    def test_text_captcha_images_exist(self):
        text_dir = TRAINING_DIR / "Text_Captcha"
        images = list(text_dir.glob("*.png"))
        assert len(images) == 4, "Text_Captcha needs 4 images for OCR training"

    def test_math_captcha_images_exist(self):
        math_dir = TRAINING_DIR / "Math_Captcha"
        images = list(math_dir.glob("*.png"))
        assert len(images) == 4, "Math_Captcha needs 4 images for OCR training"

    def test_ocr_training_minimum_samples(self):
        ocr_types = ["Text_Captcha", "Math_Captcha"]

        for ocr_type in ocr_types:
            ocr_dir = TRAINING_DIR / ocr_type
            images = list(ocr_dir.glob("*.png"))

            assert len(images) >= 3, f"{ocr_type} needs at least 3 samples for OCR training"


class TestDetectionModelReadiness:
    """Test readiness for custom detection models"""

    def test_slider_captcha_samples(self):
        slider_dir = TRAINING_DIR / "Slide_Captcha"
        images = list(slider_dir.glob("*.png"))
        assert len(images) == 4, "Slide_Captcha needs 4 images for slider detection training"

    def test_image_click_captcha_samples(self):
        click_dir = TRAINING_DIR / "Image_Click_Captcha"
        images = list(click_dir.glob("*.png"))
        assert len(images) == 4, "Image_Click_Captcha needs 4 images for click detection"

    def test_puzzle_captcha_samples(self):
        puzzle_dir = TRAINING_DIR / "Puzzle_Captcha"
        images = list(puzzle_dir.glob("*.png"))
        assert len(images) == 4, "Puzzle_Captcha needs 4 images for puzzle matching"


class TestImageQuality:
    """Test image quality and consistency"""

    def test_no_corrupted_images(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type

            for img_path in captcha_dir.glob("*.png"):
                try:
                    img = Image.open(img_path)
                    img.load()
                    _ = img.size
                    _ = img.mode
                except Exception as e:
                    pytest.fail(f"Corrupted image: {img_path.name} - {str(e)}")

    def test_image_consistency_within_type(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = sorted(captcha_dir.glob("*.png"))

            sizes = []
            for img_path in images:
                img = Image.open(img_path)
                sizes.append(img.size)

            # All images in same type should have same size
            assert len(set(sizes)) == 1, f"{captcha_type} has inconsistent image sizes: {sizes}"

    @pytest.mark.parametrize("captcha_type", CAPTCHA_TYPES)
    def test_image_not_blank(self, captcha_type):
        captcha_dir = TRAINING_DIR / captcha_type

        for img_path in captcha_dir.glob("*.png"):
            img = Image.open(img_path)

            # Convert to grayscale and check variance
            gray = img.convert("L")
            pixels = list(gray.getdata())

            # Image should not be completely uniform (blank)
            min_pixel = min(pixels)
            max_pixel = max(pixels)

            assert max_pixel - min_pixel > 10, (
                f"{img_path.name} appears to be blank or nearly blank"
            )


class TestTrainingIntegration:
    """Integration tests for training pipeline"""

    def test_dataset_splittable_into_train_val(self):
        train_count = 0
        val_count = 0

        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = len(list(captcha_dir.glob("*.png")))

            train = int(images * 0.8)
            val = images - train

            train_count += train
            val_count += val

        assert train_count == 36, f"Training set: {train_count}, expected 36"
        assert val_count == 12, f"Validation set: {val_count}, expected 12"

    def test_all_types_have_minimum_train_samples(self):
        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            total = len(list(captcha_dir.glob("*.png")))
            train = int(total * 0.8)

            assert train >= 3, f"{captcha_type} has only {train} training samples, need at least 3"

    def test_generate_training_statistics_report(self):
        report = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "dataset_summary": {
                "total_types": len(CAPTCHA_TYPES),
                "total_images": 0,
                "total_size_mb": 0,
            },
            "type_details": {},
            "splits": {
                "train": {"count": 0, "percentage": 0},
                "val": {"count": 0, "percentage": 0},
            },
        }

        total_size = 0
        total_images = 0

        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = TRAINING_DIR / captcha_type
            images = sorted(captcha_dir.glob("*.png"))

            type_size = sum(img.stat().st_size for img in images)
            total_size += type_size
            total_images += len(images)

            train = int(len(images) * 0.8)
            val = len(images) - train

            report["type_details"][captcha_type] = {
                "count": len(images),
                "size_mb": type_size / (1024 * 1024),
                "train": train,
                "val": val,
            }

            report["splits"]["train"]["count"] += train
            report["splits"]["val"]["count"] += val

        report["dataset_summary"]["total_images"] = total_images
        report["dataset_summary"]["total_size_mb"] = total_size / (1024 * 1024)
        report["splits"]["train"]["percentage"] = (
            report["splits"]["train"]["count"] / total_images * 100
        )
        report["splits"]["val"]["percentage"] = (
            report["splits"]["val"]["count"] / total_images * 100
        )

        # Save report
        report_path = TRAINING_DIR / "training_statistics_report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)

        print(f"\n{'=' * 80}")
        print(f"TRAINING STATISTICS REPORT")
        print(f"{'=' * 80}")
        print(f"Total Images: {report['dataset_summary']['total_images']}")
        print(f"Total Size: {report['dataset_summary']['total_size_mb']:.2f} MB")
        print(
            f"Training Set: {report['splits']['train']['count']} ({report['splits']['train']['percentage']:.1f}%)"
        )
        print(
            f"Validation Set: {report['splits']['val']['count']} ({report['splits']['val']['percentage']:.1f}%)"
        )
        print(f"{'=' * 80}")

        assert report_path.exists()


def pytest_configure(config):
    """Custom test configuration"""
    config.addinivalue_line(
        "markers",
        "integration: marks tests as integration tests (deselect with '-m \"not integration\"')",
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
