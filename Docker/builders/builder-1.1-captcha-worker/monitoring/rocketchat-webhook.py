#!/usr/bin/env python3
"""
Rocket.Chat Webhook Adapter for Alertmanager

Converts Prometheus Alertmanager webhook payloads to Rocket.Chat message format.
Receives alerts from Alertmanager and posts formatted messages to Rocket.Chat channels.

Environment Variables:
- ROCKETCHAT_URL: Base URL (https://delqhi.chat)
- ROCKETCHAT_WEBHOOK_CRITICAL: Webhook for P1 alerts (#alerts-critical)
- ROCKETCHAT_WEBHOOK_WARNING: Webhook for P2 alerts (#alerts-warning)
- ROCKETCHAT_WEBHOOK_INFO: Webhook for P3 alerts (#alerts-info)
"""

import os
import json
import logging
from typing import Dict, List, Any
from datetime import datetime
import requests
from flask import Flask, request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Severity color mapping
SEVERITY_COLORS = {
    "critical": "#FF0000",  # Red
    "warning": "#FFAA00",  # Orange
    "info": "#0099FF",  # Blue
}

# Severity emoji mapping
SEVERITY_EMOJI = {
    "critical": "🔴",
    "warning": "🟡",
    "info": "🔵",
}


def get_webhook_url(severity: str) -> str:
    """Get Rocket.Chat webhook URL based on alert severity."""
    webhook_map = {
        "critical": os.getenv("ROCKETCHAT_WEBHOOK_CRITICAL"),
        "warning": os.getenv("ROCKETCHAT_WEBHOOK_WARNING"),
        "info": os.getenv("ROCKETCHAT_WEBHOOK_INFO"),
    }
    return webhook_map.get(severity, webhook_map.get("warning"))


def format_alert_for_rocketchat(alert: Dict[str, Any], severity: str) -> Dict[str, Any]:
    """
    Format a single alert for Rocket.Chat webhook.

    Args:
        alert: Alert object from Alertmanager
        severity: Alert severity level (critical, warning, info)

    Returns:
        Formatted Rocket.Chat attachment
    """
    labels = alert.get("labels", {})
    annotations = alert.get("annotations", {})
    status = alert.get("status", "unknown")

    emoji = SEVERITY_EMOJI.get(severity, "❓")
    color = SEVERITY_COLORS.get(severity, "#999999")

    return {
        "color": color,
        "title": f"{emoji} {labels.get('alertname', 'Unknown Alert')}",
        "text": annotations.get("summary", annotations.get("description", "No description")),
        "fields": [
            {
                "title": "Service",
                "value": labels.get("service", "N/A"),
                "short": True,
            },
            {
                "title": "Severity",
                "value": severity.upper(),
                "short": True,
            },
            {
                "title": "Status",
                "value": status.upper(),
                "short": True,
            },
            {
                "title": "Instance",
                "value": labels.get("instance", labels.get("pod", "N/A")),
                "short": True,
            },
            {
                "title": "Details",
                "value": annotations.get("runbook_url", "No runbook available"),
                "short": False,
            },
        ],
        "ts": int(datetime.now().timestamp()),
    }


def send_to_rocketchat(webhook_url: str, payload: Dict[str, Any]) -> bool:
    """
    Send formatted alert to Rocket.Chat webhook.

    Args:
        webhook_url: Rocket.Chat webhook URL
        payload: Formatted payload

    Returns:
        True if successful, False otherwise
    """
    if not webhook_url:
        logger.error("Webhook URL not configured")
        return False

    try:
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        response.raise_for_status()
        logger.info(f"Alert sent successfully to Rocket.Chat: {response.status_code}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send alert to Rocket.Chat: {str(e)}")
        return False


@app.route("/webhook", methods=["POST"])
def handle_alert():
    """
    Handle incoming Alertmanager webhook.

    Expects JSON payload from Alertmanager with structure:
    {
        "alerts": [...],
        "groupLabels": {...},
        "commonLabels": {...},
        "commonAnnotations": {...}
    }
    """
    try:
        data = request.get_json()
        alerts = data.get("alerts", [])

        if not alerts:
            logger.warning("Received webhook with no alerts")
            return {"status": "ok", "processed": 0}, 200

        # Determine severity from first alert (or common labels)
        first_alert = alerts[0]
        severity = first_alert.get("labels", {}).get("severity", "warning").lower()

        # Get appropriate webhook URL
        webhook_url = get_webhook_url(severity)

        # Format alerts for Rocket.Chat
        attachments = []
        for alert in alerts:
            formatted = format_alert_for_rocketchat(
                alert,
                alert.get("labels", {}).get("severity", severity).lower(),
            )
            attachments.append(formatted)

        # Create Rocket.Chat payload
        rc_payload = {
            "text": f"{SEVERITY_EMOJI.get(severity, '❓')} {severity.upper()} Alert from Prometheus",
            "attachments": attachments,
            "username": "Alertmanager",
            "icon_emoji": ":chart_with_upwards_trend:",
        }

        # Send to Rocket.Chat
        success = send_to_rocketchat(webhook_url, rc_payload)

        return {
            "status": "ok" if success else "error",
            "processed": len(alerts),
            "alerts": [a.get("labels", {}).get("alertname", "Unknown") for a in alerts],
        }, 200 if success else 500

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}, 500


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "rocketchat-webhook-adapter",
        "version": "1.0.0",
    }, 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8093))
    debug = os.getenv("DEBUG", "false").lower() == "true"

    logger.info(f"Starting Rocket.Chat webhook adapter on port {port}")
    logger.info(f"Debug mode: {debug}")

    app.run(host="0.0.0.0", port=port, debug=debug)
