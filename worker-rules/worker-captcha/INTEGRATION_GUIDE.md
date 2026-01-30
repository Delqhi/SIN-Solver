# Human Behavior Module - Integration Guide

## Overview

The `human_behavior.py` module provides realistic human behavior simulation for captcha solving and anti-bot evasion. This guide explains how to integrate it into your captcha solving pipeline.

**Location:** `/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/human_behavior.py`

---

## Quick Integration

### 1. Basic Import
```python
from worker_captcha.human_behavior import HumanBehavior

behavior = HumanBehavior()
```

### 2. Selenium Integration
```python
from selenium import webdriver
from worker_captcha.human_behavior import HumanBehavior

driver = webdriver.Chrome()
behavior = HumanBehavior()

# Navigate to captcha
driver.get("https://example.com/login")

# Simulate human-like interaction
behavior.wait_before_action()
username_field = driver.find_element("id", "username")
behavior.move_mouse_to(username_field.location['x'], username_field.location['y'])
behavior.type_text("myusername")

behavior.wait_before_action()
password_field = driver.find_element("id", "password")
behavior.move_mouse_to(password_field.location['x'], password_field.location['y'])
behavior.type_text("mypassword")

behavior.wait_before_action()
submit_button = driver.find_element("id", "submit")
behavior.click_with_variation(submit_button.location['x'], submit_button.location['y'])

behavior.record_captcha_solved()
```

### 3. Playwright Integration
```python
from playwright.sync_api import sync_playwright
from worker_captcha.human_behavior import HumanBehavior

def solve_with_human_behavior():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        behavior = HumanBehavior()
        
        page.goto("https://example.com/captcha")
        
        # Fill captcha field
        behavior.wait_before_action()
        page.click("input[name='captcha']")
        behavior.type_text("ABCD1234")
        
        # Submit
        behavior.wait_before_action()
        behavior.click_with_variation(
            page.locator("button[type='submit']").bounding_box()['x'],
            page.locator("button[type='submit']").bounding_box()['y']
        )
        
        behavior.record_captcha_solved()
        
        browser.close()
```

---

## Advanced Patterns

### Pattern 1: Break Management Loop
```python
from worker_captcha.human_behavior import HumanBehavior

behavior = HumanBehavior()

for captcha in captcha_queue:
    # Solve captcha with human behavior
    behavior.wait_before_action()
    solve_captcha(captcha, behavior)
    behavior.record_captcha_solved()
    
    # Check for breaks
    if behavior.should_take_micro_break():
        print("Taking micro break...")
        behavior.take_micro_break()
    
    if behavior.should_take_major_break():
        print("Taking major break (2.5+ hours)...")
        behavior.take_major_break()
```

### Pattern 2: Custom Behavior Configuration
```python
from worker_captcha.human_behavior import BehaviorConfig, HumanBehavior

# Create cautious profile for high-security sites
config = BehaviorConfig(
    response_base_delay=4.0,      # Longer thinking time
    response_delay_std=1.2,
    typing_speed_mean=150,         # Slower typing
    typing_typo_probability=0.02,  # Fewer typos
    mouse_min_speed=50,            # Slower mouse
    mouse_max_speed=200
)

behavior = HumanBehavior(config)
solve_captcha_carefully(behavior)
```

### Pattern 3: Behavior Switching
```python
from worker_captcha.human_behavior import (
    create_default_behavior,
    create_cautious_behavior,
    create_confident_behavior
)

# Start with default
behavior = create_default_behavior()

for i in range(100):
    if i < 30:
        # Normal pace for first 30
        behavior = create_default_behavior()
    elif i < 70:
        # Slower for middle block
        behavior = create_cautious_behavior()
    else:
        # Faster for final block
        behavior = create_confident_behavior()
    
    solve_captcha(behavior)
    behavior.record_captcha_solved()
```

### Pattern 4: Metrics Tracking
```python
from worker_captcha.human_behavior import HumanBehavior
import json

behavior = HumanBehavior()

# Solve captchas
for _ in range(50):
    solve_captcha(behavior)
    behavior.record_captcha_solved()

# Get metrics
metrics = behavior.get_metrics()

# Log to file
with open("behavior_metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

# Print summary
behavior.print_metrics()
```

---

## Integration with Captcha Solver

### Factory Pattern
```python
class CaptchaSolver:
    def __init__(self, behavior_type='default'):
        from worker_captcha.human_behavior import (
            create_default_behavior,
            create_cautious_behavior,
            create_confident_behavior
        )
        
        factories = {
            'default': create_default_behavior,
            'cautious': create_cautious_behavior,
            'confident': create_confident_behavior
        }
        
        self.behavior = factories.get(behavior_type, create_default_behavior)()
    
    def solve(self, captcha):
        """Solve captcha with human-like behavior"""
        self.behavior.wait_before_action()
        
        # Move to field, type solution, submit
        solution = self.recognize_captcha(captcha)
        self.fill_and_submit(solution)
        
        self.behavior.record_captcha_solved()
        
        # Check for breaks
        if self.behavior.should_take_micro_break():
            self.behavior.take_micro_break()
        
        return True
```

### Middleware Pattern (n8n/Make.com)
```python
# n8n Execute Python node
def execute_captcha_with_behavior(captcha_data):
    from worker_captcha.human_behavior import HumanBehavior
    
    behavior = HumanBehavior()
    
    # Pre-action delay
    behavior.wait_before_action()
    
    # Solve captcha (your logic here)
    solution = recognize_captcha(captcha_data['image'])
    
    # Type with human behavior
    behavior.type_text(solution)
    
    # Post-action delay
    behavior.wait_before_action(len(solution))
    
    # Record metrics
    behavior.record_captcha_solved()
    
    return {
        'solution': solution,
        'time_taken': behavior.metrics.last_action_time,
        'metrics': behavior.get_metrics()
    }
```

---

## Performance Considerations

### Memory Usage
- ~500KB per HumanBehavior instance
- Negligible for batch processing

### CPU Usage
- Bezier curve generation: ~2ms per movement
- Typing simulation: ~0.1ms per character
- Overall impact: < 1% CPU

### Timing Overhead
```
Mouse movement (500px):    100-200ms (simulated)
Typing (10 chars):         500-2000ms (realistic delays)
Response delay:            2.5-8s (cognitive delay)
Click:                     50-150ms (simulated)
```

---

## Best Practices

### 1. Pre-allocate Behavior
```python
# GOOD: Create once, reuse
behavior = HumanBehavior()
for captcha in captchas:
    solve_captcha(behavior)

# BAD: Create per captcha
for captcha in captchas:
    behavior = HumanBehavior()  # Unnecessary overhead
    solve_captcha(behavior)
```

### 2. Respect Break Intervals
```python
# GOOD: Honor break requirements
if behavior.should_take_micro_break():
    behavior.take_micro_break()

# BAD: Skip breaks
# (Will look suspicious if running 2.5+ hours)
```

### 3. Use Appropriate Presets
```python
# GOOD: Match site difficulty
if is_high_security_site:
    behavior = create_cautious_behavior()
else:
    behavior = create_default_behavior()

# BAD: Same behavior for all
behavior = HumanBehavior()  # Always default
```

### 4. Monitor Metrics
```python
# GOOD: Track behavior patterns
metrics = behavior.get_metrics()
if metrics['typos_made'] > 10:
    logger.warning("High typo rate, may indicate detection")

# BAD: Ignore metrics
# (Can't diagnose detection patterns)
```

---

## Troubleshooting

### Issue: Detection/Blocking
**Solution:** Use cautious behavior
```python
behavior = create_cautious_behavior()
```

### Issue: Too Slow
**Solution:** Use confident behavior
```python
behavior = create_confident_behavior()
```

### Issue: Overshoot/Miss Rate Too High
**Solution:** Adjust configuration
```python
config = BehaviorConfig(
    mouse_overshoot_probability=0.05,  # Lower from 0.10
    click_miss_probability=0.10         # Lower from 0.20
)
behavior = HumanBehavior(config)
```

### Issue: Breaks Interrupting Workflow
**Solution:** Use custom intervals
```python
config = BehaviorConfig(
    micro_break_interval=(50, 100),  # Longer interval
    micro_break_duration=(10, 20)    # Shorter breaks
)
behavior = HumanBehavior(config)
```

---

## Testing

Run the test suite:
```bash
cd /Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha
python3 test_human_behavior.py
```

---

## Examples in Codebase

### worker-captcha/
- `/HUMAN_BEHAVIOR_GUIDE.md` - Detailed feature documentation
- `/test_human_behavior.py` - Comprehensive test suite
- `/INTEGRATION_EXAMPLES.py` - Real-world integration examples

### Docker Integration
- `solver-1.1-captcha-worker` uses HumanBehavior
- See `app/tools/captcha_solver.py` for usage

---

## Version History

- **v1.0.0** (2026-01-30)
  - Initial release
  - Bezier curve mouse movement
  - Gaussian distribution typing
  - Formula-based response delays
  - Micro and major break simulation
  - Comprehensive metrics

---

## Support & Maintenance

**File Path:** `/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/human_behavior.py`

**Size:** 22KB | **Lines:** 680+

**Status:** ✅ Production-Ready

For issues or enhancements, see `HUMAN_BEHAVIOR_GUIDE.md` or `test_human_behavior.py`
