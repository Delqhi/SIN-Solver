#!/usr/bin/env python3
"""
CAPTCHA Sample Generator for Testing
Best Practices 2026 - SIN-Solver Testing Framework

Generates 60+ CAPTCHA samples across 12 types for testing:
- text (5 samples)
- math (5 samples)
- image_grid (5 samples)
- recaptcha (5 samples)
- hcaptcha (5 samples)
- geetest (5 samples)
- funcaptcha (5 samples)
- turnstile (5 samples)
- keycaptcha (5 samples)
- capy (5 samples)
- pixcaptcha (5 samples)
- confident (5 samples)
- ador_captcha (5 samples)

Plus edge cases: blurry, distorted, low contrast
"""

import os
import base64
import json
import random
import string
import numpy as np
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from typing import List, Tuple, Dict


class CaptchaGenerator:
    """Generate various CAPTCHA types for testing"""

    def __init__(self, output_dir: str = "/Users/jeremy/dev/SIN-Solver/tests/fixtures/captchas"):
        self.output_dir = output_dir
        self.ground_truth = {}

        # Ensure output directories exist
        self.types = [
            "text",
            "math",
            "image_grid",
            "recaptcha",
            "hcaptcha",
            "geetest",
            "funcaptcha",
            "turnstile",
            "keycaptcha",
            "capy",
            "pixcaptcha",
            "confident",
            "ador_captcha",
        ]
        for captcha_type in self.types:
            os.makedirs(os.path.join(output_dir, captcha_type), exist_ok=True)

    def random_text(self, length: int = 6) -> str:
        """Generate random text"""
        return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

    def random_math(self) -> Tuple[str, str]:
        """Generate random math problem and answer"""
        ops = ["+", "-", "*"]
        op = random.choice(ops)
        a, b = random.randint(1, 20), random.randint(1, 20)

        if op == "+":
            answer = str(a + b)
        elif op == "-":
            answer = str(a - b)
        else:
            answer = str(a * b)

        problem = f"{a} {op} {b}"
        return problem, answer

    def create_base_image(
        self, width: int = 200, height: int = 80, bg_color: str = "white"
    ) -> Image.Image:
        """Create base image"""
        return Image.new("RGB", (width, height), color=bg_color)

    def get_font(self, size: int = 36):
        """Get font for drawing"""
        font_paths = [
            "/System/Library/Fonts/Helvetica.ttc",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
        ]
        for path in font_paths:
            if os.path.exists(path):
                try:
                    return ImageFont.truetype(path, size)
                except:
                    pass
        return ImageFont.load_default()

    def add_noise(self, img: Image.Image, intensity: int = 30) -> Image.Image:
        """Add noise to image"""
        arr = np.array(img)
        noise = np.random.randint(-intensity, intensity, arr.shape, dtype=np.int16)
        arr = np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        return Image.fromarray(arr)

    def add_lines(self, img: Image.Image, num_lines: int = 3) -> Image.Image:
        """Add random lines to image"""
        draw = ImageDraw.Draw(img)
        width, height = img.size

        for _ in range(num_lines):
            x1, y1 = random.randint(0, width), random.randint(0, height)
            x2, y2 = random.randint(0, width), random.randint(0, height)
            draw.line([(x1, y1), (x2, y2)], fill="gray", width=2)

        return img

    def distort(self, img: Image.Image) -> Image.Image:
        """Apply distortion effects"""
        # Wave distortion
        arr = np.array(img)
        rows, cols, _ = arr.shape

        for i in range(rows):
            offset = int(5 * np.sin(2 * np.pi * i / 20))
            arr[i] = np.roll(arr[i], offset, axis=0)

        return Image.fromarray(arr)

    def save_captcha(self, img: Image.Image, captcha_type: str, name: str, ground_truth: str):
        """Save CAPTCHA image and record ground truth"""
        filepath = os.path.join(self.output_dir, captcha_type, f"{name}.png")
        img.save(filepath)

        if captcha_type not in self.ground_truth:
            self.ground_truth[captcha_type] = {}
        self.ground_truth[captcha_type][name] = ground_truth

    def generate_text_captchas(self, count: int = 5):
        """Generate text CAPTCHAs"""
        print("Generating text CAPTCHAs...")
        font = self.get_font(36)

        for i in range(count):
            text = self.random_text(6)

            # Standard
            img = self.create_base_image()
            draw = ImageDraw.Draw(img)
            draw.text((40, 20), text, fill="black", font=font)
            self.save_captcha(img, "text", f"text_{i:02d}", text)

            # Noisy variant
            img = self.create_base_image()
            draw = ImageDraw.Draw(img)
            draw.text((40, 20), text, fill="black", font=font)
            img = self.add_noise(img, 40)
            self.save_captcha(img, "text", f"text_{i:02d}_noisy", text)

            # With lines
            img = self.create_base_image()
            draw = ImageDraw.Draw(img)
            img = self.add_lines(img, 5)
            draw.text((40, 20), text, fill="black", font=font)
            self.save_captcha(img, "text", f"text_{i:02d}_lines", text)

    def generate_math_captchas(self, count: int = 5):
        """Generate math CAPTCHAs"""
        print("Generating math CAPTCHAs...")
        font = self.get_font(32)

        for i in range(count):
            problem, answer = self.random_math()

            img = self.create_base_image(width=180, height=80)
            draw = ImageDraw.Draw(img)
            draw.text((30, 25), problem + " = ?", fill="black", font=font)
            self.save_captcha(img, "math", f"math_{i:02d}", answer)

    def generate_image_grid_captchas(self, count: int = 5):
        """Generate image grid CAPTCHA mocks (hCaptcha/reCAPTCHA style)"""
        print("Generating image grid CAPTCHAs...")

        instructions = [
            "Select all squares with cars",
            "Select all squares with traffic lights",
            "Select all squares with buses",
            "Select all squares with crosswalks",
            "Select all squares with fire hydrants",
        ]

        for i in range(count):
            # Create 3x3 grid mock
            img = Image.new("RGB", (300, 300), color="lightgray")
            draw = ImageDraw.Draw(img)

            # Draw grid
            for x in range(0, 301, 100):
                draw.line([(x, 0), (x, 300)], fill="white", width=2)
            for y in range(0, 301, 100):
                draw.line([(0, y), (300, y)], fill="white", width=2)

            # Add random colored squares to simulate images
            for row in range(3):
                for col in range(3):
                    color = random.choice(["blue", "green", "red", "yellow", "purple"])
                    x, y = col * 100 + 5, row * 100 + 5
                    draw.rectangle([x, y, x + 90, y + 90], fill=color)

            self.save_captcha(img, "image_grid", f"grid_{i:02d}", instructions[i])

    def generate_recaptcha_captchas(self, count: int = 5):
        """Generate reCAPTCHA-style mocks"""
        print("Generating reCAPTCHA CAPTCHAs...")
        font = self.get_font(24)

        for i in range(count):
            img = self.create_base_image(width=300, height=100)
            draw = ImageDraw.Draw(img)

            text = self.random_text(8)
            draw.text((50, 30), text, fill="black", font=font)
            img = self.add_noise(img, 25)
            img = self.distort(img)

            self.save_captcha(img, "recaptcha", f"recaptcha_{i:02d}", text)

    def generate_hcaptcha_captchas(self, count: int = 5):
        """Generate hCaptcha-style mocks"""
        print("Generating hCaptcha CAPTCHAs...")

        challenges = [
            "Please click each image containing an airplane",
            "Please click each image containing a boat",
            "Please click each image containing a bicycle",
            "Please click each image containing a bridge",
            "Please click each image containing a chimney",
        ]

        for i in range(count):
            img = Image.new("RGB", (400, 400), color="white")
            draw = ImageDraw.Draw(img)

            # Draw instruction at top
            font_small = self.get_font(16)
            draw.text((20, 10), challenges[i], fill="black", font=font_small)

            # Draw 3x3 grid below
            for row in range(3):
                for col in range(3):
                    x, y = col * 130 + 10, row * 120 + 40
                    color = random.choice(["skyblue", "lightgreen", "lightcoral", "wheat"])
                    draw.rectangle([x, y, x + 120, y + 110], fill=color, outline="gray")

            self.save_captcha(img, "hcaptcha", f"hcaptcha_{i:02d}", challenges[i])

    def generate_geetest_captchas(self, count: int = 5):
        """Generate GeeTest-style slider CAPTCHA mocks"""
        print("Generating GeeTest CAPTCHAs...")

        for i in range(count):
            img = Image.new("RGB", (300, 150), color="#f0f0f0")
            draw = ImageDraw.Draw(img)

            # Slider track
            draw.rectangle([20, 100, 280, 120], fill="lightgray", outline="gray")

            # Slider button
            draw.rectangle([20, 90, 60, 130], fill="#4CAF50", outline="darkgreen")

            # Missing piece puzzle area
            piece_x = random.randint(100, 220)
            draw.rectangle([piece_x, 30, piece_x + 40, 70], fill="white", outline="red")

            self.save_captcha(img, "geetest", f"geetest_{i:02d}", str(piece_x))

    def generate_funcaptcha_captchas(self, count: int = 5):
        """Generate FunCaptcha-style mocks"""
        print("Generating FunCaptcha CAPTCHAs...")

        for i in range(count):
            img = Image.new("RGB", (250, 250), color="white")
            draw = ImageDraw.Draw(img)

            # Draw circular challenge area
            cx, cy = 125, 100
            r = 80
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill="lightgray", outline="black")

            # Draw instruction
            font = self.get_font(14)
            instructions = ["Rotate to upright", "Pick the animal", "Match the shape"]
            draw.text((50, 200), random.choice(instructions), fill="black", font=font)

            self.save_captcha(img, "funcaptcha", f"funcaptcha_{i:02d}", "rotate_90")

    def generate_turnstile_captchas(self, count: int = 5):
        """Generate Cloudflare Turnstile mocks"""
        print("Generating Turnstile CAPTCHAs...")

        for i in range(count):
            img = Image.new("RGB", (300, 80), color="white")
            draw = ImageDraw.Draw(img)

            # Checkbox mock
            draw.rectangle([20, 20, 50, 50], outline="gray", width=2)

            # Text
            font = self.get_font(16)
            draw.text((70, 25), "I'm not a robot", fill="black", font=font)

            # Logo area
            draw.ellipse([250, 20, 280, 50], fill="#f48120")

            self.save_captcha(img, "turnstile", f"turnstile_{i:02d}", "verified")

    def generate_keycaptcha_captchas(self, count: int = 5):
        """Generate KeyCaptcha mocks"""
        print("Generating KeyCaptcha CAPTCHAs...")

        for i in range(count):
            img = Image.new("RGB", (300, 200), color="#e8e8e8")
            draw = ImageDraw.Draw(img)

            # Scrambled pieces
            pieces = ["A", "B", "C", "D"]
            random.shuffle(pieces)

            for idx, piece in enumerate(pieces):
                x = idx * 70 + 20
                draw.rectangle([x, 50, x + 60, 110], fill="white", outline="black")
                font = self.get_font(24)
                draw.text((x + 20, 65), piece, fill="black", font=font)

            # Target area
            draw.rectangle([20, 140, 280, 180], fill="lightgray", outline="black")
            font_small = self.get_font(12)
            draw.text((80, 155), "Assemble: A-B-C-D", fill="black", font=font_small)

            self.save_captcha(img, "keycaptcha", f"keycaptcha_{i:02d}", "ABCD")

    def generate_capy_captchas(self, count: int = 5):
        """Generate Capy CAPTCHA mocks"""
        print("Generating Capy CAPTCHAs...")

        for i in range(count):
            img = Image.new("RGB", (200, 200), color="white")
            draw = ImageDraw.Draw(img)

            # Draw animal figure (simplified)
            # Body
            draw.ellipse([50, 80, 150, 140], fill="brown")
            # Head
            draw.ellipse([70, 40, 110, 80], fill="brown")
            # Instructions
            font = self.get_font(12)
            draw.text((30, 160), "Click the animal's head", fill="black", font=font)

            self.save_captcha(img, "capy", f"capy_{i:02d}", "90,60")

    def generate_pixcaptcha_captchas(self, count: int = 5):
        """Generate PixCAPTCHA mocks"""
        print("Generating PixCaptcha CAPTCHAs...")

        for i in range(count):
            img = Image.new("RGB", (250, 250), color="white")
            draw = ImageDraw.Draw(img)

            # Draw pixelated challenge
            colors = ["red", "green", "blue", "yellow"]
            for row in range(10):
                for col in range(10):
                    x, y = col * 25, row * 25
                    color = random.choice(colors)
                    draw.rectangle([x, y, x + 23, y + 23], fill=color)

            font = self.get_font(14)
            draw.text((20, 5), "Select: Red-Green-Blue", fill="black", font=font)

            self.save_captcha(img, "pixcaptcha", f"pixcaptcha_{i:02d}", "RGB")

    def generate_confident_captchas(self, count: int = 5):
        """Generate Confident CAPTCHA mocks"""
        print("Generating Confident CAPTCHAs...")

        for i in range(count):
            img = Image.new("RGB", (300, 200), color="#f5f5f5")
            draw = ImageDraw.Draw(img)

            # Image options
            options = ["Cat", "Dog", "Car", "Tree"]
            target = random.choice(options)

            for idx, opt in enumerate(options):
                y = idx * 45 + 20
                draw.rectangle([20, y, 50, y + 30], outline="gray")
                font = self.get_font(16)
                draw.text((60, y + 5), opt, fill="black", font=font)

            font_small = self.get_font(12)
            draw.text((20, 5), f"Select all images of: {target}", fill="black", font=font_small)

            self.save_captcha(img, "confident", f"confident_{i:02d}", target)

    def generate_ador_captchas(self, count: int = 5):
        """Generate Ador CAPTCHA mocks"""
        print("Generating Ador CAPTCHAs...")

        for i in range(count):
            img = Image.new("RGB", (280, 120), color="white")
            draw = ImageDraw.Draw(img)

            # Arithmetic problem
            a, b = random.randint(1, 10), random.randint(1, 10)
            answer = str(a + b)

            font = self.get_font(32)
            draw.text((80, 40), f"{a} + {b} = ?", fill="#333", font=font)

            # Decorative elements
            for _ in range(3):
                x, y = random.randint(10, 270), random.randint(10, 110)
                draw.ellipse([x, y, x + 10, y + 10], fill="lightblue")

            self.save_captcha(img, "ador_captcha", f"ador_{i:02d}", answer)

    def generate_edge_cases(self):
        """Generate edge case samples"""
        print("Generating edge cases...")

        edge_dir = os.path.join(self.output_dir, "edge_cases")
        os.makedirs(edge_dir, exist_ok=True)

        text = "EDGE01"
        font = self.get_font(36)

        # Extremely blurry
        img = self.create_base_image()
        draw = ImageDraw.Draw(img)
        draw.text((40, 20), text, fill="black", font=font)
        img = img.filter(ImageFilter.GaussianBlur(radius=3))
        self.save_captcha(img, "edge_cases", "blur_extreme", text)

        # Very low contrast
        img = Image.new("RGB", (200, 80), color="#eeeeee")
        draw = ImageDraw.Draw(img)
        draw.text((40, 20), text, fill="#dddddd", font=font)
        self.save_captcha(img, "edge_cases", "low_contrast_extreme", text)

        # Heavy distortion
        img = self.create_base_image()
        draw = ImageDraw.Draw(img)
        draw.text((40, 20), text, fill="black", font=font)
        img = self.distort(img)
        img = self.distort(img)
        self.save_captcha(img, "edge_cases", "distorted_heavy", text)

        # Very small
        img = Image.new("RGB", (100, 40), color="white")
        draw = ImageDraw.Draw(img)
        small_font = self.get_font(18)
        draw.text((20, 10), "TINY", fill="black", font=small_font)
        self.save_captcha(img, "edge_cases", "very_small", "TINY")

        # Very large
        img = Image.new("RGB", (400, 200), color="white")
        draw = ImageDraw.Draw(img)
        large_font = self.get_font(72)
        draw.text((80, 50), "LARGE", fill="black", font=large_font)
        self.save_captcha(img, "edge_cases", "very_large", "LARGE")

        # Rotated text (simulated)
        img = self.create_base_image()
        draw = ImageDraw.Draw(img)
        # PIL doesn't support rotated text easily, so we draw at angle
        for i, char in enumerate(text):
            x = 30 + i * 25
            y = 30 + int(10 * np.sin(i))
            draw.text((x, y), char, fill="black", font=font)
        self.save_captcha(img, "edge_cases", "wavy_text", text)

        # Overlapping text
        img = self.create_base_image()
        draw = ImageDraw.Draw(img)
        draw.text((35, 20), text, fill="darkgray", font=font)
        draw.text((45, 25), text, fill="black", font=font)
        self.save_captcha(img, "edge_cases", "overlapping", text)

    def save_ground_truth(self):
        """Save ground truth JSON"""
        gt_path = os.path.join(self.output_dir, "ground_truth.json")
        with open(gt_path, "w") as f:
            json.dump(self.ground_truth, f, indent=2)
        print(f"Ground truth saved to {gt_path}")

    def generate_all(self):
        """Generate all CAPTCHA samples"""
        print("=" * 60)
        print("Generating CAPTCHA Test Samples")
        print("=" * 60)

        self.generate_text_captchas(5)
        self.generate_math_captchas(5)
        self.generate_image_grid_captchas(5)
        self.generate_recaptcha_captchas(5)
        self.generate_hcaptcha_captchas(5)
        self.generate_geetest_captchas(5)
        self.generate_funcaptcha_captchas(5)
        self.generate_turnstile_captchas(5)
        self.generate_keycaptcha_captchas(5)
        self.generate_capy_captchas(5)
        self.generate_pixcaptcha_captchas(5)
        self.generate_confident_captchas(5)
        self.generate_ador_captchas(5)
        self.generate_edge_cases()

        self.save_ground_truth()

        # Count total
        total = sum(len(files) for _, _, files in os.walk(self.output_dir) if files)
        print(f"\nGenerated {total} CAPTCHA samples")
        print("=" * 60)


def main():
    generator = CaptchaGenerator()
    generator.generate_all()


if __name__ == "__main__":
    main()
