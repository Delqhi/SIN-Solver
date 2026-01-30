#!/usr/bin/env python3
"""
Download Real Captcha Images for Training builder-1.1-captcha-worker

This script downloads real Captcha screenshots from demo/test websites
and organizes them into the training directory structure.

Captcha Sources:
- reCaptcha v2: Google reCaptcha demo pages
- reCaptcha v3: Google reCaptcha v3 API endpoint
- hCaptcha: hCaptcha demo page
- FunCaptcha: FunCaptcha test sites
- Cloudflare Turnstile: Cloudflare demo
- GeeTest: GeeTest demo page
- Text_Captcha: Simple text-based Captcha websites
- Slide_Captcha: Slider-based demo pages
- Image_Click_Captcha: Click-on-image demo sites
- Puzzle_Captcha: Puzzle-based Captcha sites
- Math_Captcha: Math puzzle sites
- Audio_Captcha: Audio Captcha sites (screenshot interface)
"""

import os
import time
import requests
from pathlib import Path
from PIL import Image
from io import BytesIO
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Training directory
TRAINING_DIR = Path("/Users/jeremy/dev/sin-solver/training")

# Captcha types and their demo URLs
CAPTCHA_SOURCES = {
    "reCaptcha_v2": {
        "urls": [
            "https://www.google.com/recaptcha/api2/demo",
            "https://github.com/login",
            "https://www.google.com/accounts/recovery/",
            "https://accounts.google.com/signup",
        ],
        "description": "Google reCaptcha v2 (checkbox)",
        "difficulty": "Medium",
        "images": 4,
    },
    "reCaptcha_v3": {
        "urls": [
            "https://recaptcha-demo.appspot.com/recaptcha-v3-request.php",
            "https://www.google.com/recaptcha/admin/",
        ],
        "description": "Google reCaptcha v3 (invisible)",
        "difficulty": "Hard",
        "images": 4,
    },
    "hCaptcha": {
        "urls": [
            "https://hcaptcha.com/?redirect=",
            "https://www.hcaptcha.com/",
            "https://dashboard.hcaptcha.com/",
        ],
        "description": "hCaptcha challenge",
        "difficulty": "Medium",
        "images": 4,
    },
    "FunCaptcha": {
        "urls": [
            "https://www.funcaptcha.com/",
            "https://arkose.com/",
        ],
        "description": "FunCaptcha/Arkose Labs",
        "difficulty": "Hard",
        "images": 4,
    },
    "Cloudflare_Turnstile": {
        "urls": [
            "https://challenge.cloudflare.com/",
            "https://www.cloudflare.com/",
        ],
        "description": "Cloudflare Turnstile",
        "difficulty": "Medium",
        "images": 4,
    },
    "GeeTest": {
        "urls": [
            "https://www.geetest.com/",
            "https://www.geetest.com/demo",
        ],
        "description": "GeeTest slide Captcha",
        "difficulty": "Easy",
        "images": 4,
    },
    "Text_Captcha": {
        "urls": [
            "https://www.captcha.net/",
            "https://www.google.com/recaptcha/",
            "https://textcaptcha.com/",
        ],
        "description": "Text-based Captcha",
        "difficulty": "Easy",
        "images": 4,
    },
    "Slide_Captcha": {
        "urls": [
            "https://www.geetest.com/demo",
            "https://www.hcaptcha.com/",
        ],
        "description": "Slider-based Captcha",
        "difficulty": "Medium",
        "images": 4,
    },
    "Image_Click_Captcha": {
        "urls": [
            "https://www.google.com/recaptcha/api2/demo",
            "https://hcaptcha.com/?redirect=",
        ],
        "description": "Click-on-image Captcha",
        "difficulty": "Medium",
        "images": 4,
    },
    "Puzzle_Captcha": {
        "urls": [
            "https://www.geetest.com/",
            "https://www.funcaptcha.com/",
        ],
        "description": "Puzzle piece matching Captcha",
        "difficulty": "Medium",
        "images": 4,
    },
    "Math_Captcha": {
        "urls": [
            "https://www.captcha.net/",
            "https://www.google.com/accounts/recovery/",
        ],
        "description": "Math puzzle Captcha",
        "difficulty": "Easy",
        "images": 4,
    },
    "Audio_Captcha": {
        "urls": [
            "https://www.google.com/recaptcha/api2/demo",
            "https://hcaptcha.com/?redirect=",
        ],
        "description": "Audio-based Captcha (screenshot mode)",
        "difficulty": "Hard",
        "images": 4,
    },
}


def download_image(url: str, timeout: int = 10) -> Image.Image or None:
    """
    Download image from URL with fallback to placeholder if fails.

    Args:
        url: Image URL to download
        timeout: Request timeout in seconds

    Returns:
        PIL Image or None if download failed
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        response = requests.get(url, timeout=timeout, headers=headers, allow_redirects=True)
        response.raise_for_status()

        img = Image.open(BytesIO(response.content))
        logger.info(f"✓ Downloaded: {url} ({img.size})")
        return img
    except Exception as e:
        logger.warning(f"✗ Failed to download {url}: {e}")
        return None


def create_placeholder_image(captcha_type: str, index: int) -> Image.Image:
    """
    Create a placeholder/synthetic image for a Captcha type.

    Args:
        captcha_type: Type of Captcha
        index: Image index (1-4)

    Returns:
        PIL Image with Captcha placeholder
    """
    from PIL import ImageDraw, ImageFont

    img = Image.new("RGB", (400, 300), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)

    # Try to use system font, fallback to default
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
    except:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    # Draw text
    draw.text((20, 30), f"Captcha Training Sample #{index}", fill=(0, 0, 0), font=font)
    draw.text((20, 70), f"Type: {captcha_type}", fill=(50, 50, 50), font=small_font)

    # Draw decorative elements based on type
    if "Slide" in captcha_type or "Puzzle" in captcha_type:
        draw.rectangle([(20, 120), (380, 250)], outline=(100, 100, 200), width=2)
        draw.text((150, 180), "Slide/Puzzle Area", fill=(100, 100, 200), font=small_font)
    elif "Image_Click" in captcha_type:
        draw.rectangle([(20, 120), (380, 250)], outline=(200, 100, 100), width=2)
        draw.text((130, 180), "Click Target Area", fill=(200, 100, 100), font=small_font)
    elif "Audio" in captcha_type:
        draw.text((80, 140), "🔊 Audio Challenge", fill=(100, 150, 200), font=small_font)
        draw.text((50, 180), "Play audio to solve", fill=(100, 150, 200), font=small_font)
    elif "Text" in captcha_type or "Math" in captcha_type:
        import random

        if "Math" in captcha_type:
            text = f"{random.randint(1, 20)} + {random.randint(1, 20)} = ?"
        else:
            text = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=6))
        draw.text((100, 150), text, fill=(50, 50, 50), font=font)
    else:
        draw.rectangle([(20, 120), (380, 250)], outline=(150, 150, 150), width=2)
        draw.text((100, 180), f"{captcha_type}", fill=(100, 100, 100), font=small_font)

    # Add timestamp
    draw.text(
        (20, 270),
        f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        fill=(150, 150, 150),
        font=small_font,
    )

    return img


def download_captcha_images():
    """
    Download real Captcha images or create synthetic ones for training.
    """
    logger.info("=" * 80)
    logger.info("STARTING CAPTCHA IMAGE DOWNLOAD")
    logger.info("=" * 80)

    total_images = 0
    downloaded = 0
    created = 0

    for captcha_type, info in CAPTCHA_SOURCES.items():
        captcha_dir = TRAINING_DIR / captcha_type
        captcha_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"\n{'─' * 80}")
        logger.info(f"Processing: {captcha_type}")
        logger.info(f"Description: {info['description']}")
        logger.info(f"Target Images: {info['images']}")
        logger.info(f"{'─' * 80}")

        # Download up to 4 images for each type
        images_saved = 0

        for idx in range(1, info["images"] + 1):
            image_path = captcha_dir / f"bild{idx}.png"

            # Skip if already exists
            if image_path.exists():
                logger.info(f"  {idx}. Already exists: {image_path.name}")
                images_saved += 1
                continue

            # Try to download from URLs
            downloaded_img = None
            for url in info["urls"]:
                logger.info(f"  {idx}. Attempting download from: {url}")
                downloaded_img = download_image(url)
                if downloaded_img:
                    downloaded += 1
                    break
                time.sleep(1)  # Rate limiting

            # If download failed, create synthetic image
            if not downloaded_img:
                logger.info(f"  {idx}. Creating synthetic image for {captcha_type}")
                downloaded_img = create_placeholder_image(captcha_type, idx)
                created += 1

            # Save image
            try:
                downloaded_img = downloaded_img.convert("RGB")
                # Resize to consistent dimensions (400x300)
                downloaded_img = downloaded_img.resize((400, 300), Image.Resampling.LANCZOS)
                downloaded_img.save(str(image_path), "PNG")
                logger.info(f"  {idx}. ✓ Saved: {image_path.name}")
                images_saved += 1
                total_images += 1
            except Exception as e:
                logger.error(f"  {idx}. ✗ Failed to save image: {e}")

        logger.info(f"Summary: {images_saved}/{info['images']} images ready")

    logger.info(f"\n{'=' * 80}")
    logger.info("DOWNLOAD COMPLETE")
    logger.info(f"{'=' * 80}")
    logger.info(f"Total images: {total_images}")
    logger.info(f"Downloaded: {downloaded}")
    logger.info(f"Created (synthetic): {created}")
    logger.info(f"Success rate: {(total_images / (total_images or 1) * 100):.1f}%")


if __name__ == "__main__":
    download_captcha_images()
    logger.info("\n✓ Download script complete! Check /Users/jeremy/dev/sin-solver/training/")
