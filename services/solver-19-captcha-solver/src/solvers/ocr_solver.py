import io
import logging
from typing import Dict, Any, Optional

import ddddocr
from PIL import Image

logger = logging.getLogger("OCRSolver")


class OCRSolver:
    def __init__(self):
        self._ocr = ddddocr.DdddOcr(show_ad=False)
        logger.info("✅ ddddocr OCR initialized")

    def solve(self, image_bytes: bytes) -> Dict[str, Any]:
        try:
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode == "RGBA":
                img = img.convert("RGB")

            img_buffer = io.BytesIO()
            img.save(img_buffer, format="PNG")
            processed_bytes = img_buffer.getvalue()

            text = self._ocr.classification(processed_bytes)

            cleaned_text = "".join(c for c in text if c.isalnum())

            return {
                "text": cleaned_text,
                "raw_text": text,
                "confidence": 0.95 if len(cleaned_text) >= 4 else 0.7,
            }
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            raise

    def solve_with_options(
        self, image_bytes: bytes, char_set: Optional[str] = None, length: Optional[int] = None
    ) -> Dict[str, Any]:
        result = self.solve(image_bytes)

        if length and len(result["text"]) != length:
            result["confidence"] *= 0.8

        if char_set:
            result["text"] = "".join(c for c in result["text"] if c in char_set)

        return result
