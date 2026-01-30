"""
Proof-of-Work Captcha Solver (ALTCHA-style)
============================================
Implements SHA-256 proof-of-work challenge solving for modern invisible captchas.
Based on ALTCHA algorithm: github.com/altcha-org/altcha

Features:
- SHA-256 hash-based challenge solving
- Configurable difficulty levels
- Async/await support for high performance
- ALTCHA challenge detection and parsing
"""

import hashlib
import json
import logging
import asyncio
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
from time import time

logger = logging.getLogger("ProofOfWorkSolver")


@dataclass
class PoWChallenge:
    """Represents a proof-of-work challenge from ALTCHA"""

    algorithm: str
    challenge: str
    salt: str
    signature: str
    difficulty: int
    max_iterations: int = 1000000

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PoWChallenge":
        """Parse challenge from ALTCHA API response or HTML"""
        return cls(
            algorithm=data.get("algorithm", "SHA-256"),
            challenge=data.get("challenge", ""),
            salt=data.get("salt", ""),
            signature=data.get("signature", ""),
            difficulty=data.get("difficulty", 5000),
            max_iterations=data.get("maxnumber", 1000000),
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert back to dictionary for API submission"""
        return {
            "algorithm": self.algorithm,
            "challenge": self.challenge,
            "salt": self.salt,
            "signature": self.signature,
            "difficulty": self.difficulty,
        }


class ProofOfWorkSolver:
    """
    Solver for proof-of-work captchas (ALTCHA, Private Captcha, etc.)

    Uses SHA-256 hashing to find a nonce that satisfies the difficulty requirement.
    The solution proves work was done without requiring image recognition.
    """

    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self._semaphore = asyncio.Semaphore(max_workers)
        logger.info(f"✅ ProofOfWorkSolver initialized (max_workers={max_workers})")

    def _sha256_hash(self, data: str) -> str:
        """Calculate SHA-256 hash of data"""
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    def _check_solution(self, challenge: PoWChallenge, number: int) -> bool:
        """
        Check if a number satisfies the proof-of-work requirement.

        The solution is valid if:
        SHA256(challenge + salt + number) < difficulty_threshold
        """
        # Build the string to hash (ALTCHA format)
        data = f"{challenge.challenge}{challenge.salt}{number}"
        hash_result = self._sha256_hash(data)

        # Convert first 8 chars of hash to integer
        hash_int = int(hash_result[:8], 16)

        # Check if it meets difficulty (lower is harder)
        # Difficulty 5000 means hash_int must be < 5000
        return hash_int < challenge.difficulty

    def solve_sync(self, challenge: PoWChallenge, timeout: float = 30.0) -> Dict[str, Any]:
        """
        Synchronously solve a proof-of-work challenge.

        Args:
            challenge: PoWChallenge object with algorithm, challenge, salt, signature, difficulty
            timeout: Maximum time to spend solving (seconds)

        Returns:
            Dict with 'number' (solution), 'took' (iterations), 'time_ms', 'verified'
        """
        start_time = time()
        number = 0
        took = 0

        logger.info(
            f"🔍 Solving PoW challenge (difficulty={challenge.difficulty}, max={challenge.max_iterations})"
        )

        while number < challenge.max_iterations:
            # Check timeout
            if time() - start_time > timeout:
                logger.warning(f"⏱️ PoW solve timeout after {timeout}s ({number} iterations)")
                raise TimeoutError(f"Proof-of-work solve timeout after {timeout} seconds")

            # Check if this number is the solution
            if self._check_solution(challenge, number):
                took = number + 1
                elapsed_ms = (time() - start_time) * 1000

                logger.info(
                    f"✅ PoW solved! number={number}, took={took} iterations, time={elapsed_ms:.2f}ms"
                )

                # Verify the solution
                verified = self._check_solution(challenge, number)

                return {
                    "success": True,
                    "number": number,
                    "took": took,
                    "time_ms": elapsed_ms,
                    "verified": verified,
                    "challenge": challenge.to_dict(),
                }

            number += 1
            took += 1

        # Exhausted all iterations
        elapsed_ms = (time() - start_time) * 1000
        logger.error(
            f"❌ PoW solve failed: exhausted {challenge.max_iterations} iterations in {elapsed_ms:.2f}ms"
        )
        raise RuntimeError(f"Could not find solution after {challenge.max_iterations} iterations")

    async def solve(self, challenge: PoWChallenge, timeout: float = 30.0) -> Dict[str, Any]:
        """
        Asynchronously solve a proof-of-work challenge.

        This runs the CPU-intensive work in a thread pool to not block the event loop.
        """
        async with self._semaphore:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,  # Uses default executor
                self.solve_sync,
                challenge,
                timeout,
            )

    async def solve_batch(
        self, challenges: list[PoWChallenge], timeout_per_challenge: float = 30.0
    ) -> list[Dict[str, Any]]:
        """
        Solve multiple challenges concurrently.

        Args:
            challenges: List of PoWChallenge objects
            timeout_per_challenge: Timeout for each individual challenge

        Returns:
            List of solution dictionaries
        """

        async def solve_with_error_handling(challenge: PoWChallenge) -> Dict[str, Any]:
            try:
                return await self.solve(challenge, timeout_per_challenge)
            except Exception as e:
                return {"success": False, "error": str(e), "challenge": challenge.to_dict()}

        tasks = [solve_with_error_handling(challenge) for challenge in challenges]
        return await asyncio.gather(*tasks)

    def estimate_solve_time(self, difficulty: int, hash_rate: int = 100000) -> float:
        """
        Estimate average solve time for a given difficulty.

        Args:
            difficulty: The difficulty level (e.g., 5000)
            hash_rate: Estimated hashes per second (default 100k for modern CPU)

        Returns:
            Estimated time in milliseconds
        """
        # Probability of success per iteration: difficulty / 2^32
        # Expected iterations: 2^32 / difficulty
        probability = difficulty / (2**32)
        expected_iterations = 1 / probability
        time_seconds = expected_iterations / hash_rate
        return time_seconds * 1000  # Convert to ms

    def verify_solution(self, challenge: PoWChallenge, number: int) -> bool:
        """
        Verify that a solution is valid for the given challenge.

        Args:
            challenge: The original PoWChallenge
            number: The proposed solution number

        Returns:
            True if the solution is valid
        """
        return self._check_solution(challenge, number)


class AltchaDetector:
    """
    Detects and parses ALTCHA widgets from HTML or API responses.
    """

    def __init__(self):
        self.indicators = [
            "altcha",
            "data-altcha",
            "altcha-widget",
            "proof-of-work",
            "data-challenge",
            "data-salt",
        ]
        logger.info("✅ AltchaDetector initialized")

    def detect_in_html(self, html_content: str) -> bool:
        """
        Check if HTML contains ALTCHA widget indicators.

        Args:
            html_content: Raw HTML string

        Returns:
            True if ALTCHA is likely present
        """
        html_lower = html_content.lower()
        return any(indicator in html_lower for indicator in self.indicators)

    def extract_challenge(self, html_content: str) -> Optional[PoWChallenge]:
        """
        Extract ALTCHA challenge parameters from HTML.

        Looks for:
        - data-challenge attribute
        - data-salt attribute
        - data-algorithm attribute
        - data-signature attribute
        - data-difficulty attribute

        Args:
            html_content: Raw HTML containing ALTCHA widget

        Returns:
            PoWChallenge if found, None otherwise
        """
        import re

        # Try to find data attributes
        patterns = {
            "challenge": r'data-challenge=["\']([^"\']+)["\']',
            "salt": r'data-salt=["\']([^"\']+)["\']',
            "algorithm": r'data-algorithm=["\']([^"\']+)["\']',
            "signature": r'data-signature=["\']([^"\']+)["\']',
            "difficulty": r'data-difficulty=["\'](\d+)["\']',
        }

        extracted = {}
        for key, pattern in patterns.items():
            match = re.search(pattern, html_content, re.IGNORECASE)
            if match:
                extracted[key] = match.group(1)

        if "challenge" in extracted and "salt" in extracted:
            challenge_data = {
                "algorithm": extracted.get("algorithm", "SHA-256"),
                "challenge": extracted["challenge"],
                "salt": extracted["salt"],
                "signature": extracted.get("signature", ""),
                "difficulty": int(extracted.get("difficulty", 5000)),
            }
            logger.info(
                f"🔍 Extracted ALTCHA challenge from HTML (difficulty={challenge_data['difficulty']})"
            )
            return PoWChallenge.from_dict(challenge_data)

        logger.debug("No ALTCHA challenge found in HTML")
        return None

    def extract_from_api_response(self, response_data: Dict[str, Any]) -> Optional[PoWChallenge]:
        """
        Extract challenge from ALTCHA API response.

        Args:
            response_data: JSON response from ALTCHA server

        Returns:
            PoWChallenge if valid, None otherwise
        """
        # Check for required fields
        if "challenge" in response_data and "salt" in response_data:
            logger.info("🔍 Extracted ALTCHA challenge from API response")
            return PoWChallenge.from_dict(response_data)

        return None


# Convenience functions for quick usage
async def solve_altcha_challenge(
    challenge_dict: Dict[str, Any], timeout: float = 30.0
) -> Dict[str, Any]:
    """
    Quick function to solve an ALTCHA challenge from dictionary data.

    Args:
        challenge_dict: Challenge data with algorithm, challenge, salt, signature, difficulty
        timeout: Maximum solve time in seconds

    Returns:
        Solution dictionary with number, took, time_ms, verified
    """
    solver = ProofOfWorkSolver()
    challenge = PoWChallenge.from_dict(challenge_dict)
    return await solver.solve(challenge, timeout)


def solve_altcha_sync(challenge_dict: Dict[str, Any], timeout: float = 30.0) -> Dict[str, Any]:
    """
    Synchronous version for simple usage.

    Args:
        challenge_dict: Challenge data
        timeout: Maximum solve time in seconds

    Returns:
        Solution dictionary
    """
    solver = ProofOfWorkSolver()
    challenge = PoWChallenge.from_dict(challenge_dict)
    return solver.solve_sync(challenge, timeout)
