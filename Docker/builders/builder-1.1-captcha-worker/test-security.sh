#!/bin/bash

# CAPTCHA Worker - Security Endpoint Tests
# Version: 2.1.0
# Date: 2026-01-30
# Purpose: Verify API authentication, CORS, and endpoint security

set -e

API_BASE="http://localhost:8019"
VALID_KEY="sk-captcha-worker-production-2026"
INVALID_KEY="invalid-key-12345"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local auth_header="$4"
    local expected_status="$5"
    local data="$6"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Test $TOTAL_TESTS: $test_name ... "
    
    # Build curl command
    local cmd="curl -s -w '\n%{http_code}' -X $method '$API_BASE$endpoint'"
    
    if [ -n "$auth_header" ]; then
        cmd="$cmd -H 'Authorization: $auth_header'"
    fi
    
    cmd="$cmd -H 'Content-Type: application/json'"
    
    if [ -n "$data" ]; then
        cmd="$cmd -d '$data'"
    fi
    
    # Execute and capture response
    response=$(eval "$cmd")
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    
    # Check if status matches expected
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}PASSED${NC} (Status: $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAILED${NC} (Expected: $expected_status, Got: $http_code)"
        echo "  Response: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "================================================"
echo "CAPTCHA Worker - Security Endpoint Tests"
echo "================================================"
echo "API Base: $API_BASE"
echo "Date: $(date)"
echo ""

# ========================================
# 1. PUBLIC ENDPOINTS (NO AUTH REQUIRED)
# ========================================
echo -e "\n${YELLOW}=== PUBLIC ENDPOINTS (No Auth Required) ===${NC}"

test_endpoint "GET /health" "GET" "/health" "" "200"
test_endpoint "GET /ready" "GET" "/ready" "" "200"
test_endpoint "GET /metrics" "GET" "/metrics" "" "200"

# ========================================
# 2. PROTECTED ENDPOINTS - MISSING AUTH
# ========================================
echo -e "\n${YELLOW}=== PROTECTED ENDPOINTS - MISSING AUTH ===${NC}"

test_endpoint "POST /api/solve without auth" "POST" "/api/solve" "" "401" '{"image_data": "test"}'
test_endpoint "POST /api/solve/text without auth" "POST" "/api/solve/text" "" "401" '{"image_data": "test"}'
test_endpoint "POST /api/solve/image-grid without auth" "POST" "/api/solve/image-grid" "" "401" '{"image_data": "test"}'
test_endpoint "POST /api/solve/browser without auth" "POST" "/api/solve/browser" "" "401" '{"url": "test"}'
test_endpoint "POST /api/solve/batch without auth" "POST" "/api/solve/batch" "" "401" '{"images": []}'

# ========================================
# 3. PROTECTED ENDPOINTS - INVALID AUTH
# ========================================
echo -e "\n${YELLOW}=== PROTECTED ENDPOINTS - INVALID AUTH ===${NC}"

test_endpoint "POST /api/solve with invalid key" "POST" "/api/solve" "Bearer $INVALID_KEY" "401" '{"image_data": "test"}'
test_endpoint "POST /api/solve with malformed auth" "POST" "/api/solve" "InvalidHeader" "401" '{"image_data": "test"}'

# ========================================
# 4. PROTECTED ENDPOINTS - VALID AUTH
# ========================================
echo -e "\n${YELLOW}=== PROTECTED ENDPOINTS - VALID AUTH ===${NC}"

# Note: These may fail with 400 for invalid data, but NOT 401
test_endpoint "POST /api/solve with valid key" "POST" "/api/solve" "Bearer $VALID_KEY" "400" '{"invalid": "data"}'
test_endpoint "POST /api/solve/text with valid key" "POST" "/api/solve/text" "Bearer $VALID_KEY" "400" '{"invalid": "data"}'
test_endpoint "POST /api/solve/image-grid with valid key" "POST" "/api/solve/image-grid" "Bearer $VALID_KEY" "400" '{"invalid": "data"}'
test_endpoint "POST /api/solve/browser with valid key" "POST" "/api/solve/browser" "Bearer $VALID_KEY" "400" '{"invalid": "data"}'
test_endpoint "POST /api/solve/batch with valid key" "POST" "/api/solve/batch" "Bearer $VALID_KEY" "400" '{"invalid": "data"}'

# ========================================
# CORS TESTS
# ========================================
echo -e "\n${YELLOW}=== CORS CONFIGURATION TESTS ===${NC}"

# Test 1: Check CORS headers from allowed origin
echo "Test $((TOTAL_TESTS + 1)): CORS from localhost:3000 ... "
cors_response=$(curl -s -i -X OPTIONS "$API_BASE/api/solve" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" 2>&1)

if echo "$cors_response" | grep -q "Access-Control-Allow-Origin: http://localhost:3000"; then
    echo -e "${GREEN}PASSED${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}FAILED${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 2: Check CORS headers from non-allowed origin
echo "Test $((TOTAL_TESTS)): CORS from evil-domain.com ... "
cors_response=$(curl -s -i -X OPTIONS "$API_BASE/api/solve" \
    -H "Origin: http://evil-domain.com" \
    -H "Access-Control-Request-Method: POST" 2>&1)

if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${RED}FAILED${NC} (Origin should be blocked)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
else
    echo -e "${GREEN}PASSED${NC} (Origin correctly blocked)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# ========================================
# RESULTS
# ========================================
echo ""
echo "================================================"
echo "TEST RESULTS"
echo "================================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ All security tests PASSED!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests FAILED!${NC}"
    exit 1
fi
