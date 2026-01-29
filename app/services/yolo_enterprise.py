"""
YOLO Enterprise Service - Production-Ready CAPTCHA Classification
"""

import asyncio
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional
import time

import numpy as np
from PIL import Image
import io

from app.core.logging_config import get_logger
from app.core.monitoring import metrics

logger = get_logger(__name__)

class YOLOEnterpriseService:
    """
    Thread-safe YOLO classification service
    - Lazy model loading
    - Batch inference support
    - Circuit breaker pattern
    - Performance metrics
    """
    
    # Class-level model cache
    _model = None
    _model_lock = threading.RLock()
    _instance = None
    
    # CAPTCHA type classes (from training)
    CLASSES = [
        "Audio_Captcha",
        "Cloudflare_Turnstile", 
        "FunCaptcha",
        "Grid_Captcha",
        "hCaptcha",
        "Image_Select",
        "Math_Captcha",
        "reCAPTCHA_v2",
        "reCAPTCHA_v3",
        "Rotate_Captcha",
        "Slider_Captcha",
        "Text_Captcha"
    ]
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.model_path = Path("/Users/jeremy/dev/SIN-Solver/models/captcha_classifier/best.pt")
        self.confidence_threshold = 0.5
        self._initialized = False
        self._circuit_open = False
        self._failure_count = 0
        self._failure_threshold = 5
        self._last_failure_time = 0
        
    async def load_model(self):
        """Lazy load the YOLO model."""
        if self._initialized:
            return
            
        with self._model_lock:
            if self._model is not None:
                self._initialized = True
                return
                
            try:
                logger.info("Loading YOLO model...", path=str(self.model_path))
                
                # Import here to avoid loading at module level
                from ultralytics import YOLO
                
                if not self.model_path.exists():
                    raise FileNotFoundError(f"Model not found: {self.model_path}")
                
                YOLOEnterpriseService._model = YOLO(str(self.model_path))
                self._initialized = True
                
                logger.info("YOLO model loaded successfully",
                          classes=len(self.CLASSES))
                
            except Exception as e:
                logger.error("Failed to load YOLO model", error=str(e))
                raise
    
    async def predict(self, image_data: bytes) -> Dict[str, Any]:
        """
        Classify CAPTCHA image
        
        Returns:
            Dict with 'class', 'confidence', 'all_predictions'
        """
        start_time = time.time()
        
        # Circuit breaker check
        if self._circuit_open:
            if time.time() - self._last_failure_time > 30:
                self._circuit_open = False
                self._failure_count = 0
            else:
                raise RuntimeError("Circuit breaker open - YOLO service unavailable")
        
        try:
            await self.load_model()
            
            # Run inference in thread pool to not block
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, 
                self._sync_predict, 
                image_data
            )
            
            # Record metrics
            inference_time = int((time.time() - start_time) * 1000)
            metrics.histogram("yolo_inference_time_ms", inference_time)
            metrics.increment("yolo_predictions", 
                            tags={"class": result['class']})
            
            # Reset failure count on success
            self._failure_count = 0
            
            return result
            
        except Exception as e:
            self._failure_count += 1
            self._last_failure_time = time.time()
            
            if self._failure_count >= self._failure_threshold:
                self._circuit_open = True
                logger.error("Circuit breaker opened for YOLO service")
            
            logger.error("YOLO prediction failed", error=str(e))
            raise
    
    def _sync_predict(self, image_data: bytes) -> Dict[str, Any]:
        """Synchronous prediction (runs in thread pool)."""
        # Load image
        image = Image.open(io.BytesIO(image_data))
        
        # Run inference
        results = YOLOEnterpriseService._model(image)
        
        # Parse results
        probs = results[0].probs
        top_idx = int(probs.top1)
        confidence = float(probs.top1conf)
        
        # Get all predictions
        all_predictions = []
        for i, conf in enumerate(probs.data.tolist()):
            all_predictions.append({
                "class": self.CLASSES[i],
                "confidence": float(conf)
            })
        
        all_predictions.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            "class": self.CLASSES[top_idx],
            "confidence": confidence,
            "all_predictions": all_predictions[:5]  # Top 5
        }
    
    async def predict_batch(self, images: List[bytes]) -> List[Dict[str, Any]]:
        """Batch prediction for efficiency."""
        await self.load_model()
        
        results = []
        for image_data in images:
            result = await self.predict(image_data)
            results.append(result)
        
        return results
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information."""
        return {
            "model_type": "YOLOv8n-cls",
            "classes": self.CLASSES,
            "num_classes": len(self.CLASSES),
            "confidence_threshold": self.confidence_threshold,
            "loaded": self._initialized,
            "model_path": str(self.model_path),
            "version": "1.0.0"
        }
