"""
Worker Platforms Module
Earn money by solving captchas on various platforms
"""

from .twocaptcha_worker import TwoCaptchaWorker
from .worker_manager import WorkerManager

__all__ = ["TwoCaptchaWorker", "WorkerManager"]
