"""
Integration Guide & Example Usage
==================================

Real-world examples for integrating WorkerMonitor into captcha solving operations.
"""

# ============================================================================
# EXAMPLE 1: Basic Integration with Captcha Solver Loop
# ============================================================================


def example_basic_solver():
    """
    Example 1: Basic integration with main captcha solving loop

    Setup:
    - Start monitor with dashboard
    - Record attempts in solve loop
    - Check health before each attempt
    """

    from monitor import WorkerMonitor
    import time

    # Initialize monitor
    monitor = WorkerMonitor(worker_name="captcha-solver-prod-01")

    # Start web dashboard (accessible at http://localhost:8080)
    monitor.start_dashboard(port=8080)

    # Start background stats saver
    monitor.start_stats_saver()

    # Register health check callback for emergency stop
    def handle_health_alert(is_healthy):
        if not is_healthy:
            print("\n🚨 EMERGENCY STOP: Success rate critical")
            # Cleanup code here
            raise SystemExit("Health check failed")

    monitor.health_check_callbacks.append(handle_health_alert)

    # Main solving loop
    try:
        while True:
            # Check health before processing
            if not monitor.check_health():
                print("Worker is unhealthy - stopping")
                break

            # Get next captcha (pseudo-code)
            captcha = get_next_captcha()

            # Solve it
            start_time = time.time()
            success, solution = solve_captcha(captcha)
            solve_time = time.time() - start_time

            # Record in monitor
            monitor.record_attempt(
                success=success,
                solve_time=solve_time,
                captcha_type=captcha.type,  # "text", "slider", "click", etc.
            )

            # Optional: Check success rate periodically
            if captcha.index % 50 == 0:
                rate = monitor.get_success_rate()
                print(f"[{captcha.index}] Success rate: {rate:.2f}%")

    except KeyboardInterrupt:
        print("\nInterrupted by user")

    finally:
        monitor.stop()
        print("✅ Monitor stopped and stats saved")


# ============================================================================
# EXAMPLE 2: Multi-Worker Monitoring with Separate Dashboards
# ============================================================================


def example_multi_worker():
    """
    Example 2: Multiple workers with separate monitor instances

    Setup:
    - 3 workers solving different captcha types
    - Each with separate monitor on different port
    - Aggregated statistics
    """

    from monitor import WorkerMonitor
    import threading
    import time

    workers = [
        {"name": "text-solver-01", "port": 8001, "type": "text"},
        {"name": "slider-solver-01", "port": 8002, "type": "slider"},
        {"name": "click-solver-01", "port": 8003, "type": "click"},
    ]

    monitors = {}

    # Create monitors for each worker
    for worker in workers:
        monitor = WorkerMonitor(worker_name=worker["name"])
        monitor.start_dashboard(port=worker["port"])
        monitor.start_stats_saver()
        monitors[worker["name"]] = {
            "monitor": monitor,
            "type": worker["type"],
            "port": worker["port"],
        }

    # Worker threads
    def run_worker(worker_name, monitor):
        import random

        while True:
            # Simulate solving
            success = random.random() < 0.97
            solve_time = random.uniform(2, 8)

            monitor.record_attempt(
                success=success,
                solve_time=solve_time,
                captcha_type=workers[0]["type"],  # Match worker type
            )

            time.sleep(1)

    # Start all workers
    threads = []
    for name, data in monitors.items():
        t = threading.Thread(target=run_worker, args=(name, data["monitor"]), daemon=True)
        t.start()
        threads.append(t)

    # Aggregated dashboard
    print("\n📊 MULTI-WORKER MONITORING SETUP")
    print("=" * 60)
    for worker, data in monitors.items():
        print(f"  {worker:20s} → http://localhost:{data['port']}")

    # Aggregate stats periodically
    try:
        while True:
            time.sleep(30)

            total_captchas = 0
            total_earnings = 0.0
            overall_rate = 0.0

            for name, data in monitors.items():
                stats = data["monitor"].get_dashboard_data()
                total_captchas += stats["total_captchas_all_time"]
                total_earnings += stats["total_earnings_all_time"]
                overall_rate += stats["success_rate"]

            avg_rate = overall_rate / len(monitors)

            print(f"\n📈 AGGREGATE STATS")
            print(f"  Total Captchas: {total_captchas}")
            print(f"  Total Earnings: ${total_earnings:.2f}")
            print(f"  Average Success Rate: {avg_rate:.2f}%")

    except KeyboardInterrupt:
        print("\nShutting down workers...")
        for name, data in monitors.items():
            data["monitor"].stop()


# ============================================================================
# EXAMPLE 3: Advanced - Custom Alerting with Slack
# ============================================================================


def example_slack_alerts():
    """
    Example 3: Send critical alerts to Slack

    Setup:
    - Register webhook callback
    - Send Slack messages on critical alerts
    - Include trending data
    """

    from monitor import WorkerMonitor
    import os
    import json
    import requests

    # Set webhook in environment
    # export MONITOR_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"

    monitor = WorkerMonitor(worker_name="captcha-solver-slack")
    monitor.start_dashboard(port=8080)
    monitor.start_stats_saver()

    # Custom alert handler
    def send_slack_alert(message: str, level: str):
        webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        if not webhook_url:
            return

        # Get current data
        data = monitor.get_dashboard_data()

        color_map = {"warning": "#f59e0b", "critical": "#ef4444", "info": "#3b82f6"}

        payload = {
            "attachments": [
                {
                    "color": color_map.get(level, "#999"),
                    "title": f"🤖 Worker Alert: {level.upper()}",
                    "text": message,
                    "fields": [
                        {
                            "title": "Success Rate",
                            "value": f"{data['success_rate']}%",
                            "short": True,
                        },
                        {
                            "title": "Captchas Solved",
                            "value": str(data["captchas_solved_session"]),
                            "short": True,
                        },
                        {"title": "Duration", "value": data["session_duration"], "short": True},
                        {
                            "title": "Earnings (Session)",
                            "value": f"${data['session_earnings']:.4f}",
                            "short": True,
                        },
                    ],
                    "footer": "Captcha Worker Monitor",
                    "ts": int(time.time()),
                }
            ]
        }

        try:
            requests.post(webhook_url, json=payload, timeout=5)
        except Exception as e:
            print(f"Failed to send Slack alert: {e}")

    # Register callback
    last_alert_level = None

    def on_health_change(is_healthy):
        nonlocal last_alert_level

        rate = monitor.get_success_rate()

        if rate < 95.0 and last_alert_level != "critical":
            send_slack_alert(f"Success rate dropped to {rate:.2f}% - EMERGENCY STOP", "critical")
            last_alert_level = "critical"

        elif 95.0 <= rate < 96.0 and last_alert_level != "warning":
            send_slack_alert(f"Success rate at {rate:.2f}% - Below warning threshold", "warning")
            last_alert_level = "warning"

        elif is_healthy and last_alert_level != "healthy":
            send_slack_alert(f"Worker recovered - Success rate {rate:.2f}%", "info")
            last_alert_level = "healthy"

    monitor.health_check_callbacks.append(on_health_change)

    print("✅ Slack alerting enabled")


# ============================================================================
# EXAMPLE 4: Database Integration - Store Stats in PostgreSQL
# ============================================================================


def example_database_integration():
    """
    Example 4: Persist statistics to PostgreSQL

    Setup:
    - Save worker stats to database
    - Query historical trends
    - Build reports
    """

    from monitor import WorkerMonitor
    import psycopg2
    from datetime import datetime, timedelta

    monitor = WorkerMonitor(worker_name="captcha-solver-db")
    monitor.start_dashboard(port=8080)
    monitor.start_stats_saver()

    # Database connection
    def get_db_connection():
        return psycopg2.connect(
            host="localhost", database="worker_stats", user="postgres", password="password"
        )

    # Create tables
    def create_tables():
        conn = get_db_connection()
        cur = conn.cursor()

        # Worker stats table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS worker_stats (
                id SERIAL PRIMARY KEY,
                worker_name VARCHAR(255),
                timestamp TIMESTAMP,
                success_rate FLOAT,
                captchas_solved INT,
                session_earnings FLOAT,
                avg_solve_time FLOAT,
                current_ip VARCHAR(50)
            )
        """)

        # Add index for faster queries
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_worker_timestamp 
            ON worker_stats(worker_name, timestamp DESC)
        """)

        conn.commit()
        cur.close()
        conn.close()

    # Save current stats to database
    def save_to_db():
        conn = get_db_connection()
        cur = conn.cursor()

        data = monitor.get_dashboard_data()

        cur.execute(
            """
            INSERT INTO worker_stats 
            (worker_name, timestamp, success_rate, captchas_solved, 
             session_earnings, avg_solve_time, current_ip)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
            (
                data["worker_name"],
                datetime.fromisoformat(data["timestamp"]),
                data["success_rate"],
                data["captchas_solved_session"],
                data["session_earnings"],
                data["avg_solve_time"],
                data["current_ip"],
            ),
        )

        conn.commit()
        cur.close()
        conn.close()

    # Query trends
    def get_hourly_trend():
        conn = get_db_connection()
        cur = conn.cursor()

        one_hour_ago = datetime.now() - timedelta(hours=1)

        cur.execute(
            """
            SELECT 
                DATE_TRUNC('minute', timestamp) as minute,
                AVG(success_rate) as avg_rate,
                COUNT(*) as samples
            FROM worker_stats
            WHERE worker_name = %s AND timestamp > %s
            GROUP BY minute
            ORDER BY minute DESC
        """,
            (monitor.worker_name, one_hour_ago),
        )

        results = cur.fetchall()
        cur.close()
        conn.close()

        return results

    # Setup periodic saving
    import threading
    import time

    def periodic_save():
        create_tables()  # Init once

        while True:
            try:
                time.sleep(60)  # Save every 60 seconds
                save_to_db()
            except Exception as e:
                print(f"DB save error: {e}")

    # Start background saver
    save_thread = threading.Thread(target=periodic_save, daemon=True)
    save_thread.start()

    print("✅ Database integration enabled")

    # Example query after some time
    import time

    time.sleep(120)
    trends = get_hourly_trend()
    print("\n📊 HOURLY TRENDS:")
    for minute, avg_rate, samples in trends:
        print(f"  {minute} → {avg_rate:.2f}% ({samples} samples)")


# ============================================================================
# EXAMPLE 5: CLI Tool - Real-Time Stats in Terminal
# ============================================================================


def example_cli_stats():
    """
    Example 5: Display real-time stats in terminal

    Setup:
    - Fetch stats from API
    - Display in terminal with colors
    - Update every 5 seconds
    """

    import requests
    import os
    import time
    from datetime import datetime

    API_URL = "http://localhost:8080/api/stats"

    def clear_screen():
        os.system("clear" if os.name != "nt" else "cls")

    def color_text(text, color):
        colors = {
            "green": "\033[92m",
            "yellow": "\033[93m",
            "red": "\033[91m",
            "blue": "\033[94m",
            "reset": "\033[0m",
        }
        return f"{colors.get(color, '')}{text}{colors['reset']}"

    def get_status_color(rate):
        if rate >= 96:
            return "green"
        elif rate >= 95:
            return "yellow"
        else:
            return "red"

    try:
        while True:
            clear_screen()

            try:
                response = requests.get(API_URL, timeout=2)
                data = response.json()
            except Exception as e:
                print(f"Error connecting to dashboard: {e}")
                print("Make sure monitor.start_dashboard() is running")
                time.sleep(5)
                continue

            # Header
            print("=" * 70)
            print(color_text("🤖 CAPTCHA WORKER MONITOR - REAL-TIME STATS", "blue"))
            print("=" * 70)
            print()

            # Success rate (with color)
            rate = data["success_rate"]
            rate_color = get_status_color(rate)
            print(f"Success Rate: {color_text(f'{rate}%', rate_color)}")

            # Key metrics
            print(f"Session Duration: {data['session_duration']}")
            print(f"Captchas Solved: {data['captchas_solved_session']} (session)")
            print(f"                 {data['total_captchas_all_time']} (all-time)")
            print(f"Session Earnings: ${data['session_earnings']:.4f}")
            print(f"Avg Solve Time: {data['avg_solve_time']:.2f}s")
            print(f"Current IP: {data['current_ip']}")
            print()

            # Status
            status = "✅ HEALTHY" if data["is_healthy"] else "⚠️  WARNING"
            if data["critical_alert"]:
                status = color_text("🚨 CRITICAL", "red")

            print(f"Status: {status}")
            print(f"Paused: {'Yes' if data['is_paused'] else 'No'}")
            print()

            # Per-type stats
            if data["captcha_types"]:
                print("Per-Type Statistics:")
                for ctype, stats in data["captcha_types"].items():
                    print(
                        f"  {ctype:12s} | "
                        f"Count: {stats['count']:3d} | "
                        f"Rate: {stats['success_rate']:5.1f}% | "
                        f"Avg: {stats['avg_solve_time']:5.2f}s"
                    )

            print()
            print("-" * 70)
            print(f"Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Press Ctrl+C to exit | Refreshing in 5 seconds...")

            time.sleep(5)

    except KeyboardInterrupt:
        print("\n\nExited")


# ============================================================================
# EXECUTION
# ============================================================================

if __name__ == "__main__":
    import sys

    examples = {
        "1": ("Basic Integration", example_basic_solver),
        "2": ("Multi-Worker Monitoring", example_multi_worker),
        "3": ("Slack Alerts", example_slack_alerts),
        "4": ("Database Integration", example_database_integration),
        "5": ("CLI Terminal Display", example_cli_stats),
    }

    print("\n" + "=" * 60)
    print("WORKER MONITOR - INTEGRATION EXAMPLES")
    print("=" * 60)

    for key, (name, _) in examples.items():
        print(f"{key}. {name}")

    print("\nSelect example to run (1-5) or press Ctrl+C to exit:")

    try:
        choice = input("> ").strip()

        if choice in examples:
            name, func = examples[choice]
            print(f"\n▶️  Running: {name}\n")
            func()
        else:
            print("Invalid choice")

    except KeyboardInterrupt:
        print("\n\nExited")
