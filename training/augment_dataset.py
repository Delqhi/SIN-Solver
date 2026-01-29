#!/usr/bin/env python3
"""
Data Augmentation for CAPTCHA Training Dataset
Expands 48 base images → 240+ augmented images for better model training
"""

import os
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageEnhance
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

TRAINING_DIR = Path("/Users/jeremy/dev/sin-solver/training")
CAPTCHA_TYPES = [
    "reCaptcha_v2", "reCaptcha_v3", "hCaptcha", "FunCaptcha",
    "Cloudflare_Turnstile", "GeeTest", "Text_Captcha",
    "Slide_Captcha", "Image_Click_Captcha", "Puzzle_Captcha",
    "Math_Captcha", "Audio_Captcha"
]

def augment_image(image_path, output_dir, base_name, augmentation_id):
    """Apply augmentation to a single image"""
    try:
        img = Image.open(image_path)
        
        augmentations = []
        
        aug_1 = ImageEnhance.Brightness(img).enhance(1.2)
        augmentations.append(aug_1)
        
        aug_2 = ImageEnhance.Brightness(img).enhance(0.8)
        augmentations.append(aug_2)
        
        aug_3 = ImageEnhance.Contrast(img).enhance(1.3)
        augmentations.append(aug_3)
        
        aug_4 = ImageEnhance.Contrast(img).enhance(0.7)
        augmentations.append(aug_4)
        
        aug_5 = img.rotate(5, fillcolor=(255, 255, 255))
        augmentations.append(aug_5)
        
        aug_6 = img.rotate(-5, fillcolor=(255, 255, 255))
        augmentations.append(aug_6)
        
        aug_7 = img.transpose(Image.FLIP_LEFT_RIGHT)
        augmentations.append(aug_7)
        
        aug_8 = img.transpose(Image.FLIP_TOP_BOTTOM)
        augmentations.append(aug_8)
        
        aug_np = np.array(img)
        noise = np.random.normal(0, 5, aug_np.shape)
        aug_9_np = np.clip(aug_np + noise, 0, 255).astype(np.uint8)
        aug_9 = Image.fromarray(aug_9_np)
        augmentations.append(aug_9)
        
        aug_10 = ImageEnhance.Sharpness(img).enhance(1.5)
        augmentations.append(aug_10)
        
        for idx, aug_img in enumerate(augmentations, 1):
            output_path = output_dir / f"{base_name}_aug{augmentation_id}_{idx}.png"
            aug_img.save(output_path)
        
        return len(augmentations)
    except Exception as e:
        logger.error(f"Error augmenting {image_path}: {str(e)}")
        return 0

def run_augmentation():
    logger.info("=" * 80)
    logger.info("CAPTCHA DATASET AUGMENTATION - 48 → 240+ IMAGES")
    logger.info("=" * 80)
    
    total_original = 0
    total_augmented = 0
    
    for captcha_type in CAPTCHA_TYPES:
        captcha_dir = TRAINING_DIR / captcha_type
        
        if not captcha_dir.exists():
            logger.warning(f"Skipping {captcha_type} - directory not found")
            continue
        
        original_images = sorted(captcha_dir.glob("bild*.png"))
        
        if not original_images:
            logger.warning(f"No original images found in {captcha_type}")
            continue
        
        logger.info(f"\nAugmenting: {captcha_type}")
        logger.info(f"Original images: {len(original_images)}")
        
        aug_count = 0
        for idx, img_path in enumerate(original_images, 1):
            base_name = img_path.stem
            aug_created = augment_image(img_path, captcha_dir, base_name, idx)
            aug_count += aug_created
        
        total_original += len(original_images)
        total_augmented += aug_count
        
        logger.info(f"Augmented images created: {aug_count}")
        logger.info(f"Total for {captcha_type}: {len(original_images) + aug_count}")
    
    logger.info("\n" + "=" * 80)
    logger.info("AUGMENTATION COMPLETE")
    logger.info("=" * 80)
    logger.info(f"Original images: {total_original}")
    logger.info(f"Augmented images: {total_augmented}")
    logger.info(f"Total dataset size: {total_original + total_augmented}")
    logger.info(f"Expansion ratio: {(total_original + total_augmented) / total_original:.1f}x")
    logger.info("=" * 80)
    
    return total_original + total_augmented

if __name__ == "__main__":
    try:
        total = run_augmentation()
        print(f"\n✓ Dataset augmentation complete! Total images: {total}")
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        exit(1)
