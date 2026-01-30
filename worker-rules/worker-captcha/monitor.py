"""
Worker Success Rate Tracker & Real-Time Monitoring Dashboard
============================================================

Comprehensive monitoring system for captcha solving worker with:
- Real-time success rate tracking (rolling 100 attempts)
- Web dashboard with live updates
- Statistics persistence
- Alert system with critical thresholds
- Emergency stop mechanism
"""

import json
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from collections import deque, defaultdict
from dataclasses import dataclass, asdict
import socket
import os
from typing import Optional, Dict, List
import logging

try:
    from flask import Flask, jsonify, render_template_string
except ImportError:
    Flask = None

# ============================================================================
# CONFIGURATION
# ============================================================================

SUCCESS_RATE_WARNING_THRESHOLD = 96.0  # Yellow alert
SUCCESS_RATE_CRITICAL_THRESHOLD = 95.0  # Red alert + emergency stop
ROLLING_WINDOW_SIZE = 100  # Track last 100 attempts
EARNINGS_PER_1000_CAPTCHAS = 0.10
DASHBOARD_PORT = 8080
DASHBOARD_REFRESH_INTERVAL = 5  # seconds
STATS_SAVE_INTERVAL = 30  # Save stats every 30 seconds

# ============================================================================
# DATA STRUCTURES
# ============================================================================


@dataclass
class AttemptRecord:
    """Single captcha solving attempt"""

    timestamp: float
    success: bool
    solve_time: float
    captcha_type: str

    def to_dict(self):
        return asdict(self)


@dataclass
class SessionStats:
    """Session-level statistics"""

    session_start: float
    captchas_solved: int = 0
    total_solve_time: float = 0.0
    current_ip: str = ""
    ip_changes: List[Dict] = None

    def __post_init__(self):
        if self.ip_changes is None:
            self.ip_changes = []


@dataclass
class AllTimeStats:
    """All-time statistics"""

    total_captchas: int = 0
    total_earnings: float = 0.0
    total_sessions: int = 0
    first_run_date: str = ""
    last_run_date: str = ""


# ============================================================================
# WORKER MONITOR - MAIN CLASS
# ============================================================================


class WorkerMonitor:
    """
    Real-time monitoring system for captcha solving worker

    Features:
    - Rolling window success rate (last 100 attempts)
    - Per-captcha-type success tracking
    - Web dashboard with live updates
    - Persistent statistics
    - Alert system with critical thresholds
    - Emergency stop mechanism
    """

    def __init__(self, stats_dir: str = None, worker_name: str = "captcha-worker"):
        """
        Initialize monitor

        Args:
            stats_dir: Directory to store statistics (default: ~/.monitor_stats)
            worker_name: Name of worker for logging/stats
        """
        self.worker_name = worker_name
        self.stats_dir = Path(stats_dir or os.path.expanduser("~/.monitor_stats"))
        self.stats_dir.mkdir(parents=True, exist_ok=True)

        # Setup logging
        self.logger = self._setup_logging()

        # Initialize data structures
        self.attempts = deque(maxlen=ROLLING_WINDOW_SIZE)  # Rolling window
        self.type_attempts = defaultdict(lambda: deque(maxlen=ROLLING_WINDOW_SIZE))
        self.session_stats = SessionStats(session_start=time.time())
        self.all_time_stats = self._load_all_time_stats()

        # State management
        self.is_healthy = True
        self.is_paused = False
        self.critical_alert_triggered = False
        self.health_check_callbacks = []

        # Web dashboard
        self.app = Flask(__name__) if Flask else None
        self.dashboard_thread = None
        self.dashboard_running = False

        # Statistics persistence
        self.stats_save_thread = None
        self.stats_save_running = False

        self.logger.info(f"Monitor initialized for {worker_name}")

    def _setup_logging(self) -> logging.Logger:
        """Setup logging with console and file handlers"""
        logger = logging.getLogger(self.worker_name)
        logger.setLevel(logging.DEBUG)

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        # File handler
        log_file = self.stats_dir / f"{self.worker_name}.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)

        # Formatter
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)

        logger.addHandler(console_handler)
        logger.addHandler(file_handler)

        return logger

    def _load_all_time_stats(self) -> AllTimeStats:
        """Load all-time statistics from file"""
        stats_file = self.stats_dir / "all_time_stats.json"

        if stats_file.exists():
            try:
                with open(stats_file, "r") as f:
                    data = json.load(f)
                    return AllTimeStats(**data)
            except Exception as e:
                self.logger.error(f"Failed to load all-time stats: {e}")

        return AllTimeStats(first_run_date=datetime.now().isoformat())

    def _save_all_time_stats(self):
        """Persist all-time statistics to file"""
        stats_file = self.stats_dir / "all_time_stats.json"

        try:
            self.all_time_stats.last_run_date = datetime.now().isoformat()
            with open(stats_file, "w") as f:
                json.dump(asdict(self.all_time_stats), f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save all-time stats: {e}")

    def record_attempt(
        self, success: bool, solve_time: float, captcha_type: str = "unknown"
    ) -> None:
        """
        Record a captcha solving attempt

        Args:
            success: Whether the attempt was successful
            solve_time: Time to solve in seconds
            captcha_type: Type of captcha (text, slider, click, etc.)
        """
        if self.is_paused:
            return

        # Create attempt record
        attempt = AttemptRecord(
            timestamp=time.time(), success=success, solve_time=solve_time, captcha_type=captcha_type
        )

        # Add to rolling window
        self.attempts.append(attempt)
        self.type_attempts[captcha_type].append(attempt)

        # Update session stats
        if success:
            self.session_stats.captchas_solved += 1
        self.session_stats.total_solve_time += solve_time

        # Update all-time stats
        if success:
            self.all_time_stats.total_captchas += 1
            earnings = (self.all_time_stats.total_captchas / 1000) * EARNINGS_PER_1000_CAPTCHAS
            self.all_time_stats.total_earnings = earnings

        # Check health
        self._check_health()

        self.logger.debug(
            f"Attempt recorded: type={captcha_type}, success={success}, "
            f"time={solve_time:.2f}s, rate={self.get_success_rate():.2f}%"
        )

    def _check_health(self) -> None:
        """Check success rate and trigger alerts if needed"""
        if len(self.attempts) < 10:  # Need minimum data
            return

        success_rate = self.get_success_rate()

        # Critical alert (< 95%)
        if success_rate < SUCCESS_RATE_CRITICAL_THRESHOLD:
            if not self.critical_alert_triggered:
                self._trigger_critical_alert(success_rate)
            self.is_healthy = False

        # Warning alert (95-96%)
        elif success_rate < SUCCESS_RATE_WARNING_THRESHOLD:
            self._trigger_warning_alert(success_rate)
            self.is_healthy = True

        # Healthy
        else:
            self.critical_alert_triggered = False
            self.is_healthy = True

        # Execute health check callbacks
        for callback in self.health_check_callbacks:
            try:
                callback(self.is_healthy)
            except Exception as e:
                self.logger.error(f"Health check callback error: {e}")

    def _trigger_warning_alert(self, success_rate: float) -> None:
        """Trigger warning alert (95-96%)"""
        msg = (
            f"⚠️  WARNING: Success rate dropped to {success_rate:.2f}% "
            f"(threshold: {SUCCESS_RATE_WARNING_THRESHOLD}%)"
        )
        self.logger.warning(msg)
        print(f"\n{msg}\n")

    def _trigger_critical_alert(self, success_rate: float) -> None:
        """Trigger critical alert (< 95%) with emergency stop"""
        self.critical_alert_triggered = True
        msg = (
            f"🚨 CRITICAL: Success rate {success_rate:.2f}% is below "
            f"{SUCCESS_RATE_CRITICAL_THRESHOLD}% - EMERGENCY STOP TRIGGERED"
        )
        self.logger.critical(msg)
        print(f"\n{msg}\n")

        # Try to send webhook notification if configured
        self._send_alert_webhook(msg, severity="CRITICAL")

    def _send_alert_webhook(self, message: str, severity: str = "WARNING") -> None:
        """Send alert via webhook/email (stub for integration)"""
        webhook_url = os.getenv("MONITOR_WEBHOOK_URL")
        if not webhook_url:
            return

        try:
            import requests

            payload = {
                "worker": self.worker_name,
                "severity": severity,
                "message": message,
                "timestamp": datetime.now().isoformat(),
                "success_rate": self.get_success_rate(),
                "captchas_solved": self.session_stats.captchas_solved,
            }
            requests.post(webhook_url, json=payload, timeout=5)
        except Exception as e:
            self.logger.debug(f"Webhook send failed: {e}")

    # ========================================================================
    # STATISTICS & QUERIES
    # ========================================================================

    def get_success_rate(self, captcha_type: str = None) -> float:
        """Get success rate (0-100)"""
        if captcha_type:
            attempts = self.type_attempts.get(captcha_type, deque())
        else:
            attempts = self.attempts

        if not attempts:
            return 0.0

        successful = sum(1 for a in attempts if a.success)
        return (successful / len(attempts)) * 100

    def get_average_solve_time(self, captcha_type: str = None) -> float:
        """Get average solve time in seconds"""
        if captcha_type:
            attempts = self.type_attempts.get(captcha_type, deque())
        else:
            attempts = self.attempts

        if not attempts:
            return 0.0

        total_time = sum(a.solve_time for a in attempts)
        return total_time / len(attempts)

    def get_session_duration(self) -> str:
        """Get formatted session duration"""
        duration_seconds = time.time() - self.session_stats.session_start
        hours = int(duration_seconds // 3600)
        minutes = int((duration_seconds % 3600) // 60)
        seconds = int(duration_seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    def get_session_earnings(self) -> float:
        """Get earnings this session"""
        solved = self.session_stats.captchas_solved
        return (solved / 1000) * EARNINGS_PER_1000_CAPTCHAS if solved > 0 else 0.0

    def get_current_ip(self) -> str:
        """Get current IP address"""
        if not self.session_stats.current_ip:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                self.session_stats.current_ip = s.getsockname()[0]
                s.close()
            except:
                self.session_stats.current_ip = "Unknown"
        return self.session_stats.current_ip

    def get_captcha_types(self) -> Dict[str, Dict]:
        """Get stats for all captcha types"""
        result = {}
        for ctype in self.type_attempts.keys():
            result[ctype] = {
                "count": len(self.type_attempts[ctype]),
                "success_rate": self.get_success_rate(ctype),
                "avg_solve_time": self.get_average_solve_time(ctype),
            }
        return result

    def check_health(self) -> bool:
        """Check if worker is healthy (for use in solving loop)"""
        return self.is_healthy and not self.critical_alert_triggered

    def get_dashboard_data(self) -> Dict:
        """Get all data for dashboard"""
        ip = self.get_current_ip()
        success_rate = self.get_success_rate()

        # Determine color
        if success_rate >= SUCCESS_RATE_WARNING_THRESHOLD:
            color = "green"
        elif success_rate >= SUCCESS_RATE_CRITICAL_THRESHOLD:
            color = "yellow"
        else:
            color = "red"

        return {
            "timestamp": datetime.now().isoformat(),
            "worker_name": self.worker_name,
            "success_rate": round(success_rate, 2),
            "success_rate_color": color,
            "is_healthy": self.is_healthy,
            "is_paused": self.is_paused,
            "critical_alert": self.critical_alert_triggered,
            "session_duration": self.get_session_duration(),
            "captchas_solved_session": self.session_stats.captchas_solved,
            "session_earnings": round(self.get_session_earnings(), 4),
            "avg_solve_time": round(self.get_average_solve_time(), 2),
            "current_ip": ip,
            "total_captchas_all_time": self.all_time_stats.total_captchas,
            "total_earnings_all_time": round(self.all_time_stats.total_earnings, 2),
            "captcha_types": self.get_captcha_types(),
            "attempts_in_window": len(self.attempts),
            "rolling_window_size": ROLLING_WINDOW_SIZE,
            "thresholds": {
                "warning": SUCCESS_RATE_WARNING_THRESHOLD,
                "critical": SUCCESS_RATE_CRITICAL_THRESHOLD,
            },
        }

    # ========================================================================
    # DASHBOARD
    # ========================================================================

    def _setup_flask_routes(self):
        """Setup Flask app routes"""
        if not self.app:
            self.logger.warning("Flask not installed - dashboard disabled")
            return

        @self.app.route("/api/stats")
        def api_stats():
            return jsonify(self.get_dashboard_data())

        @self.app.route("/api/pause", methods=["POST"])
        def api_pause():
            self.is_paused = True
            return jsonify({"status": "paused"})

        @self.app.route("/api/resume", methods=["POST"])
        def api_resume():
            self.is_paused = False
            return jsonify({"status": "resumed"})

        @self.app.route("/api/reconnect", methods=["POST"])
        def api_reconnect():
            # Callback for reconnect (to be implemented by user)
            for callback in self.health_check_callbacks:
                try:
                    callback("reconnect")
                except:
                    pass
            return jsonify({"status": "reconnecting"})

        @self.app.route("/api/emergency-stop", methods=["POST"])
        def api_emergency_stop():
            self.is_healthy = False
            self.critical_alert_triggered = True
            return jsonify({"status": "emergency_stop"})

        @self.app.route("/")
        def dashboard():
            return render_template_string(self._get_html_template())

    def _get_html_template(self) -> str:
        """Get HTML template for dashboard"""
        return """
<!DOCTYPE html>
<html>
<head>
    <title>Captcha Worker Monitor - Real-Time Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .header-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #666;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .card-title {
            font-size: 14px;
            color: #999;
            text-transform: uppercase;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .card-value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .success-rate-card .card-value {
            font-size: 48px;
        }
        
        .status-green { color: #10b981; }
        .status-yellow { color: #f59e0b; }
        .status-red { color: #ef4444; }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        
        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
        }
        
        .controls {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
        }
        
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-pause {
            background: #f59e0b;
            color: white;
        }
        
        .btn-pause:hover {
            background: #d97706;
        }
        
        .btn-reconnect {
            background: #3b82f6;
            color: white;
        }
        
        .btn-reconnect:hover {
            background: #2563eb;
        }
        
        .btn-stop {
            background: #ef4444;
            color: white;
        }
        
        .btn-stop:hover {
            background: #dc2626;
        }
        
        .types-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        
        .type-item {
            background: #f3f4f6;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
        }
        
        .type-item-name {
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .type-item-stat {
            font-size: 12px;
            color: #666;
        }
        
        .alert {
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .alert-warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            color: #92400e;
        }
        
        .alert-critical {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            color: #7f1d1d;
        }
        
        .timestamp {
            font-size: 12px;
            color: #999;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Captcha Worker Monitor</h1>
            <div class="header-info">
                <span id="worker-name">Worker: Loading...</span>
                <span id="last-update">Last update: Never</span>
            </div>
        </div>
        
        <div id="alerts-container"></div>
        
        <div class="controls">
            <button class="btn-pause" onclick="togglePause()">⏸ PAUSE</button>
            <button class="btn-reconnect" onclick="reconnect()">🔄 RECONNECT</button>
            <button class="btn-stop" onclick="emergencyStop()">🛑 EMERGENCY STOP</button>
        </div>
        
        <div class="grid">
            <div class="card success-rate-card">
                <div class="card-title">Success Rate</div>
                <div id="success-rate" class="card-value">--%</div>
                <div class="progress-bar">
                    <div id="success-rate-bar" class="progress-fill" style="background: #10b981;"></div>
                </div>
                <div style="font-size: 12px; color: #999; margin-top: 10px;">
                    Last 100 attempts | <span id="attempts-count">0</span> in window
                </div>
            </div>
            
            <div class="card">
                <div class="card-title">Session Duration</div>
                <div id="session-duration" class="card-value">00:00:00</div>
                <div class="timestamp" style="margin-top: 10px;" id="session-start"></div>
            </div>
            
            <div class="card">
                <div class="card-title">Captchas Solved (Session)</div>
                <div id="captchas-session" class="card-value">0</div>
                <div style="font-size: 12px; color: #999; margin-top: 10px;">
                    All-time: <span id="captchas-all-time">0</span>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title">Session Earnings</div>
                <div id="session-earnings" class="card-value">$0.00</div>
                <div style="font-size: 12px; color: #999; margin-top: 10px;">
                    All-time: $<span id="all-time-earnings">0.00</span>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title">Average Solve Time</div>
                <div id="avg-time" class="card-value">0.0s</div>
                <div style="font-size: 12px; color: #999; margin-top: 10px;">
                    Per captcha in rolling window
                </div>
            </div>
            
            <div class="card">
                <div class="card-title">Current IP Address</div>
                <div id="current-ip" class="card-value" style="font-size: 24px; word-break: break-all;">-</div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title">Success Rate by Type</div>
            <div id="types-container" class="types-grid"></div>
        </div>
        
        <div style="text-align: center; margin-top: 40px; color: white; font-size: 12px;">
            <p>Dashboard auto-refreshes every 5 seconds | Real-time monitoring enabled</p>
        </div>
    </div>
    
    <script>
        let isPaused = false;
        
        async function fetchStats() {
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();
                updateDashboard(data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        }
        
        function updateDashboard(data) {
            const now = new Date();
            document.getElementById('last-update').textContent = 
                `Last update: ${now.toLocaleTimeString()}`;
            
            // Success rate
            const successRate = data.success_rate;
            const colorClass = `status-${data.success_rate_color}`;
            document.getElementById('success-rate').textContent = `${successRate}%`;
            document.getElementById('success-rate').className = `card-value ${colorClass}`;
            document.getElementById('success-rate-bar').style.width = `${Math.min(100, successRate)}%`;
            document.getElementById('success-rate-bar').style.background = 
                successRate >= data.thresholds.warning ? '#10b981' :
                successRate >= data.thresholds.critical ? '#f59e0b' : '#ef4444';
            
            // Attempt count
            document.getElementById('attempts-count').textContent = `${data.attempts_in_window}/${data.rolling_window_size}`;
            
            // Session stats
            document.getElementById('session-duration').textContent = data.session_duration;
            document.getElementById('captchas-session').textContent = data.captchas_solved_session;
            document.getElementById('captchas-all-time').textContent = data.total_captchas_all_time;
            document.getElementById('session-earnings').textContent = `$${data.session_earnings.toFixed(4)}`;
            document.getElementById('all-time-earnings').textContent = data.total_earnings_all_time.toFixed(2);
            document.getElementById('avg-time').textContent = `${data.avg_solve_time.toFixed(2)}s`;
            document.getElementById('current-ip').textContent = data.current_ip;
            document.getElementById('worker-name').textContent = `Worker: ${data.worker_name}`;
            
            // Alerts
            updateAlerts(data);
            
            // Captcha types
            updateTypes(data.captcha_types);
        }
        
        function updateAlerts(data) {
            const container = document.getElementById('alerts-container');
            container.innerHTML = '';
            
            if (data.critical_alert) {
                container.innerHTML += `
                    <div class="alert alert-critical">
                        🚨 CRITICAL: Success rate below ${data.thresholds.critical}% - Emergency stop triggered!
                    </div>
                `;
            } else if (data.success_rate < data.thresholds.warning && data.success_rate >= data.thresholds.critical) {
                container.innerHTML += `
                    <div class="alert alert-warning">
                        ⚠️ WARNING: Success rate ${data.success_rate}% is below ${data.thresholds.warning}%
                    </div>
                `;
            }
        }
        
        function updateTypes(types) {
            const container = document.getElementById('types-container');
            container.innerHTML = '';
            
            for (const [name, stats] of Object.entries(types)) {
                container.innerHTML += `
                    <div class="type-item">
                        <div class="type-item-name">${name}</div>
                        <div class="type-item-stat">Success: ${stats.success_rate.toFixed(1)}%</div>
                        <div class="type-item-stat">Solved: ${stats.count}</div>
                        <div class="type-item-stat">Avg: ${stats.avg_solve_time.toFixed(1)}s</div>
                    </div>
                `;
            }
        }
        
        async function togglePause() {
            isPaused = !isPaused;
            const url = isPaused ? '/api/pause' : '/api/resume';
            try {
                await fetch(url, { method: 'POST' });
                alert(`Worker ${isPaused ? 'paused' : 'resumed'}`);
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
        
        async function reconnect() {
            if (!confirm('Reconnect to proxy/IP service?')) return;
            try {
                await fetch('/api/reconnect', { method: 'POST' });
                alert('Reconnection initiated');
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
        
        async function emergencyStop() {
            if (!confirm('EMERGENCY STOP - Are you absolutely sure?')) return;
            try {
                await fetch('/api/emergency-stop', { method: 'POST' });
                alert('EMERGENCY STOP TRIGGERED');
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
        
        // Initial fetch and auto-refresh
        fetchStats();
        setInterval(fetchStats, 5000);
    </script>
</body>
</html>
"""

    def start_dashboard(self, port: int = DASHBOARD_PORT) -> None:
        """
        Start web dashboard in background thread

        Args:
            port: Port to run dashboard on
        """
        if not self.app:
            self.logger.error("Flask not installed. Install with: pip install flask")
            return

        self._setup_flask_routes()

        def run_dashboard():
            try:
                self.logger.info(f"Dashboard starting on http://localhost:{port}")
                self.app.run(
                    host="127.0.0.1", port=port, debug=False, use_reloader=False, threaded=True
                )
            except Exception as e:
                self.logger.error(f"Dashboard error: {e}")

        self.dashboard_thread = threading.Thread(target=run_dashboard, daemon=True)
        self.dashboard_running = True
        self.dashboard_thread.start()
        self.logger.info(f"Dashboard started on http://localhost:{port}")

    def start_stats_saver(self) -> None:
        """Start background thread to save statistics periodically"""

        def save_stats_loop():
            while self.stats_save_running:
                time.sleep(STATS_SAVE_INTERVAL)
                self._save_all_time_stats()

        self.stats_save_running = True
        self.stats_save_thread = threading.Thread(target=save_stats_loop, daemon=True)
        self.stats_save_thread.start()
        self.logger.info("Statistics saver started")

    def stop(self) -> None:
        """Stop monitoring and save final stats"""
        self.logger.info("Stopping monitor...")
        self.stats_save_running = False
        self.dashboard_running = False
        self._save_all_time_stats()
        self.all_time_stats.total_sessions += 1
        self.logger.info("Monitor stopped")


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    import random

    # Initialize monitor
    monitor = WorkerMonitor(worker_name="captcha-solver-01")

    # Start dashboard
    monitor.start_dashboard(port=8080)

    # Start stats saver
    monitor.start_stats_saver()

    # Register health check callback
    def on_health_check(is_healthy):
        if not is_healthy:
            print("🚨 WORKER NOT HEALTHY - WOULD TRIGGER EMERGENCY STOP")

    monitor.health_check_callbacks.append(on_health_check)

    # Simulate solving attempts
    print("\n📊 Starting simulation (visit http://localhost:8080)")
    print("=" * 60)

    captcha_types = ["text", "slider", "click", "puzzle"]

    try:
        for i in range(150):
            # Simulate success with varying rates
            success = random.random() < 0.96  # 96% success rate
            solve_time = random.uniform(2, 8)  # 2-8 seconds per solve
            ctype = random.choice(captcha_types)

            monitor.record_attempt(success=success, solve_time=solve_time, captcha_type=ctype)

            print(
                f"[{i + 1:3d}] {ctype:8s} | "
                f"Success: {success!s:5s} | "
                f"Time: {solve_time:5.2f}s | "
                f"Rate: {monitor.get_success_rate():5.2f}% | "
                f"Health: {'✅ OK' if monitor.is_healthy else '🚨 ALERT'}"
            )

            time.sleep(0.5)  # Simulate work

            if not monitor.check_health():
                print("\n⛔ EMERGENCY STOP WOULD BE TRIGGERED HERE\n")
                break

    except KeyboardInterrupt:
        print("\n\nInterrupted by user")

    finally:
        monitor.stop()
        print("\n✅ Monitor stopped and stats saved")
