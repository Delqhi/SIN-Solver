"""
SIN-Solver CAPTCHA Worker Package
==================================
Consensus-based multi-agent CAPTCHA solving framework.

This package provides:
- CaptchaWorker: Main worker class for solving CAPTCHAs
- ConsensusSolver: Multi-agent voting mechanism
- CaptchaAgent (ABC): Abstract agent interface
- MockOCRAgent: Mock OCR for testing
- AgentResult: Result data structure

Version: 0.1.0-alpha (Phase 3)
License: Apache 2.0

Quick Start:
    from captcha_worker import CaptchaWorker
    import asyncio

    async def main():
        worker = CaptchaWorker(num_agents=3)
        result = await worker.solve_captcha("captcha.png")
        print(f"Solved: {result.solution}")

    asyncio.run(main())
"""

from agents import CaptchaAgent, MockOCRAgent, AgentResult, RealOCRAgent
from consensus_solver import ConsensusSolver, VotingStrategy
from captcha_worker import CaptchaWorker, CaptchaResult, WorkerStats

__version__ = "0.1.0-alpha"
__author__ = "Sisyphus Engineering"
__license__ = "Apache 2.0"

__all__ = [
    # Worker
    "CaptchaWorker",
    "CaptchaResult",
    "WorkerStats",
    # Consensus
    "ConsensusSolver",
    "VotingStrategy",
    # Agents
    "CaptchaAgent",
    "MockOCRAgent",
    "RealOCRAgent",
    "AgentResult",
]
