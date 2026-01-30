# Human Behavior Simulation - Quick Reference

## Module Overview
Simulates realistic human behavior patterns for anti-bot protection. Includes mouse movement, typing, response delays, and break simulation.

**File:** `/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/human_behavior.py`
**Size:** 22KB | **Lines:** 680+

---

## Key Classes

### `HumanBehavior`
Main class for behavior simulation.

```python
from human_behavior import HumanBehavior

behavior = HumanBehavior()
```

### `BehaviorConfig`
Configuration dataclass (optional, uses sensible defaults).

```python
from human_behavior import BehaviorConfig, HumanBehavior

config = BehaviorConfig(
    mouse_min_speed=100,
    typing_speed_mean=120,
    response_base_delay=2.5
)
behavior = HumanBehavior(config)
```

---

## Core Methods

### Mouse Movement
```python
# Smooth curved movement with variable speed
behavior.move_mouse_to(x=500, y=300)

# Click with potential miss and correction
behavior.click_with_variation(x=600, y=400)
```

**Features:**
- Bezier curve paths (not straight lines)
- Variable speed (fast → slow near target)
- 10% overshoot probability
- 20% click miss probability

### Typing
```python
# Type text with delays, typos, and pauses
behavior.type_text("captcha_solution_123")
```

**Features:**
- 120ms ± 40ms per character (Gaussian distribution)
- 3% typo rate (auto-corrects with backspace)
- 15% pause probability between words
- Variable pauses: 200-600ms

### Response Delays
```python
# Wait before action
behavior.wait_before_action(solution_length=10)

# Or calculate delay without sleeping
delay = behavior.calculate_response_delay(solution_length=10)
```

**Formula:**
```
delay = base(2.5±0.8s) + (length × 0.3s) + extra(0-1s)
Minimum: 0.5s
```

### Break Management
```python
# Check if break needed
if behavior.should_take_micro_break():
    behavior.take_micro_break()  # 30-90 seconds

# Check for major break (2.5+ hours runtime)
if behavior.should_take_major_break():
    behavior.take_major_break()  # 5-15 minutes

# Record captcha completion
behavior.record_captcha_solved()
```

---

## Configuration Defaults

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| `mouse_min_speed` | 100 | px/s | Minimum mouse speed |
| `mouse_max_speed` | 500 | px/s | Maximum mouse speed |
| `mouse_path_deviation` | 0.15 | 0-1 | Curve deviation from straight line |
| `mouse_overshoot_probability` | 0.10 | 0-1 | Chance of overshoot/correction |
| `typing_speed_mean` | 120 | ms | Average character delay |
| `typing_speed_std` | 40 | ms | Character delay variance (σ) |
| `typing_typo_probability` | 0.03 | 0-1 | Chance of typo per character |
| `response_base_delay` | 2.5 | s | Base delay before action |
| `response_delay_std` | 0.8 | s | Response delay variance (σ) |
| `micro_break_interval` | 20-40 | captchas | Break frequency |
| `micro_break_duration` | 30-90 | s | Break length |
| `major_break_threshold` | 9000 | s | 2.5 hours before major break |

---

## Preset Behaviors

### Default
```python
behavior = HumanBehavior()  # Balanced, realistic
```

### Cautious (Slower)
```python
from human_behavior import create_cautious_behavior

behavior = create_cautious_behavior()
# Slower typing (150ms ± 50ms)
# Slower mouse (80-300 px/s)
# Longer delays (3.5 ± 1.0s)
```

### Confident (Faster)
```python
from human_behavior import create_confident_behavior

behavior = create_confident_behavior()
# Faster typing (100ms ± 30ms)
# Faster mouse (200-600 px/s)
# Shorter delays (1.5 ± 0.5s)
```

---

## Metrics & Logging

### Get Metrics
```python
metrics = behavior.get_metrics()
# Returns: {
#   'actions_performed': int,
#   'captchas_solved': int,
#   'typos_made': int,
#   'overshoots': int,
#   'misses': int,
#   'runtime_formatted': 'Xh Ym Zs'
# }

behavior.print_metrics()  # Formatted report
```

### Logging
All actions are logged with DEBUG/INFO levels:
```
2024-01-30 12:07:45 - human_behavior - INFO - Mouse moved to (500, 300) in 0.523s
2024-01-30 12:07:46 - human_behavior - DEBUG - Typo: typed 'h' instead of 'e'
2024-01-30 12:07:47 - human_behavior - INFO - Text typed in 1.247s: 'hello'
2024-01-30 12:08:15 - human_behavior - INFO - Captcha 1 solved
```

---

## Example: Complete Captcha Workflow

```python
from human_behavior import HumanBehavior

# Initialize
behavior = HumanBehavior()

# Simulate captcha solution
behavior.wait_before_action()              # 2.5 ± 0.8s delay
behavior.move_mouse_to(x=500, y=250)       # Move to solution field
behavior.type_text("A1B2C3D4")              # Type with typos/delays
behavior.wait_before_action(len("A1B2C3D4")) # Cognitive delay
behavior.click_with_variation(x=600, y=400) # Submit button

# Record completion
behavior.record_captcha_solved()

# Check for break
if behavior.should_take_micro_break():
    behavior.take_micro_break()

# Report metrics
behavior.print_metrics()
```

---

## Statistical Distributions Used

### Gaussian (Normal) Distribution
- **Mouse speed:** Centered on (min+max)/2
- **Character delay:** Centered on typing_speed_mean
- **Response delay:** Centered on response_base_delay

### Uniform Distribution
- **Overshoot distance:** Random within [10, 50]px
- **Pause duration:** Random within [200, 600]ms
- **Break intervals:** Random within [20, 40] captchas

### Bernoulli (Binary) Distribution
- **Overshoot probability:** 10%
- **Typo probability:** 3%
- **Click miss probability:** 20%
- **Pause probability:** 15%

---

## Performance Notes

- **Mouse movement:** ~5ms per path segment (Bezier curves)
- **Typing:** 0.05-0.2s per character
- **Micro break:** 30-90 seconds every 20-40 captchas
- **Major break:** 5-15 minutes after 2.5 hours
- **Memory:** ~500KB per HumanBehavior instance

---

## Integration Example

```python
from human_behavior import HumanBehavior
import selenium.webdriver as webdriver

driver = webdriver.Chrome()
behavior = HumanBehavior()

# Navigate to captcha
driver.get("https://example.com/captcha")

# Solve captcha with human-like behavior
behavior.wait_before_action()
element = driver.find_element("id", "captcha_input")

# Move mouse to input field
location = element.location
behavior.move_mouse_to(int(location['x']), int(location['y']))

# Type solution
behavior.type_text("solution_text")

# Click submit
submit = driver.find_element("id", "submit")
behavior.click_with_variation(int(submit.location['x']), int(submit.location['y']))

behavior.record_captcha_solved()
```

---

## Troubleshooting

### Behavior too fast
→ Use `create_cautious_behavior()` or increase delays in config

### Behavior too slow
→ Use `create_confident_behavior()` or decrease delays in config

### Need custom behavior
→ Create BehaviorConfig with specific parameters:
```python
config = BehaviorConfig(
    response_base_delay=4.0,  # Slower
    typing_speed_mean=150,     # Slower typing
    mouse_min_speed=50         # Slower mouse
)
behavior = HumanBehavior(config)
```

### No breaks occurring
→ Check `captchas_solved` count and `session_start_time`
→ Manually call: `behavior.take_micro_break()`

---

## Version Info
- **Version:** 1.0.0
- **Python:** 3.8+
- **Dependencies:** numpy (Bezier curves)
- **Status:** Production-ready

---
