# 2Captcha.com Worker Rules & Anti-Ban Protocol

> **⚠️ CRITICAL: Account Survival = 95%+ Success Rate**
> 
> 2Captcha monitors worker performance. Below 95% success rate = Account deletion. No second chances.

**Last Updated:** 2026-01-30  
**Status:** PRODUCTION READY  
**Priority:** 🔴 CRITICAL

---

## 🎯 CORE PRINCIPLE: HUMAN SIMULATION

We are NOT a bot. We are a HUMAN worker using AI assistance.
Every action must appear naturally human.

---

## 📋 ABSOLUTE RULES (VIOLATION = BAN)

### Rule 1: 95% Success Rate Minimum
```
SUCCESS_RATE = (Correct_Solves / Total_Attempts) × 100

IF Success_Rate < 95%:
    → ACCOUNT_FLAGGED_FOR_REVIEW
    → LIKELY_DELETION
    → NO_SECOND_CHANCE
```

**Implementation:**
- Track every solve attempt
- Calculate rolling 100-captcha success rate
- Alert when dropping below 96% (buffer zone)
- STOP solving if below 95%

### Rule 2: 3-Agent Consensus System
```
Agent 1 (Vision) ──┐
Agent 2 (OCR) ─────┼──→ Consensus Engine ──→ 95% Match? ──→ Submit
Agent 3 (Pattern) ─┘                           │
                                                └─ NO ──→ "Cannot Solve"
```

**Requirements:**
- Minimum 2 agents must agree 100% on solution
- OR all 3 agents with 95%+ similarity
- Skyvern only submits when consensus reached
- Default action: "Cannot Solve" button

### Rule 3: Cannot Solve is DEFAULT
```
IF Confidence < 95%:
    → CLICK "Cannot Solve (Alt + Q)"
    → SKIP captcha
    → NO penalty for skipping
    
IF Confidence >= 95%:
    → CLICK "Send (Enter)"
    → Submit solution
```

### Rule 4: NO Parallel Workers
```
MAX_WORKERS_PER_PROVIDER = 1

IF Worker_A_Active_ON_2CAPTCHA:
    → Worker_B_MUST_WAIT
    → OR use different IP + Account
    → OR use different provider (Kolotibablo)
```

### Rule 5: Session Continuity
```
Cookies: MUST persist between sessions
Login: Reuse existing session when possible
IP: Should remain consistent per account
Location: Same city/region per account
```

---

## 🤖 ANTI-BOT PROTECTION SYSTEM

### 1. Human Behavior Simulation

#### Mouse Movements
```python
# NOT this (robotic):
move_to(x, y)  # Direct line

# DO this (human):
move_to(x, y, method="bezier")  # Curved path
move_to(x, y, noise=0.15)       # 15% random deviation
move_to(x, y, overshoot=True)   # Overshoot then correct
```

**Mouse Patterns:**
- Curved trajectories (Bezier curves)
- Variable speed (fast → slow near target)
- Occasional overshoot and correction
- Random micro-movements (hand tremor simulation)
- Sometimes miss and click nearby (human error)

#### Click Patterns
```python
# Random offset from center
click_offset = random.gauss(0, 5)  # 5px standard deviation

# Sometimes miss slightly
if random.random() < 0.05:  # 5% miss rate
    click(x + 10, y - 5)    # Miss by 10px
    sleep(0.3)
    click(x, y)             # Correct
```

#### Typing Simulation
```python
# Variable typing speed
for char in solution:
    sleep(random.gauss(0.12, 0.04))  # 120ms ± 40ms
    type(char)
    
# Occasional typos
if random.random() < 0.03:  # 3% typo rate
    type(wrong_char)
    sleep(0.2)
    press('backspace')
    sleep(0.1)
    type(correct_char)
```

#### Response Delays
```python
# NOT instant (bot-like)
# DO variable delays
base_delay = random.gauss(2.5, 0.8)  # 2.5s ± 0.8s
complexity_factor = len(captcha_text) * 0.3  # 300ms per char
final_delay = base_delay + complexity_factor + random.uniform(0, 1)
sleep(final_delay)
```

### 2. Session Management & IP Protection

#### IP Reputation Monitoring
```python
class IPManager:
    def check_ip_health(self):
        metrics = {
            'solve_time_avg': self.get_avg_solve_time(),
            'success_rate': self.get_success_rate(),
            'rejection_rate': self.get_rejection_rate()
        }
        
        # Trigger reconnect if:
        if metrics['solve_time_avg'] > baseline * 1.5:
            self.trigger_reconnect()
        if metrics['rejection_rate'] > 0.10:  # 10% rejection
            self.trigger_reconnect()
```

#### Geographic Consistency
```python
class GeoTracker:
    def __init__(self):
        self.last_ip = None
        self.last_location = None
        
    def check_location_jump(self, new_ip):
        new_location = self.get_geo_ip(new_ip)
        distance = self.calculate_distance(self.last_location, new_location)
        
        # Cooldown based on distance
        if distance > 100:  # km
            cooldown_minutes = distance / 100 * 15  # 15 min per 100km
            self.enforce_cooldown(cooldown_minutes)
```

#### Automatic Reconnect Logic
```python
def trigger_reconnect():
    """Reset IP when detection quality drops"""
    # 1. Logout cleanly
    logout_worker()
    
    # 2. Trigger router reconnect
    # FritzBox example:
    requests.post('http://fritz.box:49000/upnp/control/WANIPConn1',
                  headers={'SOAPAction': 'urn:schemas-upnp-org:service:WANIPConnection:1#ForceTermination'})
    
    # 3. Wait for new IP
    while get_current_ip() == old_ip:
        sleep(5)
    
    # 4. Cooldown period
    sleep(900)  # 15 minutes
    
    # 5. Resume with new session
    login_worker()
```

### 3. Work Schedule & Breaks

#### Maximum Work Duration
```python
MAX_CONTINUOUS_WORK_MINUTES = 150  # 2.5 hours
BREAK_DURATION_MINUTES = random.randint(5, 15)

if work_duration > MAX_CONTINUOUS_WORK_MINUTES:
    take_break(BREAK_DURATION_MINUTES)
    reset_session()
```

#### Progressive Difficulty Detection
```python
def detect_difficulty_increase():
    """Detect when captchas get harder (bot suspicion)"""
    recent_solves = get_last_n_solves(20)
    
    # Signs of increased difficulty:
    signs = {
        'avg_solve_time_increased': recent_avg > baseline_avg * 1.3,
        'more_complex_captchas': complex_count > 0.6 * len(recent_solves),
        'rejection_rate_up': rejections > 0.08 * len(recent_solves)
    }
    
    if sum(signs.values()) >= 2:
        return True  # Take break
```

#### Random Micro-Breaks
```python
# Every 20-40 captchas, take a 30-90 second break
if captchas_solved % random.randint(20, 40) == 0:
    sleep(random.randint(30, 90))
    # Scroll page, move mouse randomly
    simulate_idle_behavior()
```

---

## 🎮 2CAPTCHA.COM SPECIFIC WORKFLOW

### Entry Point
```
https://2captcha.com/play-and-earn/play
```

**NOT:**
- ❌ /work/start (404)
- ❌ /make-money-online (landing page)

**YES:**
- ✅ /play-and-earn/play (actual solving interface)

### Page Elements

#### Training Mode (First Time)
```
URL: /play-and-earn/training
- Progress: "Training progress X/Y"
- Instructions: "Here are 6 digits..."
- Input field: "Enter captcha answer here..."
- Buttons: "Cannot solve (Alt + Q)", "Send (Enter)"
- Timer: "Time left to solve the captcha: XX sec"
```

**Action:** Complete training (14 captchas) then proceed to real work.

#### Real Work Mode
```
URL: /play-and-earn/play
- Stats: "Earned: $X.XXXX", "Solved: N"
- Rate: "Rate: $0.10 per 1000 captchas"
- Captcha image (center)
- Input field
- Timer bar
- Buttons: "Cannot solve", "Send"
```

### Solving Loop

```python
while True:
    # 1. Wait for captcha
    captcha = wait_for_captcha(timeout=30)
    
    # 2. Screenshot
    screenshot = take_screenshot()
    
    # 3. 3-Agent Analysis
    agent_1_result = vision_agent.analyze(screenshot)
    agent_2_result = ocr_agent.analyze(screenshot)
    agent_3_result = pattern_agent.analyze(screenshot)
    
    # 4. Consensus Check
    consensus = calculate_consensus([
        agent_1_result,
        agent_2_result,
        agent_3_result
    ])
    
    # 5. Decision
    if consensus.confidence >= 0.95:
        # Human-like typing
        type_with_delays(consensus.solution)
        sleep(random.gauss(1.5, 0.5))
        click_send_button()
    else:
        click_cannot_solve_button()
    
    # 6. Check break conditions
    if should_take_break():
        take_break()
    
    # 7. Check IP health
    if ip_health_degraded():
        reconnect_and_cooldown()
```

---

## 🔐 SECURITY MEASURES

### Cookie Persistence
```python
# Save cookies after each session
import pickle

def save_session_cookies(driver, account_id):
    cookies = driver.get_cookies()
    with open(f'/data/cookies/{account_id}.pkl', 'wb') as f:
        pickle.dump(cookies, f)

def load_session_cookies(driver, account_id):
    try:
        with open(f'/data/cookies/{account_id}.pkl', 'rb') as f:
            cookies = pickle.load(f)
        for cookie in cookies:
            driver.add_cookie(cookie)
        return True
    except FileNotFoundError:
        return False
```

### Browser Fingerprint Consistency
```python
# Same fingerprint per account
FINGERPRINT = {
    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
    'screen_resolution': (1920, 1080),
    'color_depth': 24,
    'timezone': 'Europe/Berlin',
    'language': 'de-DE',
    'platform': 'Win32',
    'canvas_noise': 0.5,  # Consistent noise
    'webgl_vendor': 'Google Inc.',
    'webgl_renderer': 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660...'
}
```

### Multi-Account Isolation
```python
# Each account in separate Docker container
# Each container gets dedicated IP
# No shared cookies/sessions between accounts

class WorkerInstance:
    def __init__(self, account_id, ip_address):
        self.container = create_isolated_container()
        self.ip = assign_dedicated_ip(ip_address)
        self.account = load_account_credentials(account_id)
        self.fingerprint = load_fingerprint(account_id)
```

---

## 📊 MONITORING & ALERTS

### Success Rate Tracking
```python
class SuccessTracker:
    def __init__(self, window_size=100):
        self.attempts = deque(maxlen=window_size)
        
    def record_attempt(self, success: bool):
        self.attempts.append(success)
        
    def get_success_rate(self) -> float:
        if not self.attempts:
            return 1.0
        return sum(self.attempts) / len(self.attempts)
    
    def check_health(self):
        rate = self.get_success_rate()
        if rate < 0.95:
            alert_critical(f"Success rate dropped to {rate:.1%}")
            return False
        elif rate < 0.96:
            alert_warning(f"Success rate at {rate:.1%}, approaching limit")
        return True
```

### Real-Time Dashboard
```
┌─────────────────────────────────────────┐
│ 2Captcha Worker Monitor                 │
├─────────────────────────────────────────┤
│ Success Rate: 97.3% ✅                  │
│ Session Time: 1h 23m                    │
│ Captchas Solved: 147                    │
│ Earned: $0.0147                         │
│ Avg Solve Time: 4.2s                    │
│ Current IP: 185.XXX.XXX.XXX             │
│ Next Break: 27 minutes                  │
│                                         │
│ [STOP] [PAUSE] [RECONNECT]              │
└─────────────────────────────────────────┘
```

---

## 🚨 EMERGENCY PROCEDURES

### If Account Flagged
```python
def emergency_stop():
    """Immediate stop all activity"""
    stop_solving()
    save_session_state()
    notify_admin("ACCOUNT FLAGGED - STOPPED")
    # Do NOT login again for 24 hours
```

### If IP Banned
```python
def handle_ip_ban():
    """Switch to backup IP"""
    logout_cleanly()
    switch_to_backup_ip()
    cooldown(3600)  # 1 hour
    attempt_relogin()
```

### If Success Rate Drops
```python
def handle_low_success_rate():
    """Pause and analyze"""
    pause_solving()
    
    # Analyze last 50 attempts
    failures = analyze_recent_failures(50)
    
    if failures['pattern'] == 'captcha_type_changed':
        retrain_agents()
    elif failures['pattern'] == 'ip_reputation':
        reconnect_ip()
    elif failures['pattern'] == 'account_flagged':
        emergency_stop()
```

---

## 📝 CHECKLIST: Before Starting Worker

- [ ] 2captcha.com worker account created
- [ ] Account verified (email confirmed)
- [ ] Payment method configured
- [ ] Dedicated IP assigned
- [ ] Browser fingerprint configured
- [ ] Cookie persistence enabled
- [ ] 3-agent consensus system tested
- [ ] Success rate monitoring active
- [ ] Emergency stop procedure tested
- [ ] Break schedule configured
- [ ] Backup IP available
- [ ] Real-time dashboard accessible

---

## 🔗 RELATED DOCUMENTATION

- [Worker Architecture](../worker-architecture.md)
- [Anti-Ban Strategies](../anti-ban-strategies.md)
- [IP Management](../ip-management.md)
- [Kolotibablo Rules](./worker-kolotibablo.md)
- [Multi-Account Setup](../multi-account-setup.md)

---

**⚠️ REMEMBER: We are HUMANS using AI tools, not bots.**

Every action must pass the "human test": Would a real person do it this way?

If in doubt: **SLOW DOWN, TAKE BREAK, CLICK "CANNOT SOLVE"**

Better safe than banned.
