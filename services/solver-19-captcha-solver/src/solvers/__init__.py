from src.solvers.ocr_solver import OCRSolver
from src.solvers.slider_solver import SliderSolver
from src.solvers.audio_solver import AudioSolver
from src.solvers.click_solver import ClickSolver
from src.solvers.image_classifier import ImageClassifier
from src.solvers.proof_of_work_solver import (
    ProofOfWorkSolver,
    AltchaDetector,
    PoWChallenge,
    solve_altcha_challenge,
    solve_altcha_sync
)
from src.solvers.browser_automation_solver import (
    BrowserAutomationSolver,
    ElementDetector,
    LLMPlanner,
    BrowserController,
    Element,
    Action,
    BrowserState,
    ActionType,
    solve_captcha_with_browser
)

__all__ = [
    "OCRSolver",
    "SliderSolver",
    "AudioSolver",
    "ClickSolver",
    "ImageClassifier",
    "ProofOfWorkSolver",
    "AltchaDetector",
    "PoWChallenge",
    "solve_altcha_challenge",
    "solve_altcha_sync",
    "BrowserAutomationSolver",
    "ElementDetector",
    "LLMPlanner",
    "BrowserController",
    "Element",
    "Action",
    "BrowserState",
    "ActionType",
    "solve_captcha_with_browser"
]
