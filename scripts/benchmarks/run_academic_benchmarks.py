#!/usr/bin/env python3
"""
📊 Delqhi-Platform Academic Benchmark Runner (2026)
Tests the system against MCA-Bench and Open CaptchaWorld datasets.
"""

import os
import json
import asyncio
import logging
import time
from typing import Dict, List, Any
from app.services.vision_orchestrator import ViPerStrikeProcessor
from app.services.gemini_solver import get_gemini_solver

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AcademicBenchmark")

DATA_DIR = "data/benchmarks"
RESULTS_DIR = "data/results"

class AcademicBenchmarkRunner:
    def __init__(self):
        self.solver = get_gemini_solver()
        self.results = {
            "mca_bench": {"total": 0, "success": 0, "failures": []},
            "captcha_world": {"total": 0, "success": 0, "failures": []}
        }

    async def run_mca_bench(self):
        """MCA-Bench: Focuses on Structured VLI and logic."""
        logger.info("🚀 Starting MCA-Bench evaluation...")
        path = os.path.join(DATA_DIR, "mca-bench")
        if not os.path.exists(path):
            logger.warning(f"⚠️ MCA-Bench data not found at {path}. Skipping.")
            return

        # Each subfolder is a test case with image.png and metadata.json
        for case in os.listdir(path):
            case_path = os.path.join(path, case)
            if not os.path.isdir(case_path): continue
            
            image_path = os.path.join(case_path, "image.png")
            meta_path = os.path.join(case_path, "metadata.json")
            
            if not (os.path.exists(image_path) and os.path.exists(meta_path)):
                continue

            with open(meta_path, 'r') as f:
                metadata = json.load(f)
            
            # Read image as base64
            import base64
            with open(image_path, "rb") as image_file:
                image_base64 = base64.b64encode(image_file.read()).decode('utf-8')

            self.results["mca_bench"]["total"] += 1
            logger.info(f"Testing MCA Case: {case} - Task: {metadata['task']}")
            
            try:
                # Use unified ViPerStrikeProcessor
                response = await ViPerStrikeProcessor.process(self.solver, image_base64, metadata['task'])
                
                # Verify solution against targets in metadata
                is_correct = self._verify_solution(response, metadata['targets'])
                if is_correct:
                    self.results["mca_bench"]["success"] += 1
                    logger.info(f"✅ Success: {case}")
                else:
                    self.results["mca_bench"]["failures"].append(case)
                    logger.error(f"❌ Failure: {case}")
            except Exception as e:
                logger.error(f"💥 Error processing {case}: {e}")
                self.results["mca_bench"]["failures"].append(case)

    async def run_captcha_world(self):
        """Open CaptchaWorld: Wide variety of CAPTCHA types."""
        logger.info("🚀 Starting Open CaptchaWorld evaluation...")
        path = os.path.join(DATA_DIR, "captcha-world")
        if not os.path.exists(path):
            logger.warning(f"⚠️ Open CaptchaWorld data not found at {path}. Skipping.")
            return

        # Organized by type/case_name.jpg
        for root, dirs, files in os.walk(path):
            for file in files:
                if file.endswith(('.png', '.jpg', '.jpeg')):
                    img_path = os.path.join(root, file)
                    # Assume metadata exists as .json with same name
                    meta_path = os.path.splitext(img_path)[0] + ".json"
                    
                    if not os.path.exists(meta_path): continue
                    
                    with open(meta_path, 'r') as f:
                        metadata = json.load(f)
                    
                    import base64
                    with open(img_path, "rb") as image_file:
                        image_base64 = base64.b64encode(image_file.read()).decode('utf-8')

                    self.results["captcha_world"]["total"] += 1
                    
                    try:
                        # Use unified ViPerStrikeProcessor
                        response = await ViPerStrikeProcessor.process(self.solver, image_base64, metadata.get('task', 'Solve this CAPTCHA'))
                        if self._verify_solution(response, metadata.get('targets')):
                            self.results["captcha_world"]["success"] += 1
                        else:
                            self.results["captcha_world"]["failures"].append(file)
                    except Exception as e:
                        logger.error(f"Error on {file}: {e}")
                        self.results["captcha_world"]["failures"].append(file)

    def _verify_solution(self, response: Dict, targets: List) -> bool:
        """Academic verification logic: check if detected boxes overlap with targets."""
        if not response.get("success"): return False
        
        detected_boxes = [obj.get("box_2d") for obj in response.get("objects", [])]
        if not detected_boxes and not targets: return True
        if not detected_boxes or not targets: return False
        
        # Simple IoU-based or center-point based verification
        # For academic benchmarks, we check if at least one detected box hits each target
        for target in targets:
            hit = False
            for detected in detected_boxes:
                if self._is_overlap(detected, target):
                    hit = True
                    break
            if not hit: return False
        return True

    def _is_overlap(self, box1, box2, threshold=0.5) -> bool:
        # Standard IoU check
        ymin1, xmin1, ymax1, xmax1 = box1
        ymin2, xmin2, ymax2, xmax2 = box2
        
        inter_ymin = max(ymin1, ymin2)
        inter_xmin = max(xmin1, xmin2)
        inter_ymax = min(ymax1, ymax2)
        inter_xmax = min(xmax1, xmax2)
        
        inter_area = max(0, inter_ymax - inter_ymin) * max(0, inter_xmax - inter_xmin)
        box1_area = (ymax1 - ymin1) * (xmax1 - xmin1)
        box2_area = (ymax2 - ymin2) * (xmax2 - xmin2)
        
        union_area = box1_area + box2_area - inter_area
        if union_area == 0: return 0
        iou = inter_area / union_area
        return iou >= threshold

    def save_report(self):
        os.makedirs(RESULTS_DIR, exist_ok=True)
        report_path = os.path.join(RESULTS_DIR, f"academic_report_{int(time.time())}.json")
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=4)
        logger.info(f"📊 Benchmark Report saved to {report_path}")
        
        # Print summary
        for bench, stats in self.results.items():
            rate = (stats['success'] / stats['total'] * 100) if stats['total'] > 0 else 0
            print(f"{bench.upper()}: {stats['success']}/{stats['total']} ({rate:.2f}%)")

async def main():
    runner = AcademicBenchmarkRunner()
    await runner.run_mca_bench()
    await runner.run_captcha_world()
    runner.save_report()

if __name__ == "__main__":
    asyncio.run(main())
