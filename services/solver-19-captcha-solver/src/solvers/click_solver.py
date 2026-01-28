import io
import logging
from typing import Dict, Any, Optional, List

import ddddocr
from PIL import Image
import numpy as np

logger = logging.getLogger("ClickSolver")


class ClickSolver:
    def __init__(self):
        self._det = ddddocr.DdddOcr(det=True, show_ad=False)
        logger.info("✅ ddddocr click detection initialized")
    
    def detect_targets(
        self, 
        image_bytes: bytes, 
        challenge_type: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode == "RGBA":
                img = img.convert("RGB")
            
            img_buffer = io.BytesIO()
            img.save(img_buffer, format="PNG")
            processed_bytes = img_buffer.getvalue()
            
            boxes = self._det.detection(processed_bytes)
            
            targets = []
            for box in boxes:
                if len(box) >= 4:
                    x1, y1, x2, y2 = box[:4]
                    center_x = (x1 + x2) // 2
                    center_y = (y1 + y2) // 2
                    
                    targets.append({
                        "x": int(center_x),
                        "y": int(center_y),
                        "bbox": {
                            "x1": int(x1),
                            "y1": int(y1),
                            "x2": int(x2),
                            "y2": int(y2)
                        },
                        "confidence": 0.85
                    })
            
            if challenge_type:
                targets = self._filter_by_challenge(targets, challenge_type, img)
            
            return {
                "targets": targets,
                "count": len(targets),
                "confidence": 0.8 if targets else 0.3
            }
        except Exception as e:
            logger.error(f"Click detection failed: {e}")
            raise
    
    def _filter_by_challenge(
        self, 
        targets: List[Dict], 
        challenge_type: str,
        image: Image.Image
    ) -> List[Dict]:
        return targets
    
    def detect_sequence(
        self, 
        image_bytes: bytes,
        sequence_chars: str
    ) -> Dict[str, Any]:
        result = self.detect_targets(image_bytes)
        targets = result["targets"]
        
        sequence_targets = []
        for char in sequence_chars:
            for target in targets:
                if target.get("text", "").lower() == char.lower():
                    sequence_targets.append(target)
                    break
        
        return {
            "targets": sequence_targets,
            "sequence": sequence_chars,
            "found": len(sequence_targets),
            "total": len(sequence_chars),
            "confidence": len(sequence_targets) / len(sequence_chars) if sequence_chars else 0
        }
    
    def detect_grid(
        self, 
        image_bytes: bytes,
        grid_size: tuple = (3, 3)
    ) -> Dict[str, Any]:
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        
        cols, rows = grid_size
        cell_width = width // cols
        cell_height = height // rows
        
        cells = []
        for row in range(rows):
            for col in range(cols):
                x1 = col * cell_width
                y1 = row * cell_height
                x2 = x1 + cell_width
                y2 = y1 + cell_height
                
                center_x = (x1 + x2) // 2
                center_y = (y1 + y2) // 2
                
                cells.append({
                    "row": row,
                    "col": col,
                    "index": row * cols + col,
                    "x": center_x,
                    "y": center_y,
                    "bbox": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2
                    }
                })
        
        return {
            "cells": cells,
            "grid_size": grid_size,
            "cell_size": (cell_width, cell_height)
        }
