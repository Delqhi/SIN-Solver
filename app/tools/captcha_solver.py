import os
import base64
import httpx
from python.helpers.tool import Tool, Response
from python.helpers.print_style import PrintStyle

class CaptchaSolver(Tool):
    async def execute(self, image_path=None, question=None, **kwargs):
        """
        Solves a CAPTCHA using the SIN-Solver API.
        
        Args:
            image_path (str): Path to the CAPTCHA image file.
            question (str): Text question or math problem (for text-based CAPTCHAs).
            
        Returns:
            Response: The solution to the CAPTCHA.
        """
        api_url = os.getenv("SIN_SOLVER_API_URL", "http://localhost:8000")
        api_key = os.getenv("SIN_SOLVER_API_KEY", "your-api-key") # Ensure this is set in your env

        if not image_path and not question:
            return Response(message="Error: Please provide either 'image_path' or 'question'.", break_loop=False)

        payload = {"use_cache": True}
        
        if image_path:
            # Check if file exists
            if not os.path.exists(image_path):
                 return Response(message=f"Error: Image file not found at {image_path}", break_loop=False)
                 
            try:
                with open(image_path, "rb") as f:
                    image_data = f.read()
                    payload["image_base64"] = base64.b64encode(image_data).decode("utf-8")
            except Exception as e:
                return Response(message=f"Error reading image file: {str(e)}", break_loop=False)

        if question:
            payload["question"] = question

        try:
            headers = {
                "X-API-Key": api_key,
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{api_url}/solve/auto",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    solution = result.get("solution", "")
                    confidence = result.get("confidence", 0.0)
                    solver = result.get("solver_used", "unknown")
                    
                    msg = f"CAPTCHA Solved: '{solution}' (Confidence: {confidence}, Solver: {solver})"
                    
                    # Print using Agent Zero style
                    PrintStyle(font_color="#2ECC71", padding=True, bold=True).print(msg)
                    
                    return Response(message=msg, break_loop=False)
                else:
                    error_msg = f"API Error {response.status_code}: {response.text}"
                    PrintStyle(font_color="#E74C3C", padding=True).print(error_msg)
                    return Response(message=error_msg, break_loop=False)
                    
        except Exception as e:
            error_msg = f"Connection Error: {str(e)}"
            PrintStyle(font_color="#E74C3C", padding=True).print(error_msg)
            return Response(message=error_msg, break_loop=False)
