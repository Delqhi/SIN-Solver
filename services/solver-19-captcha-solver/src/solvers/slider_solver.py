import io
import logging
from typing import Dict, Any, Optional

import ddddocr
from PIL import Image
import numpy as np

logger = logging.getLogger("SliderSolver")


class SliderSolver:
    def __init__(self):
        self._det = ddddocr.DdddOcr(det=False, ocr=False, show_ad=False)
        self._slide = ddddocr.DdddOcr(det=False, ocr=False, show_ad=False)
        logger.info("✅ ddddocr slider solver initialized")
    
    def solve(
        self, 
        slider_bytes: bytes, 
        background_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        try:
            if background_bytes:
                return self._solve_with_background(slider_bytes, background_bytes)
            return self._solve_single_image(slider_bytes)
        except Exception as e:
            logger.error(f"Slider solve failed: {e}")
            raise
    
    def _solve_with_background(
        self, 
        slider_bytes: bytes, 
        background_bytes: bytes
    ) -> Dict[str, Any]:
        result = self._det.slide_match(slider_bytes, background_bytes, simple_target=True)
        
        if isinstance(result, dict) and "target" in result:
            offset = result["target"][0]
        elif isinstance(result, (list, tuple)):
            offset = result[0] if result else 0
        else:
            offset = int(result) if result else 0
        
        return {
            "offset": offset,
            "confidence": 0.9,
            "method": "slide_match"
        }
    
    def _solve_single_image(self, image_bytes: bytes) -> Dict[str, Any]:
        img = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(img.convert("RGBA"))
        
        alpha = img_array[:, :, 3] if img_array.shape[2] == 4 else None
        
        if alpha is not None:
            non_transparent = np.where(alpha > 128)
            if len(non_transparent[1]) > 0:
                left_edge = int(np.min(non_transparent[1]))
                return {
                    "offset": left_edge,
                    "confidence": 0.85,
                    "method": "alpha_detection"
                }
        
        gray = np.mean(img_array[:, :, :3], axis=2)
        edges = np.abs(np.diff(gray, axis=1))
        
        col_sums = np.sum(edges, axis=0)
        offset = int(np.argmax(col_sums))
        
        return {
            "offset": offset,
            "confidence": 0.75,
            "method": "edge_detection"
        }
    
    def generate_slide_path(
        self, 
        offset: int, 
        duration_ms: int = 500
    ) -> list:
        path = []
        steps = duration_ms // 10
        
        for i in range(steps):
            t = i / steps
            eased_t = 1 - (1 - t) ** 3
            
            x = int(offset * eased_t)
            y = int(np.random.normal(0, 1))
            
            path.append({"x": x, "y": y, "delay": 10 + int(np.random.normal(0, 2))})
        
        path.append({"x": offset, "y": 0, "delay": 50})
        
        return path
