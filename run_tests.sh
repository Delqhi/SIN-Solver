#!/bin/bash
cd /Users/jeremy/dev/SIN-Solver
source venv/bin/activate

echo "=================================="
echo "TEST SUITE: app/__init__.py Verification"
echo "=================================="
echo ""

# TEST 0: Syntax Check
echo "=== TEST 0: Syntax Check ==="
python3 -m py_compile app/__init__.py 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Test 0 PASSED: app/__init__.py has valid syntax"
else
    echo "❌ Test 0 FAILED: Syntax error in app/__init__.py"
fi
echo ""

# TEST 1: FastAPI App Import
echo "=== TEST 1: FastAPI App Import ==="
python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/jeremy/dev/SIN-Solver')
try:
    from app import app
    print(f'✅ Test 1 PASSED: FastAPI app imported successfully')
    print(f'   - App type: {type(app).__name__}')
    print(f'   - Total routes: {len(app.routes)}')
except Exception as e:
    print(f'❌ Test 1 FAILED: {e}')
    import traceback
    traceback.print_exc()
EOF
echo ""

# TEST 2: Settings Import
echo "=== TEST 2: Settings Import ==="
python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/jeremy/dev/SIN-Solver')
try:
    from app import settings, Settings
    print(f'✅ Test 2 PASSED: Settings objects imported successfully')
    print(f'   - settings instance type: {type(settings).__name__}')
    print(f'   - Settings class type: {Settings.__name__}')
except Exception as e:
    print(f'❌ Test 2 FAILED: {e}')
    import traceback
    traceback.print_exc()
EOF
echo ""

# TEST 3: Security Components Import
echo "=== TEST 3: Security Components Import ==="
python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/jeremy/dev/SIN-Solver')
try:
    from app import SecurityManager, get_security_manager, require_api_key, verify_token_dependency
    print(f'✅ Test 3 PASSED: All security components imported successfully')
    print(f'   - SecurityManager: {SecurityManager.__name__}')
    print(f'   - get_security_manager: {get_security_manager.__name__}')
    print(f'   - require_api_key: {require_api_key.__name__}')
    print(f'   - verify_token_dependency: {verify_token_dependency.__name__}')
except Exception as e:
    print(f'❌ Test 3 FAILED: {e}')
    import traceback
    traceback.print_exc()
EOF
echo ""

# TEST 4: Router Imports
echo "=== TEST 4: Router Imports (11 Routers) ==="
python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/jeremy/dev/SIN-Solver')
try:
    from app import solve, auth, health, workers, steel, chat, docs, pentest, secrets, resources, system
    routers = {
        'solve': solve,
        'auth': auth,
        'health': health,
        'workers': workers,
        'steel': steel,
        'chat': chat,
        'docs': docs,
        'pentest': pentest,
        'secrets': secrets,
        'resources': resources,
        'system': system,
    }
    print(f'✅ Test 4 PASSED: All 11 routers imported successfully')
    for router_name, router_obj in routers.items():
        print(f'   - {router_name}: {type(router_obj).__name__}')
except Exception as e:
    print(f'❌ Test 4 FAILED: {e}')
    import traceback
    traceback.print_exc()
EOF
echo ""

# TEST 5: init_master_user Compatibility
echo "=== TEST 5: init_master_user.py Compatibility ==="
python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/jeremy/dev/SIN-Solver')
try:
    from app.core.config import settings
    from app.models.models import User, UserTier, Base
    from app.services.auth_service import get_auth_service
    print(f'✅ Test 5 PASSED: init_master_user.py imports all work correctly')
    print(f'   - settings: {type(settings).__name__}')
    print(f'   - User model: {User.__name__}')
    print(f'   - UserTier enum: {UserTier.__name__}')
except Exception as e:
    print(f'❌ Test 5 FAILED: {e}')
    import traceback
    traceback.print_exc()
EOF
echo ""

# TEST 6: Full Package Import Chain
echo "=== TEST 6: Full Package Import Chain ==="
python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/jeremy/dev/SIN-Solver')
try:
    import app
    import app.core
    import app.api
    import app.api.routes
    print(f'✅ Test 6 PASSED: Full package import chain works')
    print(f'   - app package: OK')
    print(f'   - app.core: OK')
    print(f'   - app.api: OK')
    print(f'   - app.api.routes: OK')
except Exception as e:
    print(f'❌ Test 6 FAILED: {e}')
    import traceback
    traceback.print_exc()
EOF
echo ""

# TEST 7: All __init__.py Files Syntax Check
echo "=== TEST 7: All __init__.py Files Syntax Check ==="
python3 << 'EOF'
import py_compile
import os

init_files = [
    '/Users/jeremy/dev/SIN-Solver/app/__init__.py',
    '/Users/jeremy/dev/SIN-Solver/app/api/__init__.py',
    '/Users/jeremy/dev/SIN-Solver/app/core/__init__.py',
    '/Users/jeremy/dev/SIN-Solver/app/api/routes/__init__.py',
]

all_passed = True
for init_file in init_files:
    try:
        py_compile.compile(init_file, doraise=True)
        print(f'   ✅ {os.path.basename(init_file):25} - Syntax OK')
    except Exception as e:
        print(f'   ❌ {os.path.basename(init_file):25} - FAILED: {e}')
        all_passed = False

print("")
if all_passed:
    print('✅ Test 7 PASSED: All __init__.py files have valid syntax')
else:
    print('❌ Test 7 FAILED: Some __init__.py files have syntax errors')
EOF
echo ""

echo "=================================="
echo "TEST SUITE COMPLETE"
echo "=================================="
