#!/usr/bin/env python3
"""
Generate diverse captcha images for testing the 3-agent consensus system.
Creates sample captchas with different difficulty levels.
"""

import os
import random
import string
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import json
from pathlib import Path

# Configuration
CAPTCHA_WIDTH = 200
CAPTCHA_HEIGHT = 80
DATASET_BASE = "/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/dataset"

# Sample datasets
TEXT_EASY_SAMPLES = [
    "HELLO",
    "WORLD",
    "PYTHON",
    "CODE",
    "TEST",
    "EASY",
    "SIMPLE",
    "CLEAR",
    "BASIC",
    "QUICK",
    "CAPTCHA",
    "VERIFY",
    "PROOF",
    "LOGIN",
    "SECURE",
]

TEXT_HARD_SAMPLES = [
    "X9K2M",
    "Q4R7L",
    "W8N3P",
    "V2T6H",
    "B1F9G",
    "J5S8D",
    "E4A7C",
    "U2O6I",
    "Y3K9L",
    "Z1X4V",
]

NUMBERS_ONLY_SAMPLES = [
    "123456",
    "789012",
    "456789",
    "234567",
    "890123",
    "567890",
    "012345",
    "345678",
    "678901",
    "901234",
]

MIXED_SAMPLES = [
    "A1B2C3",
    "X9Y8Z7",
    "P4Q5R6",
    "M2N3O4",
    "K7L8J9",
    "D5E6F7",
    "G1H2I3",
    "S8T9U0",
    "W2X3Y4",
    "V6Z1A2",
]


def get_random_font_size():
    """Return random font size between 35-55"""
    return random.randint(35, 55)


def get_random_font():
    """Return a system font path"""
    fonts = [
        "/System/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
        "/Library/Fonts/Courier New.ttf",
    ]
    available = [f for f in fonts if os.path.exists(f)]
    if available:
        return random.choice(available)
    # Fallback to default
    return None


def add_noise(image, intensity=0.3):
    """Add random noise to image"""
    pixels = image.load()
    width, height = image.size
    for _ in range(int(width * height * intensity)):
        x = random.randint(0, width - 1)
        y = random.randint(0, height - 1)
        # Random pixel color
        color = tuple(random.randint(0, 255) for _ in range(3))
        pixels[x, y] = color
    return image


def add_lines(image, count=3):
    """Add random lines to image"""
    draw = ImageDraw.Draw(image)
    width, height = image.size
    for _ in range(count):
        x1 = random.randint(0, width)
        y1 = random.randint(0, height)
        x2 = random.randint(0, width)
        y2 = random.randint(0, height)
        color = tuple(random.randint(100, 200) for _ in range(3))
        draw.line([(x1, y1), (x2, y2)], fill=color, width=1)
    return image


def generate_easy_captcha(text):
    """Generate simple, clear captcha"""
    # White background
    image = Image.new("RGB", (CAPTCHA_WIDTH, CAPTCHA_HEIGHT), color="white")
    draw = ImageDraw.Draw(image)

    # Black text, centered
    font_size = 40
    font_path = get_random_font()
    try:
        font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    # Calculate text position to center it
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (CAPTCHA_WIDTH - text_width) // 2
    y = (CAPTCHA_HEIGHT - text_height) // 2

    draw.text((x, y), text, fill="black", font=font)

    # Minimal distortion - slight rotation
    angle = random.randint(-5, 5)
    image = image.rotate(angle, expand=False, fillcolor="white")

    return image


def generate_hard_captcha(text):
    """Generate distorted, noisy captcha"""
    # Colored background
    bg_color = tuple(random.randint(200, 255) for _ in range(3))
    image = Image.new("RGB", (CAPTCHA_WIDTH, CAPTCHA_HEIGHT), color=bg_color)
    draw = ImageDraw.Draw(image)

    # Random text color (dark)
    text_color = tuple(random.randint(0, 100) for _ in range(3))

    # Varied font size and position
    font_size = get_random_font_size()
    font_path = get_random_font()
    try:
        font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    # Random position
    x = random.randint(10, 30)
    y = random.randint(10, 30)

    draw.text((x, y), text, fill=text_color, font=font)

    # Add distortions
    image = add_noise(image, intensity=0.15)
    image = add_lines(image, count=random.randint(2, 5))

    # Slight blur
    image = image.filter(ImageFilter.GaussianBlur(radius=0.5))

    # Random rotation
    angle = random.randint(-15, 15)
    image = image.rotate(angle, expand=False, fillcolor=bg_color)

    # Random horizontal shift (shear effect)
    if random.random() > 0.5:
        image = ImageOps.mirror(image)

    return image


def generate_numbers_captcha(text):
    """Generate numeric captcha with moderate distortion"""
    bg_color = tuple(random.randint(220, 250) for _ in range(3))
    image = Image.new("RGB", (CAPTCHA_WIDTH, CAPTCHA_HEIGHT), color=bg_color)
    draw = ImageDraw.Draw(image)

    text_color = tuple(random.randint(20, 80) for _ in range(3))
    font_size = random.randint(35, 48)
    font_path = get_random_font()

    try:
        font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    x = random.randint(15, 35)
    y = random.randint(15, 35)

    draw.text((x, y), text, fill=text_color, font=font)

    # Moderate noise
    image = add_noise(image, intensity=0.1)
    image = add_lines(image, count=random.randint(1, 3))

    # Slight rotation
    angle = random.randint(-8, 8)
    image = image.rotate(angle, expand=False, fillcolor=bg_color)

    return image


def generate_mixed_captcha(text):
    """Generate alphanumeric captcha with high distortion"""
    bg_color = tuple(random.randint(200, 245) for _ in range(3))
    image = Image.new("RGB", (CAPTCHA_WIDTH, CAPTCHA_HEIGHT), color=bg_color)
    draw = ImageDraw.Draw(image)

    text_color = tuple(random.randint(0, 120) for _ in range(3))

    # Draw characters individually with variation
    font_size = random.randint(32, 45)
    font_path = get_random_font()

    try:
        font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    x_start = random.randint(10, 20)
    y_start = random.randint(15, 35)

    for i, char in enumerate(text):
        x = x_start + (i * 28)
        y = y_start + random.randint(-8, 8)
        draw.text((x, y), char, fill=text_color, font=font)

    # Higher noise
    image = add_noise(image, intensity=0.12)
    image = add_lines(image, count=random.randint(3, 6))

    # Blur
    image = image.filter(ImageFilter.GaussianBlur(radius=0.7))

    # Rotation
    angle = random.randint(-12, 12)
    image = image.rotate(angle, expand=False, fillcolor=bg_color)

    return image


def generate_dataset():
    """Generate all captcha samples"""
    categories = {
        "text_easy": (TEXT_EASY_SAMPLES, generate_easy_captcha),
        "text_hard": (TEXT_HARD_SAMPLES, generate_hard_captcha),
        "numbers_only": (NUMBERS_ONLY_SAMPLES, generate_numbers_captcha),
        "mixed": (MIXED_SAMPLES, generate_mixed_captcha),
    }

    manifest = {}

    for category, (samples, generator) in categories.items():
        category_path = os.path.join(DATASET_BASE, category)
        manifest[category] = []

        print(f"\n📊 Generating {category} captchas...")

        for text in samples:
            # Generate 1-2 variations per text
            for variation in range(random.randint(1, 2)):
                image = generator(text)
                filename = f"{text}_v{variation}.png"
                filepath = os.path.join(category_path, filename)

                image.save(filepath, "PNG")
                manifest[category].append(
                    {
                        "filename": filename,
                        "ground_truth": text,
                        "category": category,
                        "path": filepath,
                    }
                )
                print(f"  ✓ {filename}")

    # Save manifest
    manifest_path = os.path.join(DATASET_BASE, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\n✅ Manifest saved to {manifest_path}")

    # Print statistics
    total_images = sum(len(v) for v in manifest.values())
    print(f"\n📈 Dataset Statistics:")
    print(f"  Total images: {total_images}")
    for category, items in manifest.items():
        print(f"  {category}: {len(items)} images")


if __name__ == "__main__":
    print("🎨 Generating Captcha Dataset...")
    print(f"📁 Output directory: {DATASET_BASE}\n")
    generate_dataset()
    print("\n✨ Dataset generation complete!")
