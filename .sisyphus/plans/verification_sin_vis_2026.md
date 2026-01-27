# Plan: Computer Vision Mastery Verification & Optimization (SIN-VIS-2026)

## Status
- **Phase**: Verification & Repair
- **Date**: 2026-01-25
- **Owner**: Prometheus (Strategic Planner)

## 📋 Executive Summary
An exhaustive verification of the `SIN-VIS-2026` vision stack revealed critical logical gaps and performance bottlenecks. Most notably, the local YOLO solver is never actually triggered due to missing arguments in internal calls, and the model file itself is missing. Grid detection is currently using a slow, un-cached 9-slice approach.

## 🔍 Findings

### 1. YOLO Logic & Integration
- **Bug**: `solve_with_visual_grounding` in `CaptchaVisionSolver` forgets to pass the `target_object` to `solve_visual_task`. This prevents YOLO from ever being used.
- **Critical Gap**: The model file `models/yolov8x.pt` is missing.
- **Missed Optimization**: `solve_sliced_captcha` does not use YOLO for the full grid, opting for 9 serial AI calls instead.

### 2. Caching (PHash)
- **Bottleneck**: `FORCE_REAL = True` is hardcoded in `solve_sliced_captcha`, disabling the `VisionCache` and `PHashSolver`.
- **Logic Gap**: `PHashSolver` uses an arbitrary length check for base64 detection.

### 3. FunCaptcha Solver
- **Inefficiency**: Re-initializes the entire vision stack on every call.
- **Assumption**: Hardcoded 30-degree rotation steps might fail on newer Arkose challenges.

### 4. Code Quality
- **Redundancy**: `SmartCaptchaAnalyzer` in `vision_cache.py` duplicates `CaptchaVisionSolver` logic.

## 🛠️ Work Plan

### Phase 1: Core Fixes (Sisyphus)
1. **Fix argument passing** in `VisionOrchestrator.py` to ensure `target_object` reaches YOLO.
2. **Implement shared instance** for `VisionOrchestrator` to reduce init overhead.
3. **Enable Caching**: Remove hardcoded `FORCE_REAL` and allow configuration.

### Phase 2: YOLO & Grid Optimization
1. **YOLO Grid Logic**: Add `detect_grid` to `YOLOSolver` to map full-image detections to 3x3 grid indices.
2. **Model Management**: Add logic to auto-download or verify the YOLOv8x model.
3. **Fast-Path Integration**: Update `solve_sliced_captcha` to use YOLO grid detection as the first attempt.

### Phase 3: FunCaptcha & Cleanup
1. **Refactor FunCaptcha**: Use shared vision orchestrator.
2. **Remove Redundancy**: Delete or merge `SmartCaptchaAnalyzer`.
3. **Robust PHash**: Improve base64/path detection logic.

## 🏁 Acceptance Criteria
- [ ] `solve_with_visual_grounding` successfully uses YOLO for detection (verified by logs).
- [ ] `solve_sliced_captcha` uses YOLO as first-pass for grids.
- [ ] `VisionCache` is active and hits for repeated slices.
- [ ] YOLO model is correctly located/downloaded.
- [ ] FunCaptcha uses the shared vision stack.

## ⚠️ Guardrails
- Ensure `ultralytics` dependency is handled gracefully if not installed.
- Maintain Gemini 3 Pro as the ground-truth fallback if YOLO confidence is low.
