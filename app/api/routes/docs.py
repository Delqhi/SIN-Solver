import os
import json
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List, Optional
from pathlib import Path

router = APIRouter()

DOCS_DIR = Path("doc")


def get_doc_structure():
    return {
        "user": [
            {"title": "Getting Started", "path": "user/getting-started.md"},
            {"title": "User Manual", "path": "user/user-guide.md"},
            {"title": "Best Practices", "path": "user/best-practices.md"},
            {"title": "FAQ", "path": "user/faq.md"},
        ],
        "developer": [
            {"title": "Quick Start", "path": "developer/quick-start.md"},
            {"title": "Architecture", "path": "developer/architecture.md"},
            {"title": "API Reference", "path": "developer/api-reference.md"},
            {"title": "Deployment", "path": "developer/deployment.md"},
        ],
        "agents": [
            {"title": "Agent Zero", "path": "agents/agent-zero.md"},
            {"title": "Skyvern", "path": "agents/skyvern.md"},
            {"title": "Stagehand", "path": "agents/stagehand.md"},
        ],
    }


@router.get("/")
async def get_docs(doc: Optional[str] = Query(None)):
    if not doc:
        return get_doc_structure()

    safe_path = DOCS_DIR / doc
    if not safe_path.exists() or not str(safe_path.resolve()).startswith(str(DOCS_DIR.resolve())):
        if doc == "lastchanges.md":
            lc_path = Path("lastchanges.md")
            if lc_path.exists():
                return {"content": lc_path.read_text()}

        root_doc = Path("doc") / doc
        if root_doc.exists():
            return {"content": root_doc.read_text()}

        proj_doc = Path(doc)
        if proj_doc.exists() and proj_doc.suffix == ".md":
            return {"content": proj_doc.read_text()}

        raise HTTPException(status_code=404, detail="Document not found")

    return {"content": safe_path.read_text()}
