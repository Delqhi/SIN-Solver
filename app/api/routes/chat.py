from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import os
import logging
from app.services.gemini_solver import get_gemini_solver

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[str] = None

@router.post("/")
async def chat(request: ChatRequest):
    last_msg = request.messages[-1].content
    
    # SYSTEM PROMPT for the CEO Assistant
    system_prompt = """You are the SIN-Solver Empire AI, the primary interface for the CEO.
Your tone is professional, efficient, and slightly ambitious. 
You manage 16 rooms of specialized agents.
Current Room Mapping:
- Zimmer-01: n8n Orchestrator
- Zimmer-03: Agent Zero (Code)
- Zimmer-05: Steel Browser (CDP)
- Zimmer-06: Skyvern (Vision)
- Zimmer-11: Dashboard
- Zimmer-13: API Gateway
- Zimmer-16: Supabase (DB)

When the CEO gives a command or asks a question, provide a REAL answer based on this context.
If it's a command like /solve [URL], acknowledge that you are dispatching workers.
"""

    try:
        # Use real Gemini solver for chat
        solver = get_gemini_solver()
        
        # Construct full prompt with history
        history_text = "\n".join([f"{m.role}: {m.content}" for m in request.messages])
        full_prompt = f"{system_prompt}\n\nRecent History:\n{history_text}\n\nAI Response:"
        
        result = await solver.solve_text(full_prompt)
        
        if result.get("success"):
            return {"role": "ai", "content": result["solution"]}
        else:
            raise HTTPException(status_code=500, detail=f"AI Solver failed: {result.get('error')}")

    except Exception as e:
        logger.error(f"Chat failed: {e}")
        return {
            "role": "ai", 
            "content": f"CEO, I encountered an internal processing error: {str(e)}. I am resetting my logic cores."
        }
