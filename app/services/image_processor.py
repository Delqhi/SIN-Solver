
import cv2
import numpy as np
import base64
import io
from PIL import Image

class ImageProcessor:
    @staticmethod
    def clean_captcha(image_base64: str) -> str:
        """
        Cleans a CAPTCHA image using OpenCV to improve OCR accuracy.
        - Grayscale
        - Thresholding (B&W)
        - Denoising
        """
        # Decode base64 to numpy array
        img_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return image_base64

        # 1. Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 2. Increase contrast / Thresholding (Otsu's method)
        # This turns everything into pure black or pure white
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # 3. Denoising (remove small dots)
        kernel = np.ones((2,2), np.uint8)
        opening = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # 4. Invert back to normal if needed (text should be dark on light or light on dark?)
        # Most models prefer dark text on clean light background.
        # We'll just ensure high contrast.
        final_img = cv2.bitwise_not(opening)

        # Encode back to base64
        _, buffer = cv2.imencode('.png', final_img)
        return base64.b64encode(buffer).decode('utf-8')

    @staticmethod
    def prepare_for_vlm(image_base64: str) -> str:
        """
        Optimizes image for Vision-Language Models (VLM).
        - Adaptive Histogram Equalization (CLAHE)
        - Gaussian Blur for noise reduction
        - Unsharp Masking for detail enhancement
        """
        img_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return image_base64

        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)

        limg = cv2.merge((cl,a,b))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        gaussian = cv2.GaussianBlur(enhanced, (0, 0), 3)
        sharpened = cv2.addWeighted(enhanced, 1.5, gaussian, -0.5, 0)

        _, buffer = cv2.imencode('.png', sharpened)
        return base64.b64encode(buffer).decode('utf-8')

    @staticmethod
    def get_ceo_pack(image_base64: str) -> list:
        """
        Generates a pack of 3 different processed images for consensus solving.
        1. Standard Clean (Otsu Threshold)
        2. Scaled & Sharpened (2x size)
        3. Morphological Thinning (Erosion)
        """
        img_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None: return [image_base64]

        # --- A: Standard Clean ---
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        clean = cv2.bitwise_not(thresh)
        
        # --- B: Scaled & Sharpened ---
        scaled = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        s_gray = cv2.cvtColor(scaled, cv2.COLOR_BGR2GRAY)
        s_thresh = cv2.adaptiveThreshold(s_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        # s_clean is already high contrast
        
        # --- C: Morphological (Thinning) ---
        kernel = np.ones((2,2), np.uint8)
        erosion = cv2.erode(thresh, kernel, iterations=1)
        thin = cv2.bitwise_not(erosion)

        def to_b64(cv_img):
            _, buf = cv2.imencode('.png', cv_img)
            return base64.b64encode(buf).decode('utf-8')

        return [to_b64(clean), to_b64(s_thresh), to_b64(thin)]

    @staticmethod
    def slice_image_into_quadrants(image_bytes: bytes) -> list:
        """Slices a screenshot into 4 quadrants for deep analysis"""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None: return []

        h, w = img.shape[:2]
        mid_h, mid_w = h // 2, w // 2

        # 0:Top-Left, 1:Top-Right, 2:Bottom-Left, 3:Bottom-Right
        quads = [
            img[0:mid_h, 0:mid_w],
            img[0:mid_h, mid_w:w],
            img[mid_h:h, 0:mid_w],
            img[mid_h:h, mid_w:w]
        ]

        results = []
        for q in quads:
            _, buffer = cv2.imencode('.jpg', q)
            results.append(buffer.tobytes())
        return results

