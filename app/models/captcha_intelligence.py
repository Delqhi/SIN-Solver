#!/usr/bin/env python3
"""
🧠 CAPTCHA INTELLIGENCE DATABASE - CEO WORLD-CLASS 2026
========================================================
Training Database für alle CAPTCHA-Typen der Welt
Automated Learning & Pattern Recognition

Features:
- 50+ CAPTCHA Type Classifications
- Automated Screenshot Collection
- Success/Failure Tracking
- Pattern Recognition Training Data
- Anti-Detection Evasion Database
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime, Text, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import Dict, Any, List, Optional
import json

Base = declarative_base()


class CaptchaType(Base):
    """
    Master CAPTCHA Type Registry - ALL known CAPTCHA systems worldwide
    """
    __tablename__ = "captcha_types"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)  # e.g., "recaptcha_v2"
    category = Column(String(50), nullable=False)  # text, image, audio, behavioral, hybrid
    difficulty = Column(Integer, default=1)  # 1-10 scale
    provider = Column(String(100))  # Google, hCaptcha, Cloudflare, etc.
    detection_patterns = Column(JSON)  # How to detect this type
    solving_strategy = Column(String(50))  # vision, ocr, audio, behavioral
    avg_solve_time = Column(Float)  # seconds
    success_rate = Column(Float)  # 0.0-1.0
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Anti-Detection Intelligence
    detection_signatures = Column(JSON)  # Known bot detection methods
    evasion_techniques = Column(JSON)  # How to evade detection
    
    # Training Data Stats
    total_samples = Column(Integer, default=0)
    labeled_samples = Column(Integer, default=0)


class CaptchaTrainingData(Base):
    """
    Training Samples - Screenshots + Solutions + Metadata
    This is the GOLDMINE for ML training
    """
    __tablename__ = "captcha_training_data"
    
    id = Column(Integer, primary_key=True)
    captcha_type_id = Column(Integer, nullable=False)
    
    # Image Data
    screenshot = Column(LargeBinary)  # Full CAPTCHA screenshot
    screenshot_hash = Column(String(64), unique=True)  # SHA256 for deduplication
    
    # Solution Data
    solution = Column(Text)  # The correct answer
    solution_type = Column(String(50))  # text, coordinates, multi_select
    
    # Metadata
    url_source = Column(Text)  # Where this CAPTCHA was found
    difficulty_rating = Column(Integer)  # Human-rated 1-10
    solve_method = Column(String(50))  # How it was solved (human, ai, hybrid)
    
    # Performance Tracking
    solver_used = Column(String(50))  # gemini, mistral, groq (FREE only)
    solve_time_ms = Column(Integer)
    confidence_score = Column(Float)
    was_correct = Column(Boolean)
    
    # Additional Intelligence
    dom_snapshot = Column(JSON)  # HTML structure
    network_requests = Column(JSON)  # XHR/Fetch calls
    javascript_challenges = Column(JSON)  # JS fingerprinting detected
    
    collected_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime)


class AntiDetectionSignature(Base):
    """
    Bot Detection Signatures Database
    Learn from EVERY detection attempt to build evasion strategies
    """
    __tablename__ = "anti_detection_signatures"
    
    id = Column(Integer, primary_key=True)
    detection_type = Column(String(100), nullable=False)  # e.g., "canvas_fingerprint"
    severity = Column(String(20))  # low, medium, high, critical
    
    # Detection Method
    detection_method = Column(Text)  # How bots are detected
    trigger_conditions = Column(JSON)  # What triggers detection
    
    # Evasion Strategy
    evasion_method = Column(Text)  # How to evade
    evasion_code = Column(Text)  # Actual implementation
    success_rate = Column(Float)
    
    # Examples
    detected_scenarios = Column(JSON)  # Real cases where we got detected
    successful_evasions = Column(JSON)  # Real cases where evasion worked
    
    # Intelligence Sources
    source = Column(String(100))  # github, forum, reverse_engineering, own_research
    confidence = Column(Float)  # How confident we are this works
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CaptchaSolveAttempt(Base):
    """
    Real-time Solve Attempt Tracking
    Every single attempt is logged for continuous learning
    """
    __tablename__ = "captcha_solve_attempts"
    
    id = Column(Integer, primary_key=True)
    worker_id = Column(String(50))
    captcha_type_id = Column(Integer)
    
    # Attempt Data
    screenshot_hash = Column(String(64))
    detected_type = Column(String(100))
    detection_confidence = Column(Float)
    
    # Solving Process
    solver_strategy = Column(String(50))  # Router decision
    primary_solver = Column(String(50))  # gemini, mistral
    fallback_solvers = Column(JSON)  # Which fallbacks were tried
    
    # Result
    solution_provided = Column(Text)
    solve_time_ms = Column(Integer)
    was_successful = Column(Boolean)
    error_message = Column(Text)
    
    # Performance Metrics
    response_time_api = Column(Integer)  # API call time
    response_time_browser = Column(Integer)  # Browser interaction time
    response_time_total = Column(Integer)
    
    # Context
    target_url = Column(Text)
    user_agent = Column(Text)
    proxy_used = Column(String(100))
    
    # Learning Data
    feedback_score = Column(Float)  # 0-1, did it actually work?
    retry_count = Column(Integer, default=0)
    
    attempted_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime)


class CaptchaProvider(Base):
    """
    CAPTCHA Provider Intelligence
    Track ALL major providers and their patterns
    """
    __tablename__ = "captcha_providers"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True)  # Google reCAPTCHA, hCaptcha, etc.
    
    # Technical Details
    detection_domains = Column(JSON)  # Domains used for detection
    api_endpoints = Column(JSON)  # Known API endpoints
    javascript_libraries = Column(JSON)  # JS files to detect
    
    # Characteristics
    common_challenges = Column(JSON)  # Types of challenges they use
    difficulty_curve = Column(JSON)  # How difficulty increases
    rate_limiting = Column(JSON)  # Rate limit patterns
    
    # Anti-Bot Techniques
    fingerprinting_methods = Column(JSON)
    behavioral_analysis = Column(JSON)
    machine_learning_detection = Column(JSON)
    
    # Our Intelligence
    bypass_techniques = Column(JSON)  # Known working bypasses
    success_rate = Column(Float)
    last_update_check = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)


# ========================================
# COMPREHENSIVE CAPTCHA TYPE SEED DATA
# ========================================

CAPTCHA_TYPES_SEED = [
    # === GOOGLE RECAPTCHA FAMILY ===
    {"name": "recaptcha_v2_checkbox", "category": "behavioral", "provider": "Google", "difficulty": 3},
    {"name": "recaptcha_v2_invisible", "category": "behavioral", "provider": "Google", "difficulty": 5},
    {"name": "recaptcha_v2_image_grid", "category": "image", "provider": "Google", "difficulty": 6},
    {"name": "recaptcha_v3", "category": "behavioral", "provider": "Google", "difficulty": 8},
    {"name": "recaptcha_enterprise", "category": "hybrid", "provider": "Google", "difficulty": 9},
    
    # === HCAPTCHA FAMILY ===
    {"name": "hcaptcha_checkbox", "category": "behavioral", "provider": "hCaptcha", "difficulty": 4},
    {"name": "hcaptcha_image_labeling", "category": "image", "provider": "hCaptcha", "difficulty": 6},
    {"name": "hcaptcha_bounding_box", "category": "image", "provider": "hCaptcha", "difficulty": 7},
    {"name": "hcaptcha_invisible", "category": "behavioral", "provider": "hCaptcha", "difficulty": 5},
    {"name": "hcaptcha_enterprise", "category": "hybrid", "provider": "hCaptcha", "difficulty": 8},
    
    # === CLOUDFLARE TURNSTILE ===
    {"name": "turnstile_managed", "category": "behavioral", "provider": "Cloudflare", "difficulty": 7},
    {"name": "turnstile_non_interactive", "category": "behavioral", "provider": "Cloudflare", "difficulty": 6},
    {"name": "turnstile_invisible", "category": "behavioral", "provider": "Cloudflare", "difficulty": 8},
    
    # === ARKOSE LABS (FUNCAPTCHA) ===
    {"name": "funcaptcha_rotation", "category": "image", "provider": "Arkose", "difficulty": 7},
    {"name": "funcaptcha_3d_object", "category": "image", "provider": "Arkose", "difficulty": 8},
    {"name": "funcaptcha_puzzle", "category": "image", "provider": "Arkose", "difficulty": 6},
    {"name": "funcaptcha_rolling", "category": "image", "provider": "Arkose", "difficulty": 7},
    
    # === TEXT-BASED CAPTCHAS ===
    {"name": "text_simple", "category": "text", "provider": "Generic", "difficulty": 2},
    {"name": "text_distorted", "category": "text", "provider": "Generic", "difficulty": 4},
    {"name": "text_wavy", "category": "text", "provider": "Generic", "difficulty": 5},
    {"name": "text_noisy", "category": "text", "provider": "Generic", "difficulty": 4},
    {"name": "text_rotated", "category": "text", "provider": "Generic", "difficulty": 5},
    {"name": "text_multilayer", "category": "text", "provider": "Generic", "difficulty": 6},
    
    # === MATH CAPTCHAS ===
    {"name": "math_simple", "category": "text", "provider": "Generic", "difficulty": 1},
    {"name": "math_word_problem", "category": "text", "provider": "Generic", "difficulty": 3},
    {"name": "math_visual", "category": "image", "provider": "Generic", "difficulty": 4},
    
    # === AUDIO CAPTCHAS ===
    {"name": "audio_numbers", "category": "audio", "provider": "Generic", "difficulty": 5},
    {"name": "audio_words", "category": "audio", "provider": "Generic", "difficulty": 6},
    {"name": "audio_distorted", "category": "audio", "provider": "Generic", "difficulty": 7},
    
    # === SLIDER/PUZZLE CAPTCHAS ===
    {"name": "slider_horizontal", "category": "image", "provider": "Generic", "difficulty": 5},
    {"name": "slider_rotation", "category": "image", "provider": "Generic", "difficulty": 6},
    {"name": "puzzle_jigsaw", "category": "image", "provider": "Generic", "difficulty": 6},
    {"name": "puzzle_slider_geetest", "category": "image", "provider": "GeeTest", "difficulty": 7},
    
    # === BEHAVIORAL CAPTCHAS ===
    {"name": "behavioral_mouse_movement", "category": "behavioral", "provider": "Generic", "difficulty": 6},
    {"name": "behavioral_typing_pattern", "category": "behavioral", "provider": "Generic", "difficulty": 7},
    {"name": "behavioral_click_pattern", "category": "behavioral", "provider": "Generic", "difficulty": 6},
    
    # === SPECIALIZED PROVIDERS ===
    {"name": "datadome", "category": "hybrid", "provider": "DataDome", "difficulty": 9},
    {"name": "perimeterx", "category": "hybrid", "provider": "PerimeterX", "difficulty": 9},
    {"name": "kasada", "category": "hybrid", "provider": "Kasada", "difficulty": 10},
    {"name": "akamai_bot_manager", "category": "hybrid", "provider": "Akamai", "difficulty": 10},
    {"name": "imperva", "category": "hybrid", "provider": "Imperva", "difficulty": 9},
    
    # === CHINESE CAPTCHAS ===
    {"name": "chinese_character_recognition", "category": "text", "provider": "Generic", "difficulty": 8},
    {"name": "tencent_captcha", "category": "hybrid", "provider": "Tencent", "difficulty": 7},
    {"name": "alibaba_captcha", "category": "image", "provider": "Alibaba", "difficulty": 7},
    
    # === CUSTOM/RARE TYPES ===
    {"name": "gif_animation_recognition", "category": "image", "provider": "Generic", "difficulty": 8},
    {"name": "svg_puzzle", "category": "image", "provider": "Generic", "difficulty": 7},
    {"name": "canvas_fingerprint_challenge", "category": "behavioral", "provider": "Generic", "difficulty": 9},
    {"name": "proof_of_work", "category": "computational", "provider": "Generic", "difficulty": 7},
    
    # === SOCIAL/VERIFICATION ===
    {"name": "phone_verification", "category": "verification", "provider": "Generic", "difficulty": 10},
    {"name": "email_verification", "category": "verification", "provider": "Generic", "difficulty": 3},
    {"name": "social_media_login", "category": "verification", "provider": "Generic", "difficulty": 8},
]


# ========================================
# ANTI-DETECTION SIGNATURES SEED DATA
# ========================================

ANTI_DETECTION_SIGNATURES_SEED = [
    {
        "detection_type": "webdriver_property",
        "severity": "critical",
        "detection_method": "window.navigator.webdriver === true",
        "evasion_method": "Override navigator.webdriver to undefined before page load",
        "success_rate": 0.95
    },
    {
        "detection_type": "chrome_runtime",
        "severity": "high",
        "detection_method": "Check for window.chrome.runtime",
        "evasion_method": "Inject fake chrome.runtime object",
        "success_rate": 0.90
    },
    {
        "detection_type": "permissions_query",
        "severity": "high",
        "detection_method": "navigator.permissions.query behavior differs",
        "evasion_method": "Override permissions API with human-like responses",
        "success_rate": 0.85
    },
    {
        "detection_type": "canvas_fingerprint",
        "severity": "critical",
        "detection_method": "Canvas rendering produces consistent hash",
        "evasion_method": "Add subtle randomization to canvas operations",
        "success_rate": 0.80
    },
    {
        "detection_type": "webgl_fingerprint",
        "severity": "critical",
        "detection_method": "WebGL parameters are consistent",
        "evasion_method": "Randomize WebGL vendor/renderer strings",
        "success_rate": 0.75
    },
    {
        "detection_type": "audio_context",
        "severity": "medium",
        "detection_method": "AudioContext fingerprinting",
        "evasion_method": "Add noise to audio context output",
        "success_rate": 0.70
    },
    {
        "detection_type": "timezone_inconsistency",
        "severity": "medium",
        "detection_method": "Timezone doesn't match IP geolocation",
        "evasion_method": "Ensure timezone matches proxy location",
        "success_rate": 0.95
    },
    {
        "detection_type": "plugin_enumeration",
        "severity": "low",
        "detection_method": "navigator.plugins is empty or fake",
        "evasion_method": "Inject realistic plugin list",
        "success_rate": 0.85
    },
    {
        "detection_type": "mouse_movement_patterns",
        "severity": "high",
        "detection_method": "Mouse movements are too perfect/linear",
        "evasion_method": "Use Bezier curves with micro-jitter",
        "success_rate": 0.90
    },
    {
        "detection_type": "automation_frameworks",
        "severity": "critical",
        "detection_method": "Detection of Selenium, Puppeteer, Playwright strings",
        "evasion_method": "Remove all automation framework artifacts",
        "success_rate": 0.85
    },
]


def seed_captcha_types(session):
    """Populate database with all known CAPTCHA types"""
    for captcha_data in CAPTCHA_TYPES_SEED:
        existing = session.query(CaptchaType).filter_by(name=captcha_data["name"]).first()
        if not existing:
            captcha = CaptchaType(**captcha_data)
            session.add(captcha)
    session.commit()


def seed_anti_detection_signatures(session):
    """Populate database with anti-detection intelligence"""
    for sig_data in ANTI_DETECTION_SIGNATURES_SEED:
        existing = session.query(AntiDetectionSignature).filter_by(
            detection_type=sig_data["detection_type"]
        ).first()
        if not existing:
            signature = AntiDetectionSignature(**sig_data)
            session.add(signature)
    session.commit()
