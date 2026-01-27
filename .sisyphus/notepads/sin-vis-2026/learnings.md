## [2026-01-25] Task: Exploration of Vision Stack for SIN-VIS-2026

### Findings

#### 1. YOLO Logic & Integration
- **Missing Argument**: In `app/services/vision_orchestrator.py`, the method `solve_with_visual_grounding` (line 362) calls `self.vision_orchestrator.solve_visual_task` (line 378). It *does* pass `target_object=target_object`. However, the plan mentions `solve_with_visual_grounding` in `CaptchaVisionSolver` (which is a class in `vision_orchestrator.py`).
- **YOLO Trigger**: `solve_visual_task` (line 107) *does* use `target_object` to trigger YOLO (line 140).
- **Missing Model**: `models/yolov8x.pt` is indeed missing.
- **Grid Optimization**: `solve_sliced_captcha` (line 485) has a "CEO 2026 OPTIMIZATION" (line 494) that tries YOLO on the full image first. However, it uses `await asyncio.to_thread(self.vision_orchestrator.yolo_solver.detect_objects, ...)` but `self.vision_orchestrator` is not defined in that scope (it should be `self.vision_orchestrator.yolo_solver` or similar, but `solve_sliced_captcha` is a method of `CaptchaVisionSolver` which has `self.vision_orchestrator`). Wait, `CaptchaVisionSolver` has `self.vision_orchestrator`. So `self.vision_orchestrator.yolo_solver` is correct.

#### 2. Caching (PHash)
- **FORCE_REAL**: I searched for `FORCE_REAL` and found NO matches in the codebase. The plan says it's hardcoded in `solve_sliced_captcha`, but I don't see it in `app/services/vision_orchestrator.py`.
- **VisionCache**: `VisionCache` is used in `solve_visual_task` (line 119) and `solve_sliced_captcha` (line 535).

#### 3. FunCaptcha Solver
- **Initialization Overhead**: `FunCaptchaSolver.__init__` (line 22) creates a new `CaptchaVisionSolver` instance: `self.vision_solver = CaptchaVisionSolver()`. `CaptchaVisionSolver.__init__` (line 314) creates a new `VisionOrchestrator`. `VisionOrchestrator.__init__` (line 41) loads `.env`, inits Gemini and Mistral clients, and inits YOLO. This happens on EVERY `FunCaptchaSolver` instantiation if not shared.

#### 4. Code Quality
- **Redundancy**: `SmartCaptchaAnalyzer` was NOT found in `app/services/vision_cache.py` or anywhere else. It might have been removed or renamed.
- **PHash**: `PHashSolver.get_phash` (line 18) has a check `image_input.startswith("data:image") or len(image_input) > 256` to distinguish between path and base64. This is the "arbitrary length check" mentioned in the plan.

### Recommendations
- Fix `FunCaptchaSolver` to use a shared vision stack.
- Implement `detect_grid` in `YOLOSolver` to avoid duplicating mapping logic in `solve_sliced_captcha`.
- Fix the missing YOLO model issue.
- Verify if `FORCE_REAL` was already removed or if it's in a different file.
