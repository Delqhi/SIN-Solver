"""
🕵️‍♂️ FORENSIC ERROR LEDGER (MODULE 04)
=====================================
"The Truth, The Whole Truth, and Nothing But The Truth."
"""

import logging
import json
import traceback
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("Forensics")


class ForensicLedger:
    def __init__(self, ledger_path: str = "forensic_ledger.jsonl"):
        self.ledger_path = Path(ledger_path)

    def record_error(
        self,
        error_code: str,
        message: str,
        context: Dict[str, Any],
        exception: Optional[Exception] = None,
        severity: str = "ERROR",
    ):
        """
        Immutably records an error to the forensic ledger.
        """
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "severity": severity,
            "error_code": error_code,
            "message": message,
            "context": context,
            "stack_trace": "".join(traceback.format_tb(exception.__traceback__))
            if exception
            else None,
            "executor": sys.argv[0],
        }

        # 1. Log to Console (Immediate Visibility)
        logger.error(f"[{error_code}] {message}")

        # 2. Append to Immutable Ledger (JSONL)
        try:
            with open(self.ledger_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception as e:
            # Meta-Error: If forensics fail, we scream to stderr
            sys.stderr.write(f"CRITICAL FORENSIC FAILURE: {e}\n")

    def get_recent_errors(self, limit: int = 10):
        """Retrieves the last N errors for RCA."""
        if not self.ledger_path.exists():
            return []

        with open(self.ledger_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            return [json.loads(line) for line in lines[-limit:]]


# Singleton
forensics = ForensicLedger()
