# 🚀 Quick Start Guide - Worker Monitor Setup (5 Minutes)

**Success Rate Tracker & Real-Time Monitoring Dashboard**

## What You Get

✅ Real-time success rate tracking (rolling 100 attempts)  
✅ Beautiful web dashboard at http://localhost:8080  
✅ Automatic alerts (warnings at 95-96%, critical stop at <95%)  
✅ Persistent statistics (all-time earnings, sessions, etc.)  
✅ Control buttons (pause, reconnect, emergency stop)  
✅ Per-captcha-type success tracking  

## Installation (2 min)

```bash
# 1. Install Flask dependency
pip install flask

# 2. Verify monitor file exists
ls /Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/monitor.py

# ✅ Done!
```

## Basic Usage (3 min)

### Step 1: Create your solving script

```python
# my_solver.py
from worker_captcha.monitor import WorkerMonitor
import time

# Initialize monitor
monitor = WorkerMonitor(worker_name="my-solver-01")

# Start web dashboard (http://localhost:8080)
monitor.start_dashboard(port=8080)

# Start background stats saver
monitor.start_stats_saver()

# Your solving loop
for i in range(100):
    # Solve a captcha
    success = True  # Your solver result
    solve_time = 4.2  # Your solver time
    
    # Record attempt
    monitor.record_attempt(
        success=success,
        solve_time=solve_time,
        captcha_type="text"  # "text", "slider", "click", etc.
    )
    
    # Check health (emergency stop if < 95%)
    if not monitor.check_health():
        print("EMERGENCY STOP TRIGGERED")
        break
    
    time.sleep(1)

# Cleanup
monitor.stop()
```

### Step 2: Run your solver

```bash
python my_solver.py
```

### Step 3: Open dashboard in browser

```
http://localhost:8080
```

You'll see:
- **Success Rate** (green=✅, yellow=⚠️, red=🚨)
- **Captchas Solved** (this session + all-time)
- **Earnings** ($0.10 per 1000 solves)
- **Duration** (session time)
- **Average Solve Time**
- **Current IP Address**
- **Control Buttons** (Pause, Reconnect, Emergency Stop)

## Dashboard Features

### Real-Time Metrics

| Metric | What It Means |
|--------|---------------|
| **Success Rate** | % of successful solves in last 100 attempts |
| **Session Duration** | Time since worker started |
| **Captchas Solved** | Number solved this session / all-time |
| **Session Earnings** | Money earned this session (at $0.10 per 1000) |
| **Avg Solve Time** | Average seconds per captcha |
| **Current IP** | Your current IP address |
| **Per-Type Stats** | Success rate for each captcha type |

### Alert System

```
✅ GREEN (≥96%)      → All good, keep working
⚠️  YELLOW (95-96%)  → Warning, watch closely
🚨 RED (<95%)        → CRITICAL ALERT - EMERGENCY STOP
```

### Control Buttons

- **PAUSE** - Temporarily stop recording attempts (worker continues)
- **RECONNECT** - Reconnect to proxy/IP service (custom callback)
- **EMERGENCY STOP** - Immediately halt worker (emergency)

## Common Integration Patterns

### Pattern 1: Simple Loop

```python
from monitor import WorkerMonitor

monitor = WorkerMonitor()
monitor.start_dashboard()
monitor.start_stats_saver()

while True:
    result = solve_captcha()
    
    monitor.record_attempt(
        success=result["success"],
        solve_time=result["time"],
        captcha_type=result["type"]
    )
    
    if not monitor.check_health():
        break

monitor.stop()
```

### Pattern 2: Health Check Callback

```python
def on_health_alert(is_healthy):
    if not is_healthy:
        print("❌ EMERGENCY STOP")
        # Cleanup, save state, etc.

monitor.health_check_callbacks.append(on_health_alert)
```

### Pattern 3: Per-Type Tracking

```python
# Track success rate by type
monitor.record_attempt(
    success=True,
    solve_time=4.2,
    captcha_type="text"  # ← Tracks separately
)

# Later: Get stats by type
text_rate = monitor.get_success_rate("text")  # e.g., 96.5%
```

## Monitoring Data

### Live Statistics

All stats auto-save every 30 seconds to:

```
~/.monitor_stats/
├── all_time_stats.json      # Total captchas, earnings, sessions
└── captcha-worker.log       # Debug logs
```

### Example Stats File

```json
{
  "total_captchas": 12345,
  "total_earnings": 1.23,
  "total_sessions": 42,
  "first_run_date": "2025-01-29T10:00:00",
  "last_run_date": "2025-01-29T15:30:00"
}
```

### Query Stats Anytime

```python
# Get current success rate
rate = monitor.get_success_rate()  # 96.5

# Get average solve time
avg_time = monitor.get_average_solve_time()  # 4.2 seconds

# Get all dashboard data
data = monitor.get_dashboard_data()  # Dict with everything

# Get per-type stats
types = monitor.get_captcha_types()  # Dict by type
```

## Configuration

### Change Alert Thresholds

Edit `/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/monitor.py`:

```python
SUCCESS_RATE_WARNING_THRESHOLD = 96.0    # Yellow alert at this %
SUCCESS_RATE_CRITICAL_THRESHOLD = 95.0   # Red alert + emergency stop
```

### Change Dashboard Port

```python
monitor.start_dashboard(port=9000)  # Instead of default 8080
```

### Custom Stats Directory

```python
monitor = WorkerMonitor(
    stats_dir="/custom/path",  # Instead of ~/.monitor_stats
    worker_name="my-worker"
)
```

### Webhook Notifications

Set environment variable for critical alerts:

```bash
export MONITOR_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"
```

## Troubleshooting

### Dashboard Won't Load

1. **Is Flask installed?**
   ```bash
   pip install flask
   ```

2. **Is port 8080 available?**
   ```bash
   lsof -i :8080  # If in use, pick different port
   monitor.start_dashboard(port=8081)
   ```

3. **Check console for errors:**
   ```
   python my_solver.py  # Look for error messages
   ```

### Stats Not Saving

1. **Is stats saver running?**
   ```python
   monitor.start_stats_saver()  # Must call this
   ```

2. **Check permissions:**
   ```bash
   ls ~/.monitor_stats/  # Should exist
   chmod 755 ~/.monitor_stats/
   ```

### Success Rate Not Updating

1. **Are you calling `record_attempt()`?**
   ```python
   monitor.record_attempt(success=True, solve_time=4.2)
   ```

2. **Do you have 10+ attempts recorded?**
   Rolling window needs data to calculate

## Advanced Features

### Multi-Worker Setup

```python
# Start multiple monitors on different ports
monitor1 = WorkerMonitor("worker-1")
monitor1.start_dashboard(port=8001)

monitor2 = WorkerMonitor("worker-2")
monitor2.start_dashboard(port=8002)

# Each has own dashboard
# http://localhost:8001  ← Worker 1
# http://localhost:8002  ← Worker 2
```

### Database Integration

```python
# Save stats to PostgreSQL periodically
import json
from datetime import datetime

def periodic_db_save():
    data = monitor.get_dashboard_data()
    # INSERT into PostgreSQL...

# Or use webhook integration
os.environ["MONITOR_WEBHOOK_URL"] = "https://your-api.com/stats"
```

### Custom Metrics

```python
# Get raw attempt records
attempts = list(monitor.attempts)
for attempt in attempts:
    print(f"{attempt.captcha_type}: {attempt.success} ({attempt.solve_time}s)")

# Calculate custom statistics
successful = sum(1 for a in attempts if a.success)
total_time = sum(a.solve_time for a in attempts)
```

## API Reference

### Methods

```python
# Record an attempt
monitor.record_attempt(success: bool, solve_time: float, captcha_type: str)

# Get success rate (0-100%)
rate = monitor.get_success_rate(captcha_type: str = None)

# Get average solve time
avg = monitor.get_average_solve_time(captcha_type: str = None)

# Check health
is_healthy = monitor.check_health()  # False if critical alert

# Get session duration
duration = monitor.get_session_duration()  # "HH:MM:SS"

# Get earnings
earnings = monitor.get_session_earnings()  # Dollar amount

# Get current IP
ip = monitor.get_current_ip()

# Get all stats for dashboard
data = monitor.get_dashboard_data()

# Start/stop services
monitor.start_dashboard(port: int = 8080)
monitor.start_stats_saver()
monitor.stop()

# Register health callbacks
monitor.health_check_callbacks.append(callback_function)
```

## Next Steps

1. ✅ Install Flask: `pip install flask`
2. ✅ Create solver script with monitor
3. ✅ Run: `python my_solver.py`
4. ✅ Visit: http://localhost:8080
5. ✅ Monitor success rate & earnings
6. ✅ Emergency stop if rate drops below 95%

## Examples

For detailed examples, see:

```
/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/INTEGRATION_EXAMPLES.py
```

Run examples:

```bash
cd /Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/
python INTEGRATION_EXAMPLES.py

# Choose example to run:
# 1. Basic Integration
# 2. Multi-Worker Monitoring
# 3. Slack Alerts
# 4. Database Integration
# 5. CLI Terminal Display
```

---

## Support

**Q: Can I use multiple monitors?**  
A: Yes, just create separate instances on different ports.

**Q: How is success rate calculated?**  
A: Last 100 attempts - takes rolling average.

**Q: Can I pause recording?**  
A: Yes, set `monitor.is_paused = True` or use dashboard button.

**Q: What if worker crashes?**  
A: Stats are saved every 30 seconds, so you'll only lose recent data.

**Q: Can I customize alerts?**  
A: Yes, register health check callbacks or use webhook integration.

---

**🎉 You're ready! Start monitoring your captcha worker now.**

Visit http://localhost:8080 and watch your success rate in real-time! 📊
