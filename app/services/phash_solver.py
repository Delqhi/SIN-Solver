#!/usr/bin/env python3
"""
💎 PHASH SOLVER - CEO 2026
Robust Perceptual Hashing for CAPTCHA Caching.
Robust against slight resizing, noise, and color changes.
"""

import imagehash
from PIL import Image
import io
import base64
import logging
import os

logger = logging.getLogger("PHashSolver")


class PHashSolver:
    @staticmethod
    def get_phash(image_input: str) -> str:
        try:
            if os.path.exists(image_input) and len(image_input) < 4096:
                # Assume path
                img = Image.open(image_input)
            else:
                # Assume base64
                if "," in image_input:
                    image_input = image_input.split(",")[1]
                img_data = base64.b64decode(image_input)
                img = Image.open(io.BytesIO(img_data))

            phash = imagehash.phash(img)
            return str(phash)
        except Exception as e:
            logger.error(f"pHash generation failed for '{image_input[:50]}...': {e}")
            import hashlib

            return hashlib.md5(image_input.encode()).hexdigest()

    @staticmethod
    def compare_hashes(hash1: str, hash2: str) -> int:
        """
        Compares two pHashes. Returns Hamming distance.
        0 means identical.
        """
        h1 = imagehash.hex_to_hash(hash1)
        h2 = imagehash.hex_to_hash(hash2)
        return h1 - h2
