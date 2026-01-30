#!/usr/bin/env python3
"""Generate synthetic captcha dataset with various difficulty levels"""

import os
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random
import string

# Configuration
DATASET_DIR = Path("/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/dataset")
CATEGORIES = ["text_easy", "text_hard", "numbers_only", "mixed"]
IMAGES_PER_CATEGORY = 15

# Image settings
IMG_WIDTH, IMG_HEIGHT = 200, 80
FONT_SIZE = 40


def generate_random_text(category: str) -> str:
    """Generate random text based on category"""
    if category == "text_easy":
        return "".join(random.choices(string.ascii_uppercase, k=6))
    elif category == "text_hard":
        return "".join(random.choices(string.ascii_uppercase, k=5))
    elif category == "numbers_only":
        return "".join(random.choices(string.digits, k=6))
    elif category == "mixed":
        return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return ""


def add_noise(img: Image.Image) -> Image.Image:
    """Add noise and distortion to image"""
    # Add slight rotation
    angle = random.randint(-5, 5)
    img = img.rotate(angle, expand=False, fillcolor='white')
    
    # Add blur for hard difficulty
    if random.random() > 0.5:
        img = img.filter(ImageFilter.GaussianBlur(radius=0.5))
    
    return img


def create_captcha_image(text: str, difficulty: str = "easy") -> Image.Image:
    """Create a captcha image with given text"""
    # Create white background
    img = Image.new('RGB', (IMG_WIDTH, IMG_HEIGHT), color='white')
    draw = ImageDraw.Draw(img)
    
    # Try to use a system font, fallback to default
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", FONT_SIZE)
    except:
        font = ImageFont.load_default()
    
    # Add background lines/noise for hard difficulty
    if difficulty == "hard":
        for _ in range(random.randint(5, 10)):
            y1 = random.randint(0, IMG_HEIGHT)
            y2 = random.randint(0, IMG_HEIGHT)
            draw.line([(0, y1), (IMG_WIDTH, y2)], fill=(random.randint(200, 240), random.randint(200, 240), random.randint(200, 240)), width=1)
    
    # Calculate text position (centered)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (IMG_WIDTH - text_width) // 2
    y = (IMG_HEIGHT - text_height) // 2
    
    # Draw text
    text_color = (random.randint(0, 100), random.randint(0, 100), random.randint(0, 100))
    draw.text((x, y), text, font=font, fill=text_color)
    
    # Add noise if hard difficulty
    if difficulty == "hard":
        img = add_noise(img)
    
    return img


def generate_dataset():
    """Generate complete captcha dataset"""
    print("🎯 Generating captcha dataset...")
    
    # Create dataset directory
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    
    manifest = {"images": []}
    
    # Generate images for each category
    for category in CATEGORIES:
        category_dir = DATASET_DIR / category
        category_dir.mkdir(exist_ok=True)
        
        difficulty = "hard" if "hard" in category else "easy"
        num_images = IMAGES_PER_CATEGORY
        
        print(f"\n📁 {category} ({num_images} images, difficulty: {difficulty})")
        
        for i in range(num_images):
            # Generate unique text
            text = generate_random_text(category)
            
            # Create and save image
            img = create_captcha_image(text, difficulty)
            filename = f"{text}.png"
            filepath = category_dir / filename
            img.save(filepath)
            
            # Add to manifest
            manifest["images"].append({
                "filename": f"{category}/{filename}",
                "category": category,
                "ground_truth": text,
                "difficulty": difficulty,
                "width": IMG_WIDTH,
                "height": IMG_HEIGHT
            })
            
            print(f"  ✓ {filename}")
    
    # Save manifest
    manifest_path = DATASET_DIR / "manifest.json"
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\n✅ Dataset created successfully!")
    print(f"   Location: {DATASET_DIR}")
    print(f"   Total images: {len(manifest['images'])}")
    print(f"   Manifest: {manifest_path}")


if __name__ == "__main__":
    generate_dataset()
