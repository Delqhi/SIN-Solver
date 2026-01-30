#!/usr/bin/env python3
"""
YOLO v8 Classification Training for 12 Captcha Types
Augmented Dataset: 528 images (44 per type)

Phase 2.4: YOLO Model Training
Purpose: Train YOLOv8 Nano classifier on augmented CAPTCHA dataset
Input: 528 images (12 types × 44 images)
Output: model weights at runs/classify/captcha_classifier/weights/best.pt

Training Configuration:
  - Model: YOLOv8 Nano (yolov8n-cls)
  - Epochs: 100
  - Batch Size: 16
  - Image Size: 416
  - Train/Val Split: 80/20 (420 train, 108 val)
  - Learning Rate: 0.01 (default)
  - Patience: 20 (early stopping)
  - Device: GPU (0) or CPU (auto-select)

Expected Results:
  - Training time: 5-30 minutes (GPU/CPU dependent)
  - Training accuracy: 90-98%
  - Validation accuracy: 80-95%
  - Model size: ~20 MB

Author: AI Training Automation
Date: 2026-01-29
"""

import os
import sys
from pathlib import Path
from ultralytics import YOLO
import torch
import time
import json
from datetime import datetime

# Configuration
TRAINING_DIR = Path("/Users/jeremy/dev/SIN-Solver/training")
OUTPUT_DIR = Path("/Users/jeremy/dev/SIN-Solver/training/runs/classify/captcha_classifier")

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

TRAINING_CONFIG = {
    "model": "yolov8n-cls",  # YOLOv8 Nano Classification
    "epochs": 20,  # ⚡ OPTIMIZED: 100 → 20 epochs (5x faster)
    "imgsz": 320,  # ⚡ OPTIMIZED: 416 → 320 (smaller images)
    "batch": 8,  # ⚡ OPTIMIZED: 16 → 8 (less memory, faster)
    "patience": 10,  # ⚡ OPTIMIZED: 20 → 10 (early stopping)
    "device": 0 if torch.cuda.is_available() else "cpu",  # GPU or CPU
    "optimizer": "SGD",  # Optimizer
    "lr0": 0.01,  # Initial learning rate
    "lrf": 0.01,  # Final learning rate
    "momentum": 0.937,  # Optimizer momentum
    "weight_decay": 0.0005,  # L2 regularization
    "warmup_epochs": 2,  # ⚡ OPTIMIZED: 3 → 2 (faster warmup)
    "warmup_momentum": 0.8,  # Warmup momentum
    "warmup_bias_lr": 0.1,  # Warmup bias learning rate
    "close_mosaic": 5,  # ⚡ OPTIMIZED: 10 → 5 (fewer augmentation epochs)
    "hsv_h": 0.015,  # HSV hue augmentation
    "hsv_s": 0.7,  # HSV saturation augmentation
    "hsv_v": 0.4,  # HSV value augmentation
    "degrees": 0.0,  # Rotation augmentation
    "translate": 0.1,  # Translation augmentation
    "scale": 0.5,  # Scale augmentation
    "flipud": 0.0,  # Flip up-down
    "fliplr": 0.5,  # Flip left-right
    "mosaic": 1.0,  # Mosaic augmentation
    "perspective": 0.0,  # Perspective augmentation
    "save": True,  # Save training results
    "save_period": 5,  # ⚡ OPTIMIZED: 10 → 5 (save less frequently)
    "plots": False,  # ⚡ OPTIMIZED: Disable plots to save time
    "verbose": True,  # Verbose output
    "workers": 2,  # ⚡ OPTIMIZED: 4 → 2 (reduce CPU overhead)
    "seed": 42,  # Random seed for reproducibility
}


class CaptchaYOLOTrainer:
    """YOLO v8 Classification Training for Captcha Types"""

    def __init__(self, training_dir: Path, config: dict):
        self.training_dir = training_dir
        self.config = config
        self.model = None
        self.results = None
        self.start_time = None
        self.end_time = None

        # Device info
        self.device = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
        self.cuda_available = torch.cuda.is_available()

        print(f"\n{'=' * 80}")
        print(f"🚀 YOLO v8 CAPTCHA CLASSIFICATION TRAINING")
        print(f"{'=' * 80}")
        print(f"📍 Training Directory: {self.training_dir}")
        print(f"💻 Device: {self.device}")
        print(f"🔧 CUDA Available: {self.cuda_available}")
        print(f"{'=' * 80}\n")

    def validate_dataset(self) -> bool:
        """Validate dataset before training"""
        print("📋 VALIDATING DATASET...")

        total_images = 0
        type_counts = {}

        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = self.training_dir / captcha_type

            if not captcha_dir.exists():
                print(f"❌ ERROR: {captcha_type} directory not found!")
                return False

            images = list(captcha_dir.glob("*.png"))
            type_counts[captcha_type] = len(images)
            total_images += len(images)

            if len(images) != 44:
                print(f"❌ ERROR: {captcha_type} has {len(images)} images (expected 44)")
                return False

        print(f"✅ Dataset validation PASSED")
        print(f"   • Total images: {total_images}/528")
        print(f"   • Captcha types: {len(CAPTCHA_TYPES)}")
        print(f"   • Perfect balance: All types have 44 images each")

        return True

    def load_model(self) -> bool:
        """Load YOLOv8 Nano Classification model"""
        print("\n📦 LOADING YOLO MODEL...")

        try:
            model_name = self.config["model"]
            self.model = YOLO(f"{model_name}.pt")
            print(f"✅ Model loaded: {model_name}.pt")
            print(f"   • Model size: ~7 MB")
            print(f"   • Model type: Classification")
            print(f"   • Architecture: Nano (lightweight, fast)")
            return True
        except Exception as e:
            print(f"❌ ERROR loading model: {str(e)}")
            return False

    def train(self) -> bool:
        """Execute YOLO training"""
        print("\n🎓 STARTING TRAINING...")
        print(f"{'=' * 80}")
        print(f"Training Configuration:")
        print(f"  • Model: {self.config['model']}")
        print(f"  • Epochs: {self.config['epochs']}")
        print(f"  • Batch Size: {self.config['batch']}")
        print(f"  • Image Size: {self.config['imgsz']}")
        print(f"  • Device: {self.config['device']}")
        print(f"  • Learning Rate: {self.config['lr0']}")
        print(f"  • Early Stopping Patience: {self.config['patience']}")
        print(f"{'=' * 80}\n")

        try:
            self.start_time = time.time()

            # Train the model
            # YOLO will automatically create train/val split (80/20)
            # The 'data' parameter should point to the training directory (YOLO auto-detects structure)
            self.results = self.model.train(
                data=str(self.training_dir),  # Directory with class folders (YOLO auto-detects)
                epochs=self.config["epochs"],
                imgsz=self.config["imgsz"],
                batch=self.config["batch"],
                patience=self.config["patience"],
                device=self.config["device"],
                optimizer=self.config["optimizer"],
                lr0=self.config["lr0"],
                lrf=self.config["lrf"],
                momentum=self.config["momentum"],
                weight_decay=self.config["weight_decay"],
                warmup_epochs=self.config["warmup_epochs"],
                warmup_momentum=self.config["warmup_momentum"],
                warmup_bias_lr=self.config["warmup_bias_lr"],
                close_mosaic=self.config["close_mosaic"],
                hsv_h=self.config["hsv_h"],
                hsv_s=self.config["hsv_s"],
                hsv_v=self.config["hsv_v"],
                degrees=self.config["degrees"],
                translate=self.config["translate"],
                scale=self.config["scale"],
                flipud=self.config["flipud"],
                fliplr=self.config["fliplr"],
                mosaic=self.config["mosaic"],
                perspective=self.config["perspective"],
                save=self.config["save"],
                save_period=self.config["save_period"],
                plots=self.config["plots"],
                verbose=self.config["verbose"],
                workers=self.config["workers"],
                seed=self.config["seed"],
                project="runs/classify",
                name="captcha_classifier",
            )

            self.end_time = time.time()
            print(f"\n✅ TRAINING COMPLETED SUCCESSFULLY!")
            return True

        except Exception as e:
            print(f"\n❌ ERROR during training: {str(e)}")
            import traceback

            traceback.print_exc()
            return False

    def evaluate_results(self):
        """Evaluate training results"""
        if self.results is None:
            print("❌ No training results available")
            return

        print(f"\n{'=' * 80}")
        print(f"📊 TRAINING RESULTS SUMMARY")
        print(f"{'=' * 80}")

        # Training time
        if self.start_time and self.end_time:
            elapsed_time = self.end_time - self.start_time
            hours = int(elapsed_time // 3600)
            minutes = int((elapsed_time % 3600) // 60)
            seconds = int(elapsed_time % 60)
            print(f"\n⏱️  Training Time: {hours:02d}:{minutes:02d}:{seconds:02d}")

        # Model info
        print(f"\n🤖 Model Information:")
        print(f"   • Architecture: YOLOv8 Nano (yolov8n-cls)")
        print(f"   • Classes: 12 (Captcha types)")
        print(f"   • Training images: ~420 (80% of 528)")
        print(f"   • Validation images: ~108 (20% of 528)")

        # Results (if available from results object)
        print(f"\n📈 Performance Metrics:")
        if hasattr(self.results, "top1") and hasattr(self.results, "top5"):
            print(f"   • Top-1 Accuracy: {self.results.top1:.2%}")
            print(f"   • Top-5 Accuracy: {self.results.top5:.2%}")
        else:
            print(f"   • Training complete - detailed metrics in training logs")

        # Model location
        best_model_path = OUTPUT_DIR / "weights" / "best.pt"
        if best_model_path.exists():
            model_size_mb = best_model_path.stat().st_size / (1024 * 1024)
            print(f"\n💾 Model Save Location:")
            print(f"   • Path: {best_model_path}")
            print(f"   • Size: {model_size_mb:.2f} MB")

        # Next steps
        print(f"\n🚀 Next Steps:")
        print(f"   1. Verify model at: {best_model_path}")
        print(f"   2. Test model on validation set")
        print(f"   3. Phase 2.5: Train OCR models for Text/Math CAPTCHAs")
        print(f"   4. Phase 2.6: Create custom detection models")
        print(f"   5. Phase 2.7: Model evaluation and benchmarking")
        print(f"   6. Phase 3: Integration with builder-1.1-captcha-worker")

        print(f"\n{'=' * 80}\n")

    def verify_model_saved(self) -> bool:
        """Verify that best.pt was saved correctly"""
        print("\n✅ VERIFYING MODEL SAVE...")

        best_model_path = OUTPUT_DIR / "weights" / "best.pt"

        if not best_model_path.exists():
            print(f"❌ ERROR: Model not found at {best_model_path}")
            return False

        model_size_mb = best_model_path.stat().st_size / (1024 * 1024)

        print(f"✅ Model verified:")
        print(f"   • Path: {best_model_path}")
        print(f"   • Size: {model_size_mb:.2f} MB")
        print(f"   • Status: READY FOR USE")

        return True

    def run(self) -> bool:
        """Execute complete training pipeline"""

        # 1. Validate dataset
        if not self.validate_dataset():
            return False

        # 2. Load model
        if not self.load_model():
            return False

        # 3. Train
        if not self.train():
            return False

        # 4. Evaluate results
        self.evaluate_results()

        # 5. Verify model saved
        if not self.verify_model_saved():
            return False

        print(f"\n{'=' * 80}")
        print(f"🎉 PHASE 2.4 COMPLETE: YOLO TRAINING SUCCESSFUL!")
        print(f"{'=' * 80}\n")

        return True


def main():
    """Main entry point"""

    # Create trainer
    trainer = CaptchaYOLOTrainer(TRAINING_DIR, TRAINING_CONFIG)

    # Run training pipeline
    success = trainer.run()

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
