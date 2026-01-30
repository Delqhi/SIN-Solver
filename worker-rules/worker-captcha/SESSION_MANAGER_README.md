# Session Manager: IP & Session Management with Anti-Ban Protection

Complete Python module for managing worker sessions with IP tracking, cookie persistence, and automatic reconnection logic.

## Features

### ✅ IP Tracking & Health Monitoring
- Real-time IP detection (multiple fallback sources)
- Geographic IP lookup with caching
- IP change history tracking
- Distance-based cooldown calculation (15 min per 100km)

### ✅ Session Persistence
- Cookie saving/loading (pickle-based)
- Browser fingerprint consistency
- Session duration tracking
- State restoration across restarts

### ✅ Health Metrics
- Solve time monitoring (alert >150% baseline)
- Rejection rate tracking (alert >10%)
- Automatic degradation detection
- Success rate calculation

### ✅ Automatic Reconnection
- Clean logout before reconnect
- Router reconnect trigger (FritzBox + custom commands)
- Automatic IP change detection with timeout
- Geographic cooldown enforcement
- Session isolation on reconnect

### ✅ Multi-Account Support
- Isolated sessions per account
- Separate IP history per account
- Independent cookie storage
- Docker-ready isolation

## Installation

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

**Dependencies:**
- `aiohttp>=3.9.0` - Async HTTP client
- `geopy>=2.3.0` - Geographic distance calculation
- `requests>=2.31.0` - HTTP requests
- `fritzconnection>=1.13.0` - FritzBox router API (optional)

### 2. For FritzBox Router Support (Optional)

```bash
pip install fritzconnection
```

## Usage

### Basic Usage

```python
from session_manager import SessionManager
import asyncio

async def main():
    # Initialize
    session = SessionManager(account_id="worker_001")
    session.start_session()
    
    try:
        # Check IP health
        is_healthy = await session.check_ip_health(detailed=True)
        
        if is_healthy:
            print("✓ IP is healthy")
            # Do work here
            session.record_solve_attempt(success=True, solve_time=28.5)
        else:
            print("✗ IP degraded, reconnecting...")
            await session.reconnect_and_cooldown()
    
    finally:
        session.end_session()

asyncio.run(main())
```

### With FritzBox Router

```python
session = SessionManager(
    account_id="worker_001",
    router_config={
        'type': 'fritzbox',
        'host': '192.168.1.1',
        'username': 'admin',
        'password': 'your_password',
    }
)

session.start_session()
# ... work ...
await session.reconnect_and_cooldown()
```

### With Custom Reconnect Command

```python
session = SessionManager(
    account_id="worker_001",
    router_config={
        'type': 'custom_command',
        'command': 'systemctl restart networking',
    }
)
```

### Multi-Account Setup (Docker)

```bash
# Run separate container for each account
docker run \
    -e ACCOUNT_ID=worker_001 \
    -e FRITZBOX_HOST=192.168.1.1 \
    -e FRITZBOX_USER=admin \
    -e FRITZBOX_PASS=password \
    -v /app/sessions:/home/worker/.sin-solver/sessions \
    sin-solver:latest
```

## API Reference

### SessionManager

Main class for session management.

#### Constructor

```python
SessionManager(
    account_id: str,                    # Unique account identifier
    storage_dir: Path = None,           # Cookie/session storage directory
    router_config: Dict = None,         # Router configuration
)
```

#### Methods

##### Cookie Management

```python
session.save_cookies(cookies=None)      # Save cookies to disk
session.load_cookies() -> Dict          # Load cookies from disk
session.clear_cookies()                 # Clear all cookies
```

##### Health Monitoring

```python
await session.check_ip_health(detailed=False) -> bool
# Returns True if healthy, False if degraded
# detailed=True prints detailed metrics

session.record_solve_attempt(success: bool, solve_time: float)
# Record solve attempt for health metrics
```

##### IP Management

```python
await session.detect_current_ip() -> str
# Detect current IP using fallback sources

ip_manager = session.ip_manager
ip_manager.can_rotate_ip() -> bool      # Check if rotation cooldown passed
ip_manager.mark_rotation_time()         # Mark when rotation occurred
```

##### Reconnection

```python
await session.reconnect_and_cooldown() -> bool
# Full reconnection sequence:
# 1. Clear cookies
# 2. Trigger router reconnect
# 3. Wait for new IP
# 4. Apply geographic cooldown
```

##### Session Lifecycle

```python
session.start_session()                 # Initialize session
session.end_session()                   # Save state and cleanup
session.save_state()                    # Save state to disk
session.load_state() -> bool            # Load state from disk
session.get_status() -> Dict            # Get current status
```

### Health Metrics

Tracks solve performance and health.

```python
session.health.total_solves: int        # Total solve attempts
session.health.rejected_solves: int     # Rejected solves
session.health.rejection_rate: float    # Rejection rate %
session.health.current_solve_time: float  # Latest solve time
session.health.baseline_solve_time: float # Baseline (30s)
session.health.is_degraded: bool        # Degradation flag
```

### IPRecord

Represents a single IP address with geographic data.

```python
@dataclass
class IPRecord:
    ip: str                             # IP address
    timestamp: datetime                 # When detected
    latitude: Optional[float]           # Geo latitude
    longitude: Optional[float]          # Geo longitude
    country: Optional[str]              # Country name
    city: Optional[str]                 # City name
    isp: Optional[str]                  # ISP name
```

## File Structure

```
~/.sin-solver/sessions/{account_id}/
├── cookies.pkl                        # Pickled cookies
├── session.json                       # Session state
└── ip_history.json                    # IP history log
```

## Configuration

### FritzBox Router

```python
router_config = {
    'type': 'fritzbox',
    'host': '192.168.1.1',              # Router IP
    'username': 'admin',                # Router username
    'password': 'your_password',        # Router password
}
```

### Custom Command

```python
router_config = {
    'type': 'custom_command',
    'command': 'systemctl restart networking',
}
```

## IP Detection Sources (Fallback Chain)

1. **ipify.org** - Fast, reliable, FREE
2. **myip.com** - HTML parsing as backup
3. **ip-api.com** - Free tier with detailed geo data

## Geographic Cooldown

Cooldown is calculated based on geographic distance between old and new IP:

- **15 minutes per 100km** distance
- **Minimum 15 minutes** between rotations
- Example: 250km distance = 37.5min cooldown

## Logging

All operations are logged to console:

```
2026-01-30 12:00:00 - session_manager - INFO - [worker_001] Initialized SessionManager
2026-01-30 12:00:01 - session_manager - INFO - [worker_001] Current IP: 203.0.113.42
2026-01-30 12:00:02 - session_manager - INFO - [worker_001] Added IP record: 203.0.113.42 (Berlin, Germany)
```

Enable debug logging:

```python
import logging
logging.getLogger('session_manager').setLevel(logging.DEBUG)
```

## Error Handling

Module handles common errors gracefully:

- IP detection failure → tries fallback sources
- GeoIP lookup failure → uses default/cached data
- Router connection failure → logs warning, continues
- Cookie load failure → starts fresh session

## Performance

- IP detection: ~1-3 seconds
- GeoIP lookup: ~0.5-1 second (cached)
- Health check: ~2-4 seconds
- Reconnection cycle: 15+ minutes (depending on distance)

## Best Practices

1. **Always use `start_session()` and `end_session()`**
   ```python
   session.start_session()
   try:
       # work
   finally:
       session.end_session()
   ```

2. **Check health periodically**
   ```python
   if not await session.check_ip_health():
       await session.reconnect_and_cooldown()
   ```

3. **Record all attempts**
   ```python
   session.record_solve_attempt(success=True, solve_time=28.5)
   ```

4. **Respect cooldown times**
   - Never reconnect faster than cooldown allows
   - System enforces this via `can_rotate_ip()`

5. **Isolate accounts**
   - Use unique `account_id` per worker
   - Each account gets separate session/cookies

## Troubleshooting

### IP Detection Fails

```
ERROR: Failed to detect IP address
```

**Solution:** Check internet connection, try different IP detection service

### GeoIP Lookup Fails

```
WARNING: Missing coordinates for cooldown calculation
```

**Solution:** Uses minimum 15-min cooldown, proceed normally

### Router Reconnect Fails

```
WARNING: Router reconnect failed, waiting anyway
```

**Solution:** 
- Verify router IP/credentials
- Ensure router API is enabled
- Try custom command instead

### Cookies Not Loading

```
INFO: No existing cookies found
```

**Solution:** Normal on first run, will create new cookies on save

## Docker Integration

See `example_usage.py` for Docker container setup with environment variables.

### Multi-Container Orchestration

```yaml
# docker-compose.yml
services:
  worker-001:
    image: sin-solver:latest
    environment:
      ACCOUNT_ID: worker_001
      FRITZBOX_HOST: 192.168.1.1
      FRITZBOX_USER: admin
      FRITZBOX_PASS: ${FRITZBOX_PASSWORD}
    volumes:
      - sessions:/home/worker/.sin-solver/sessions

  worker-002:
    image: sin-solver:latest
    environment:
      ACCOUNT_ID: worker_002
      # ... same config
    volumes:
      - sessions:/home/worker/.sin-solver/sessions
```

## License

Part of SIN-Solver project.

## See Also

- `example_usage.py` - 7 complete usage examples
- `monitor.py` - Real-time monitoring dashboard
- `human_behavior.py` - Human-like browsing behavior
