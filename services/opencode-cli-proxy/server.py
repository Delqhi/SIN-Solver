#!/usr/bin/env python3
"""
OpenCode CLI HTTP Proxy
Enables CORS access from Delqhi-Platform Dashboard to OpenCode CLI
"""

import subprocess
import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Enable CORS for all origins (restrict in production!)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3011",
                "https://delqhi.com",
                "https://*.delqhi.com",
            ],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    },
)


def execute_opencode_command(command, args=None, timeout=120):
    """
    Execute opencode CLI command and return result

    Args:
        command: opencode subcommand (e.g., 'mcp', 'models', 'generate')
        args: list of additional arguments
        timeout: command timeout in seconds

    Returns:
        dict with stdout, stderr, returncode
    """
    cmd = ["opencode"]

    if command:
        cmd.append(command)

    if args:
        cmd.extend(args)

    logger.info(f"Executing: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout, env=os.environ.copy()
        )

        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "command": " ".join(cmd),
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": f"Command timed out after {timeout}s",
            "command": " ".join(cmd),
        }
    except Exception as e:
        return {"success": False, "error": str(e), "command": " ".join(cmd)}


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "opencode-cli-proxy", "version": "1.0.0"})


@app.route("/api/opencode/version", methods=["GET"])
def get_version():
    """Get opencode CLI version"""
    result = execute_opencode_command("--version")
    return jsonify(result)


@app.route("/api/opencode/models", methods=["GET"])
def list_models():
    """List available models"""
    result = execute_opencode_command("models")
    return jsonify(result)


@app.route("/api/opencode/mcp/list", methods=["GET"])
def list_mcp_servers():
    """List MCP servers"""
    result = execute_opencode_command("mcp", ["list"])
    return jsonify(result)


@app.route("/api/opencode/mcp/tools", methods=["POST"])
def list_mcp_tools():
    """List tools for an MCP server"""
    data = request.json
    server_name = data.get("server")

    if not server_name:
        return jsonify({"success": False, "error": "server name required"}), 400

    result = execute_opencode_command("mcp", ["list-tools", server_name])
    return jsonify(result)


@app.route("/api/opencode/mcp/call", methods=["POST"])
def call_mcp_tool():
    """Call an MCP tool"""
    data = request.json
    server = data.get("server")
    tool = data.get("tool")
    args = data.get("args", [])

    if not server or not tool:
        return jsonify({"success": False, "error": "server and tool required"}), 400

    cmd_args = ["call", server, tool]
    if args:
        cmd_args.extend([str(arg) for arg in args])

    result = execute_opencode_command("mcp", cmd_args)
    return jsonify(result)


@app.route("/api/opencode/generate", methods=["POST"])
def generate_code():
    """Generate code using opencode"""
    data = request.json
    prompt = data.get("prompt")
    model = data.get("model", "google/antigravity-gemini-3-flash")

    if not prompt:
        return jsonify({"success": False, "error": "prompt required"}), 400

    result = execute_opencode_command(
        None,
        ["--model", model, prompt],
        timeout=300,  # 5 minutes for generation
    )
    return jsonify(result)


@app.route("/api/opencode/config", methods=["GET"])
def get_config():
    """Get opencode config"""
    result = execute_opencode_command("config", ["show"])
    return jsonify(result)


@app.route("/api/opencode/status", methods=["GET"])
def get_status():
    """Get comprehensive status"""
    # Check opencode version
    version_result = execute_opencode_command("--version")

    # List MCP servers
    mcp_result = execute_opencode_command("mcp", ["list"])

    # List models
    models_result = execute_opencode_command("models")

    return jsonify(
        {
            "success": True,
            "version": version_result.get("stdout", "unknown"),
            "mcp_servers": mcp_result.get("stdout", ""),
            "models": models_result.get("stdout", ""),
            "timestamp": datetime.now().isoformat(),
        }
    )


from datetime import datetime

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="OpenCode CLI HTTP Proxy")
    parser.add_argument("--port", type=int, default=9999, help="Port to run on")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")

    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info(f"Starting OpenCode CLI Proxy on {args.host}:{args.port}")
    logger.info(f"CORS enabled for: http://localhost:3000, https://delqhi.com")

    app.run(host=args.host, port=args.port, debug=args.debug)
