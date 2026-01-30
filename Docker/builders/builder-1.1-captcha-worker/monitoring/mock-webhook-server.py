#!/usr/bin/env python3
"""
Mock Rocket.Chat Webhook Server for Testing
Listens on port 9999 and logs all incoming requests
"""
from flask import Flask, request, jsonify
import json
from datetime import datetime

app = Flask(__name__)

@app.route('/hooks/incoming/<webhook_id>', methods=['POST'])
def handle_webhook(webhook_id):
    """Receive incoming webhook"""
    data = request.get_json()
    
    timestamp = datetime.now().isoformat()
    log_entry = {
        'timestamp': timestamp,
        'webhook_id': webhook_id,
        'method': request.method,
        'headers': dict(request.headers),
        'body': data
    }
    
    print(f"\n{'='*60}")
    print(f"[{timestamp}] Incoming Webhook: {webhook_id}")
    print(f"{'='*60}")
    print(json.dumps(data, indent=2))
    print(f"{'='*60}\n")
    
    return jsonify({'status': 'received', 'webhook_id': webhook_id, 'timestamp': timestamp}), 200

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({'status': 'healthy', 'service': 'mock-webhook-server'}), 200

if __name__ == '__main__':
    print("🎭 Mock Webhook Server starting on port 9999...")
    print("Webhook URLs:")
    print("  - POST /hooks/incoming/test-critical")
    print("  - POST /hooks/incoming/test-warning")
    print("  - POST /hooks/incoming/test-info")
    app.run(host='0.0.0.0', port=9999, debug=True)
