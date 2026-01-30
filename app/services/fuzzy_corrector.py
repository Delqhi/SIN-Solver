"""
Fuzzy-Korrektur Engine for CAPTCHA OCR Optimization
Bridges the gap to 99.9% accuracy by fixing common LLM hallucinations and OCR errors.
"""

import logging
import re
from typing import List, Optional, Dict

logger = logging.getLogger(__name__)


class FuzzyCorrector:
    """
    Advanced correction logic for OCR results.
    Handles 'rn' vs 'm' and other common optical illusions.
    """

    # Common OCR misidentifications
    HALLUCINATION_MAP = {
        "rn": "m",
        "rm": "m",
        "vv": "w",
        "cl": "d",
        "0": "o",  # Often swapped in alpha CAPTCHAs
        "1": "l",
        "5": "s",
        "2": "z",
        "8": "b",
    }

    def __init__(self):
        try:
            from Levenshtein import distance

            self.lev_distance = distance
        except ImportError:
            logger.warning("python-Levenshtein not found. Using naive distance fallback.")
            self.lev_distance = self._naive_levenshtein

    def _naive_levenshtein(self, s1: str, s2: str) -> int:
        """Fallback implementation of Levenshtein distance."""
        if len(s1) < len(s2):
            return self._naive_levenshtein(s2, s1)
        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        return previous_row[-1]

    def clean_string(self, text: str) -> str:
        """Basic cleanup: remove whitespace and non-alphanumeric if needed."""
        if not text:
            return ""
        return re.sub(r"[^a-zA-Z0-9]", "", text).lower()

    def find_consensus(self, candidates: List[str], target_length: Optional[int] = None) -> str:
        """
        Finds the most likely solution from a list of model outputs.
        Prioritizes candidates that match the target length.
        """
        cleaned = [self.clean_string(c) for c in candidates if c]
        if not cleaned:
            return ""

        # 1. Filter by target length if provided
        if target_length:
            matches = [c for c in cleaned if len(c) == target_length]
            if matches:
                return self._get_most_frequent(matches)

        # 2. Try to fix length via hallucination map
        fixed_candidates = []
        for c in cleaned:
            fixed = self._apply_hallucination_fixes(c, target_length)
            fixed_candidates.append(fixed)

        return self._get_most_frequent(fixed_candidates)

    def _apply_hallucination_fixes(self, text: str, target_length: Optional[int]) -> str:
        """Tries to reach target length by merging common OCR splits (e.g. rn -> m)."""
        if not target_length or len(text) <= target_length:
            return text

        result = text
        # If too long, look for known splits
        for pattern, replacement in self.HALLUCINATION_MAP.items():
            if len(result) > target_length and pattern in result:
                result = result.replace(pattern, replacement, 1)

        return result

    def _get_most_frequent(self, items: List[str]) -> str:
        """Returns the most frequent item in a list."""
        if not items:
            return ""
        counts = {}
        for item in items:
            counts[item] = counts.get(item, 0) + 1
        return max(counts, key=counts.get)

    def verify_confidence(self, solution: str, candidates: List[str]) -> float:
        """Calculates a confidence score based on similarity between candidates."""
        if not candidates or not solution:
            return 0.0

        total_dist = 0
        for c in candidates:
            total_dist += self.lev_distance(solution, self.clean_string(c))

        avg_dist = total_dist / len(candidates)
        # Score: 1.0 (perfect) down to 0.0
        score = max(0.0, 1.0 - (avg_dist / max(1, len(solution))))
        return score


# Singleton instance
fuzzy_corrector = FuzzyCorrector()
