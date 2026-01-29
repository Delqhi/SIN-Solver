"""
Quick Integration Test Suite - Minimal version without matplotlib
Tests OCR pipeline components and YOLO integration
"""

import sys
from pathlib import Path
import tempfile
import time
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Add project to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.captcha_solver_pipeline import (
    CaptchaSolverPipeline,
    TesseractOCREngine,
    PaddleOCREngine,
    ConsensusVoting
)

class TestIntegration:
    """Quick integration tests"""
    
    @staticmethod
    def create_test_image(text="TEST", width=200, height=100):
        """Create a simple test image with text"""
        img = Image.new('RGB', (width, height), color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw text
        try:
            draw.text((20, 30), text, fill='black')
        except:
            # Fallback if font unavailable
            draw.text((20, 30), text, fill='black')
        
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    
    def test_tesseract_engine(self):
        """Test Tesseract OCR engine"""
        print("\n🧪 Test 1: Tesseract Engine")
        try:
            engine = TesseractOCREngine()
            test_img = self.create_test_image("HELLO")
            
            result = engine.extract_text(test_img)
            assert result is not None
            assert len(result) > 0
            
            print(f"   ✅ Tesseract working (detected: '{result.strip()}')")
            return True
        except Exception as e:
            print(f"   ⚠️  Tesseract test: {e}")
            return False
    
    def test_paddle_engine(self):
        """Test PaddleOCR engine"""
        print("\n🧪 Test 2: PaddleOCR Engine")
        try:
            engine = PaddleOCREngine(lang='en')
            test_img = self.create_test_image("WORLD")
            
            result = engine.extract_text(test_img)
            assert result is not None
            
            print(f"   ✅ PaddleOCR working (detected: '{result.strip()}')")
            return True
        except Exception as e:
            print(f"   ⚠️  PaddleOCR test: {e}")
            return False
    
    def test_consensus_voting(self):
        """Test consensus voting mechanism"""
        print("\n🧪 Test 3: Consensus Voting")
        try:
            voting = ConsensusVoting()
            
            # Add some votes
            voting.add_vote("text", source="engine1", confidence=0.9)
            voting.add_vote("text", source="engine2", confidence=0.85)
            voting.add_vote("text", source="engine3", confidence=0.8)
            
            result = voting.get_result(min_votes=2)
            assert result == "text"
            
            print(f"   ✅ Consensus voting working (result: '{result}')")
            return True
        except Exception as e:
            print(f"   ❌ Consensus voting error: {e}")
            return False
    
    def test_pipeline_instantiation(self):
        """Test pipeline can be instantiated"""
        print("\n🧪 Test 4: Pipeline Instantiation")
        try:
            model_path = Path("/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/weights/best.pt")
            
            pipeline = CaptchaSolverPipeline(
                yolo_model_path=str(model_path) if model_path.exists() else None,
                enable_tesseract=True,
                enable_paddleocr=True
            )
            
            print(f"   ✅ Pipeline instantiated")
            print(f"      - Tesseract: {'enabled' if pipeline.tesseract_engine else 'disabled'}")
            print(f"      - PaddleOCR: {'enabled' if pipeline.paddle_engine else 'disabled'}")
            
            return True
        except Exception as e:
            print(f"   ❌ Pipeline instantiation error: {e}")
            return False
    
    def test_end_to_end(self):
        """Test end-to-end pipeline"""
        print("\n🧪 Test 5: End-to-End Pipeline")
        try:
            test_img = self.create_test_image("CAPTCHA123")
            
            model_path = Path("/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/weights/best.pt")
            
            pipeline = CaptchaSolverPipeline(
                yolo_model_path=str(model_path) if model_path.exists() else None,
                enable_tesseract=True,
                enable_paddleocr=True
            )
            
            # This will use whatever engines are available
            start_time = time.time()
            result = pipeline.solve(test_img)
            elapsed = time.time() - start_time
            
            print(f"   ✅ Pipeline executed in {elapsed:.2f}s")
            print(f"      Result: {result}")
            
            return True
        except Exception as e:
            print(f"   ⚠️  End-to-end test: {e}")
            return False
    
    def run_all(self):
        """Run all tests"""
        print("\n" + "="*70)
        print("🧪 INTEGRATION TEST SUITE (Quick Version)")
        print("="*70)
        
        results = {
            'tesseract': self.test_tesseract_engine(),
            'paddleocr': self.test_paddle_engine(),
            'consensus': self.test_consensus_voting(),
            'instantiation': self.test_pipeline_instantiation(),
            'e2e': self.test_end_to_end(),
        }
        
        passed = sum(1 for v in results.values() if v)
        total = len(results)
        
        print("\n" + "="*70)
        print(f"📊 Results: {passed}/{total} tests passed")
        print("="*70)
        
        return results

if __name__ == "__main__":
    tester = TestIntegration()
    results = tester.run_all()
    sys.exit(0 if all(results.values()) else 1)
