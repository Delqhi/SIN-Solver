#!/usr/bin/env python3
"""
🎯 YOLOv8x GRID SOLVER - CEO 2026
Ultra-fast local object detection for grid-based CAPTCHAs.
Target: <100ms detection time.
"""

import logging
import os
from typing import List, Dict, Any
import numpy as np
import cv2

logger = logging.getLogger("YOLOSolver")

class YOLOSolver:
    def __init__(self, model_path: str = "models/yolov8x.pt"):
        self.model_path = model_path
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                logger.info(f"✅ YOLOv8x model loaded from {self.model_path}")
            else:
                logger.warning(f"⚠️ YOLO model not found at {self.model_path}. Detection will be disabled.")
        except ImportError:
            logger.error("❌ ultralytics not installed. YOLO detection disabled.")

    def detect_objects(self, image_path: str, target_classes: List[str] = None, confidence_threshold: float = 0.25) -> List[Dict[str, Any]]:
        if not self.model:
            return []
            
        try:
            # 🔥 CEO 2026: Optimized Inference Parameters
            results = self.model(image_path, conf=confidence_threshold, iou=0.45, imgsz=640, verbose=False)
            detections = []
            
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    label = self.model.names[cls_id]
                    
                    # 🔥 CEO 2026: Intelligent Class Filtering & Mapping
                    # Map common synonyms for CAPTCHA objects
                    synonyms = {
                        "bus": ["bus", "coach", "transit"],
                        "car": ["car", "automobile", "vehicle"],
                        "fire_hydrant": ["fire hydrant", "hydrant"],
                        "traffic_light": ["traffic light", "signal"],
                        "bicycle": ["bicycle", "bike", "cycle"],
                        "motorcycle": ["motorcycle", "motorbike"],
                        "truck": ["truck", "lorry", "commercial vehicle"]
                    }
                    
                    normalized_label = label.lower().replace(" ", "_")
                    
                    if target_classes:
                        match_found = False
                        for target in target_classes:
                            t_low = target.lower().replace(" ", "_")
                            if normalized_label == t_low or t_low in synonyms.get(normalized_label, []):
                                match_found = True
                                break
                        if not match_found:
                            continue
                        
                    coords = box.xyxy[0].tolist() 
                    conf = float(box.conf[0])
                    
                    detections.append({
                        "label": label,
                        "confidence": conf,
                        "box_2d": [coords[1], coords[0], coords[3], coords[2]] # ymin, xmin, ymax, xmax
                    })
            
            # 🔥 CEO 2026: Non-Maximum Suppression (handled by YOLO, but filtering extra)
            logger.info(f"🎯 YOLO detected {len(detections)} objects with confidence > {confidence_threshold}")
            return detections
        except Exception as e:
            logger.error(f"YOLO detection failed: {e}")
            return []

    def detect_grid(self, image_path: str, target_classes: List[str] = None) -> List[bool]:
        detections = self.detect_objects(image_path, target_classes)
        grid_results = [False] * 9
        
        if not detections:
            return grid_results
            
        try:
            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"❌ YOLO could not read image at {image_path}. Check permissions or file integrity.")
                return grid_results
            
            h, w = img.shape[:2]
            for det in detections:
                ymin, xmin, ymax, xmax = det["box_2d"]
                cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
                col = int(cx / (w / 3))
                row = int(cy / (h / 3))
                if 0 <= col < 3 and 0 <= row < 3:
                    grid_results[row * 3 + col] = True
        except Exception as e:
            logger.error(f"Grid mapping failed: {e}")
            
        return grid_results
