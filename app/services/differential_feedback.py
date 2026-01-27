"""
🔄 DIFFERENTIAL FEEDBACK LOOP (2026 Enterprise)
Post-action state verification to ensure interactions actually worked.
Prevents 'blind shooting' where Worker doesn't know if click succeeded.

This module compares before/after screenshots to verify that clicks, drags,
and other interactions actually changed the page state. If a click doesn't
change the visual state, it's treated as a failure and triggers retry logic.
"""

import logging
import hashlib
import asyncio
from typing import Dict, Optional, Tuple
import numpy as np
from PIL import Image
import io

logger = logging.getLogger("DifferentialFeedback")


class ValidationError(Exception):
    """
    Raised when differential feedback indicates action failed.
    
    This exception signals that an interaction (click, drag, etc.) did not
    produce the expected page state change. The Worker should retry or escalate.
    """
    pass


class DifferentialFeedback:
    """
    Post-action state verification system.
    
    Compares before/after screenshots to verify that interactions actually
    changed page state. Uses image hashing and pixel-level comparison.
    
    Key metrics:
    - percent_changed: Percentage of pixels that differ (threshold: 2%)
    - before_hash: Perceptual hash of before screenshot
    - after_hash: Perceptual hash of after screenshot
    """
    
    def __init__(self):
        """Initialize the feedback verification system."""
        self.last_screenshot = None
        self.last_hash = None
        logger.info("🔄 [FEEDBACK] DifferentialFeedback initialized")
    
    def _image_hash(self, image_bytes: bytes) -> str:
        """
        Generate perceptual hash of image for quick comparison.
        
        Uses MD5 hash of 8x8 grayscale downsampled image.
        This is fast and detects significant visual changes.
        
        Args:
            image_bytes: PNG or JPEG image bytes
        
        Returns:
            str: MD5 hex hash of the downsampled image
        
        Example:
            >>> hash1 = feedback._image_hash(before)
            >>> hash2 = feedback._image_hash(after)
            >>> if hash1 != hash2:
            ...     print("Images are different")
        """
        try:
            # Load image and convert to grayscale
            img = Image.open(io.BytesIO(image_bytes))
            
            # Downsample to 8x8 for perceptual hashing
            img_resized = img.resize((8, 8), Image.Resampling.LANCZOS)
            
            # Convert to grayscale array
            img_array = np.array(img_resized.convert('L'))
            
            # Generate hash from pixel bytes
            hash_value = hashlib.md5(img_array.tobytes()).hexdigest()
            
            logger.debug(f"Hash generated: {hash_value[:8]}...")
            return hash_value
            
        except Exception as e:
            logger.error(f"Hash generation failed: {e}. Falling back to raw hash.")
            # Fallback: hash raw bytes
            return hashlib.md5(image_bytes).hexdigest()
    
    def _percent_different(self, before: bytes, after: bytes) -> float:
        """
        Calculate percentage of pixels that changed between two screenshots.
        
        Loads images, ensures same size, computes pixel-level differences,
        and returns percentage of changed pixels.
        
        Args:
            before: Screenshot bytes before action
            after: Screenshot bytes after action
        
        Returns:
            float: Percentage of pixels with significant change (0-100)
        
        Example:
            >>> pct = feedback._percent_different(before, after)
            >>> if pct >= 2.0:
            ...     print(f"State changed: {pct:.2f}%")
        """
        try:
            # Load images
            img_before = np.array(Image.open(io.BytesIO(before)).convert('RGB'))
            img_after = np.array(Image.open(io.BytesIO(after)).convert('RGB'))
            
            # Ensure same dimensions
            min_h = min(img_before.shape[0], img_after.shape[0])
            min_w = min(img_before.shape[1], img_after.shape[1])
            
            img_before = img_before[:min_h, :min_w]
            img_after = img_after[:min_h, :min_w]
            
            # Calculate pixel differences
            diff = np.abs(img_before.astype(int) - img_after.astype(int))
            
            # Threshold: pixels with >10 units of change (per channel)
            diff_threshold = diff > 10
            
            # Percentage of different pixels
            total_pixels = min_h * min_w * 3  # RGB channels
            changed_pixels = np.sum(diff_threshold)
            percent = (changed_pixels / total_pixels) * 100.0
            
            logger.debug(f"Pixel comparison: {changed_pixels}/{total_pixels} pixels changed = {percent:.2f}%")
            return percent
            
        except Exception as e:
            logger.warning(f"Pixel-level comparison failed: {e}. Using hash comparison.")
            # Fallback to hash comparison
            hash_before = self._image_hash(before)
            hash_after = self._image_hash(after)
            
            # If hashes differ, assume 50% change; else 0%
            return 50.0 if hash_before != hash_after else 0.0
    
    async def verify_state_changed(
        self,
        before_screenshot: bytes,
        after_screenshot: bytes,
        min_change_pct: float = 2.0
    ) -> Tuple[bool, Dict]:
        """
        Verify that click/drag actually changed page state.
        
        Compares before/after screenshots and determines if the action
        produced a measurable change. Returns both success flag and
        detailed metrics for debugging.
        
        Args:
            before_screenshot: Screenshot bytes taken before action
            after_screenshot: Screenshot bytes taken after action
            min_change_pct: Minimum % of pixels that must change (default: 2.0)
        
        Returns:
            Tuple[bool, Dict]:
            - bool: True if change detected and >= threshold
            - Dict with metrics:
              - success: bool
              - percent_changed: float
              - threshold: float
              - before_hash: str
              - after_hash: str
        
        Example:
            >>> before = await controller.get_precise_screenshot()
            >>> await controller.human_click(x, y)
            >>> await asyncio.sleep(1)
            >>> after = await controller.get_precise_screenshot()
            >>> success, metrics = await feedback.verify_state_changed(before, after)
            >>> if not success:
            ...     raise ValidationError(f"Click failed: {metrics}")
        """
        try:
            # Calculate percent different
            percent_changed = self._percent_different(before_screenshot, after_screenshot)
            
            # Generate hashes for debugging
            before_hash = self._image_hash(before_screenshot)
            after_hash = self._image_hash(after_screenshot)
            
            # Determine success
            success = percent_changed >= min_change_pct
            
            # Build result dict
            result = {
                'success': success,
                'percent_changed': percent_changed,
                'threshold': min_change_pct,
                'before_hash': before_hash,
                'after_hash': after_hash
            }
            
            # Log result
            if success:
                logger.info(
                    f"✅ [FEEDBACK] State changed: {percent_changed:.2f}% "
                    f"(threshold: {min_change_pct}%)"
                )
            else:
                logger.error(
                    f"❌ [FEEDBACK] State DID NOT change: {percent_changed:.2f}% "
                    f"(threshold: {min_change_pct}%). "
                    f"Action may have failed."
                )
            
            return success, result
            
        except Exception as e:
            logger.error(f"State verification failed: {e}", exc_info=True)
            # Return failure with error details
            return False, {
                'success': False,
                'percent_changed': 0.0,
                'threshold': min_change_pct,
                'error': str(e)
            }
