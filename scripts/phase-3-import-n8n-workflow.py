#!/usr/bin/env python3
"""
Phase 3: Import n8n Workflow
============================
Automatically imports the 2captcha-worker-production.json workflow into n8n
"""

import json
import requests
import os
import sys
from datetime import datetime
from pathlib import Path

def import_workflow_to_n8n():
    """Import workflow to n8n"""
    
    print("\n" + "="*80)
    print(" PHASE 3: N8N WORKFLOW IMPORT")
    print("="*80)
    
    # Paths
    workflow_file = Path("/Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json")
    
    # Step 1: Load workflow
    print("\n[STEP 1] Loading workflow JSON...")
    if not workflow_file.exists():
        print(f"[ERROR] Workflow file not found: {workflow_file}")
        return False
    
    with open(workflow_file) as f:
        workflow_data = json.load(f)
    
    print(f"✓ Loaded workflow: {workflow_data.get('name', 'Unknown')}")
    print(f"  - Nodes: {len(workflow_data.get('nodes', []))}")
    print(f"  - Connections: {len(workflow_data.get('connections', []))}")
    
    # Step 2: Try import endpoint
    print("\n[STEP 2] Importing to n8n...")
    
    try:
        # Try the import endpoint (often doesn't require auth)
        resp = requests.post(
            "http://localhost:5678/api/v1/workflows/import",
            json=workflow_data,
            timeout=10
        )
        print(f"[*] Response status: {resp.status_code}")
        
        if resp.status_code in [200, 201]:
            print("✓ Workflow imported successfully!")
            result = resp.json()
            print(f"  - Workflow ID: {result.get('id', 'N/A')}")
            print(f"  - Name: {result.get('name', 'N/A')}")
            return True
        else:
            print(f"[!] Response: {resp.text[:500]}")
            
    except Exception as e:
        print(f"[ERROR] Import failed: {e}")
    
    return False

if __name__ == "__main__":
    success = import_workflow_to_n8n()
    sys.exit(0 if success else 1)
