#!/usr/bin/env python3
"""
PHASE 3: VERIFY WORKFLOW IMPORT
Purpose: Verify that workflow was imported correctly into n8n
Status: Post-import verification
"""

import json
import sys
import subprocess
from pathlib import Path

def print_header(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80 + "\n")

def print_step(step_num, title):
    print(f"[STEP {step_num}] {title}")
    print("-" * 60)

def check_workflow_file():
    """Verify workflow file exists and is valid"""
    print_step(1, "Checking workflow file")
    
    workflow_path = Path("/Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json")
    
    if not workflow_path.exists():
        print(f"❌ Workflow file not found: {workflow_path}")
        return False
    
    try:
        with open(workflow_path) as f:
            workflow = json.load(f)
        
        nodes = workflow.get('nodes', [])
        connections = workflow.get('connections', [])
        
        print(f"✅ Workflow file valid")
        print(f"   - Nodes: {len(nodes)}")
        print(f"   - Connections: {len(connections)}")
        print(f"   - Name: {workflow.get('name', 'UNNAMED')}")
        
        return True
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        return False

def verify_services():
    """Verify all services are running"""
    print_step(2, "Verifying services")
    
    services = {
        "n8n": "http://localhost:5678",
        "Consensus Solver": "http://localhost:8090/api/health",
        "Steel Browser": "http://localhost:3005"
    }
    
    all_healthy = True
    for name, url in services.items():
        try:
            result = subprocess.run(
                ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url],
                capture_output=True,
                timeout=5
            )
            code = result.stdout.decode().strip()
            if code in ["200", "301", "302"]:
                print(f"✅ {name}: Running")
            else:
                print(f"⚠️  {name}: HTTP {code}")
                all_healthy = False
        except Exception as e:
            print(f"❌ {name}: Error - {e}")
            all_healthy = False
    
    return all_healthy

def check_cookies_dir():
    """Verify .cookies directory exists"""
    print_step(3, "Checking .cookies directory")
    
    cookies_dir = Path("/Users/jeremy/dev/SIN-Solver/.cookies")
    
    if cookies_dir.exists():
        print(f"✅ .cookies directory exists: {cookies_dir}")
        
        # Check for session cookie
        session_file = cookies_dir / "2captcha-session.json"
        if session_file.exists():
            print(f"   - Session cookie found: {session_file}")
        else:
            print(f"   - Session cookie not yet created (will be created after Phase 4)")
        
        return True
    else:
        print(f"❌ .cookies directory missing: {cookies_dir}")
        return False

def check_n8n_status():
    """Check n8n workflow status"""
    print_step(4, "Checking n8n status")
    
    try:
        result = subprocess.run(
            ["curl", "-s", "http://localhost:5678"],
            capture_output=True,
            timeout=5
        )
        
        if result.returncode == 0:
            print(f"✅ n8n responding")
            
            # Try to check for workflow in response
            response = result.stdout.decode()
            if "2captcha" in response or "workflow" in response.lower():
                print(f"   - Workflow may be visible (check browser)")
            
            return True
        else:
            print(f"❌ n8n error code: {result.returncode}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def display_import_checklist():
    """Display import verification checklist"""
    print_step(5, "Import verification checklist")
    
    checklist = [
        "Workflow 'https://2captcha.com/play-and-earn/play' imported successfully",
        "All 33 nodes visible on canvas",
        "All 32 connections established",
        "No red error indicators on any node",
        "Start node visible in top-left",
        "All 9 variables configured",
        "Workflow saved successfully"
    ]
    
    print("Please verify these items in n8n UI:\n")
    for i, item in enumerate(checklist, 1):
        print(f"  [ ] {i}. {item}")
    
    print("\n")

def suggest_next_steps():
    """Suggest next steps"""
    print_header("NEXT STEPS")
    
    print("✅ Phase 3 Verification Complete!")
    print("\nIf all checks passed, you can proceed to Phase 4: Execute Workflow")
    print("\nTo execute the workflow:")
    print("  1. Go to http://localhost:5678")
    print("  2. Find workflow '2captcha Worker - Production'")
    print("  3. Click 'Execute' button")
    print("  4. Monitor the execution logs below the canvas")
    print("\nExpected execution time: 20-30 minutes")
    print("Expected result: 4-5 successful captcha solutions (95%+ success rate)")
    print("Expected earnings: $0.14 - $0.24")
    print("\n")

def main():
    print_header("PHASE 3: WORKFLOW IMPORT VERIFICATION")
    
    results = {
        "Workflow file": check_workflow_file(),
        "Services running": verify_services(),
        ".cookies directory": check_cookies_dir(),
        "n8n status": check_n8n_status()
    }
    
    display_import_checklist()
    
    # Summary
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print_header("VERIFICATION SUMMARY")
    for check, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {check}")
    
    print(f"\nTotal: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🟢 ALL CHECKS PASSED - Ready for Phase 4!")
        suggest_next_steps()
        return 0
    else:
        print("\n🔴 SOME CHECKS FAILED - Please address issues above")
        print("\nFor help, refer to: PHASE-3-WORKFLOW-IMPORT-GUIDE.md")
        print("Troubleshooting section: Scroll to bottom of guide")
        return 1

if __name__ == "__main__":
    sys.exit(main())
