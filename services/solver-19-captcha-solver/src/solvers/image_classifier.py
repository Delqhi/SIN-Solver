import io
import logging
from typing import Dict, Any, Optional, List

from PIL import Image
import numpy as np

logger = logging.getLogger("ImageClassifier")

HCAPTCHA_CHALLENGES = {
    "car": ["car", "automobile", "vehicle"],
    "bus": ["bus", "coach"],
    "bicycle": ["bicycle", "bike", "cycle"],
    "motorcycle": ["motorcycle", "motorbike"],
    "boat": ["boat", "ship", "vessel"],
    "airplane": ["airplane", "plane", "aircraft"],
    "traffic_light": ["traffic light", "signal", "stoplight"],
    "fire_hydrant": ["fire hydrant", "hydrant"],
    "stop_sign": ["stop sign"],
    "parking_meter": ["parking meter"],
    "crosswalk": ["crosswalk", "zebra crossing", "pedestrian crossing"],
    "bridge": ["bridge"],
    "staircase": ["staircase", "stairs"],
    "chimney": ["chimney"],
    "mountain": ["mountain", "hill"],
    "seaplane": ["seaplane"],
}


class ImageClassifier:
    def __init__(self):
        self._model = None
        self._model_loaded = False
        logger.info("✅ Image classifier initialized (lazy loading)")

    def _load_model(self):
        if self._model_loaded:
            return

        try:
            from ultralytics import YOLO

            self._model = YOLO("yolov8n.pt")
            self._model_loaded = True
            logger.info("✅ YOLOv8 model loaded")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise

    def classify(self, image_bytes: bytes, challenge_type: Optional[str] = None) -> Dict[str, Any]:
        try:
            self._load_model()

            img = Image.open(io.BytesIO(image_bytes))
            if img.mode == "RGBA":
                img = img.convert("RGB")

            results = self._model(img, verbose=False)

            detections = []
            for result in results:
                boxes = result.boxes
                for i, box in enumerate(boxes):
                    cls_id = int(box.cls[0])
                    cls_name = result.names[cls_id]
                    confidence = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()

                    detections.append(
                        {
                            "label": cls_name,
                            "confidence": confidence,
                            "bbox": {
                                "x1": int(xyxy[0]),
                                "y1": int(xyxy[1]),
                                "x2": int(xyxy[2]),
                                "y2": int(xyxy[3]),
                            },
                            "center": {
                                "x": int((xyxy[0] + xyxy[2]) / 2),
                                "y": int((xyxy[1] + xyxy[3]) / 2),
                            },
                        }
                    )

            if challenge_type:
                detections = self._filter_for_challenge(detections, challenge_type)

            primary_label = detections[0]["label"] if detections else "unknown"
            avg_confidence = (
                sum(d["confidence"] for d in detections) / len(detections) if detections else 0.0
            )

            return {
                "label": primary_label,
                "confidence": avg_confidence,
                "detections": detections,
                "count": len(detections),
                "coordinates": [{"x": d["center"]["x"], "y": d["center"]["y"]} for d in detections],
            }
        except Exception as e:
            logger.error(f"Image classification failed: {e}")
            raise

    def _filter_for_challenge(self, detections: List[Dict], challenge_type: str) -> List[Dict]:
        challenge_lower = challenge_type.lower()

        target_labels = []
        for category, synonyms in HCAPTCHA_CHALLENGES.items():
            if any(syn in challenge_lower for syn in synonyms):
                target_labels.extend(synonyms)
                target_labels.append(category)
                break

        if not target_labels:
            target_labels = [challenge_lower]

        filtered = []
        for det in detections:
            label_lower = det["label"].lower()
            if any(target in label_lower for target in target_labels):
                filtered.append(det)

        return filtered

    def classify_grid(
        self, image_bytes: bytes, grid_size: tuple = (3, 3), challenge_type: Optional[str] = None
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

                cell_img = img.crop((x1, y1, x2, y2))

                buffer = io.BytesIO()
                cell_img.save(buffer, format="PNG")
                cell_bytes = buffer.getvalue()

                result = self.classify(cell_bytes, challenge_type)

                cells.append(
                    {
                        "row": row,
                        "col": col,
                        "index": row * cols + col,
                        "label": result["label"],
                        "confidence": result["confidence"],
                        "is_target": result["count"] > 0 if challenge_type else None,
                        "center": {"x": (x1 + x2) // 2, "y": (y1 + y2) // 2},
                    }
                )

        target_cells = [c for c in cells if c.get("is_target")] if challenge_type else []

        return {
            "cells": cells,
            "grid_size": grid_size,
            "target_cells": target_cells,
            "target_indices": [c["index"] for c in target_cells],
        }
