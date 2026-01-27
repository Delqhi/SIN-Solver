#!/usr/bin/env python3
"""
CAPTCHA SLICER - Zerlegt Captcha-Bilder in 9 Einzelzellen für präzise KI-Analyse
Eliminiert das "Schielen" der KI durch fokussierte Einzelbild-Analyse
"""

import os
import logging
from PIL import Image
from typing import List, Tuple

logger = logging.getLogger("CaptchaSlicer")

class CaptchaSlicer:
    """
    🚀 CAPTCHA SLICER (V2 2026) - MEMORY EFFICIENT
    Slices images into grids for focused AI analysis.
    Supports High-Res images and in-memory processing.
    """
    def __init__(self, output_dir: str = "temp_slices"):
        self.output_dir = output_dir
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

    def slice_3x3_grid(self, image_source: Any) -> List[str]:
        """
        Slices a CAPTCHA image into 9 cells.
        image_source: path (str) or raw bytes.
        """
        import io
        try:
            if isinstance(image_source, str):
                img = Image.open(image_source)
            else:
                img = Image.open(io.BytesIO(image_source))
            
            # 🔥 CEO 2026: DYNAMIC HIGH-RES SCALING
            # Optimal VLM input size is often around 600-1000px
            target_size = 900 # divisible by 3
            if img.width < target_size or img.height < target_size:
                img = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
            elif img.width > 1200 or img.height > 1200:
                # Downscale if massive to save memory
                img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
                
            width, height = img.size
            cell_width = width // 3
            cell_height = height // 3

            slice_paths = []
            for row in range(3):
                for col in range(3):
                    left = col * cell_width
                    top = row * cell_height
                    right = (col + 1) * cell_width
                    bottom = (row + 1) * cell_height

                    # 🔥 CEO 2026: Precise Crop with Context padding
                    # Add 2% padding to each side to avoid cutting off objects at borders
                    padding_w = int(cell_width * 0.02)
                    padding_h = int(cell_height * 0.02)
                    
                    p_left = max(0, left - padding_w)
                    p_top = max(0, top - padding_h)
                    p_right = min(width, right + padding_w)
                    p_bottom = min(height, bottom + padding_h)
                    
                    cell = img.crop((p_left, p_top, p_right, p_bottom))
                    
                    # 🔥 CEO 2026: Memory-Efficient Persistent Storage
                    # Use unique ID per session to avoid collision in high concurrency
                    import uuid
                    session_id = str(uuid.uuid4())[:8]
                    cell_id = row * 3 + col + 1
                    cell_path = os.path.join(self.output_dir, f"slice_{session_id}_{cell_id}.png")
                    
                    # Save with high compression
                    cell.save(cell_path, "PNG", optimize=True, compress_level=9)
                    slice_paths.append(cell_path)

            return slice_paths
        except Exception as e:
            logger.error(f"❌ Slicing failed: {e}")
            return []

    def cleanup(self):
        """Aufräumen der temporären Slice-Dateien"""
        import shutil
        if os.path.exists(self.output_dir):
            try:
                shutil.rmtree(self.output_dir)
                os.makedirs(self.output_dir)
                logger.info("🧹 Temporäre Slices aufgeräumt")
            except Exception as e:
                logger.warning(f"Cleanup failed: {e}")

