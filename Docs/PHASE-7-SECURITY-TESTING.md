# PHASE 7 Security Testing Strategy

## 1. Overview & Methodology

**Purpose:** Validate all Phase 7 remediation fixes and verify no new vulnerabilities are introduced through the security hardening process.

**Testing Timeline:** 4 weeks, parallel execution with remediation phases

**Success Definition:**
- Security Score: 2/10 → 9/10
- CRITICAL Vulnerabilities: 13 → 0
- HIGH Vulnerabilities: 14 → ≤2
- Code Coverage: 60% → ≥85%
- Test Pass Rate: 92% → 100%

---

## 2. Testing Categories (10 Total)

### Category 1: Pre-Implementation Baseline Testing

**Purpose:** Establish baseline security metrics BEFORE fixes are applied

**Tools:**
- Bandit (Python security linter)
- Safety (Python dependency checker)
- pip-audit (PyPI audit tool)
- SonarQube (code quality & security)

**Commands:**
```bash
# Baseline security metrics
bandit -r src/ app/ -f json > /tmp/bandit_baseline.json
safety check --json > /tmp/safety_baseline.json
pip-audit --desc > /tmp/pip_audit_baseline.txt

# SonarQube analysis
sonarqube-scanner \
  -Dsonar.projectKey=sin-solver \
  -Dsonar.sources=src/,app/ \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=$SONAR_TOKEN
```

**Baseline Metrics to Capture:**
- Total CVSS score sum: 266.4 (13 CRITICAL @ avg 8.2 + 14 HIGH @ avg 7.1)
- CRITICAL vulnerability count: 13
- HIGH vulnerability count: 14
- Code coverage: 60%
- Bandit issue count: 45+
- Dependency vulnerabilities: 8

**Expected Result:** Baseline established for comparison

---

### Category 2: Static Application Security Testing (SAST)

**Purpose:** Detect code-level vulnerabilities before runtime

**Tools:**
- Bandit (Python-specific)
- SonarQube (multi-language)
- pylint with security checks

**Commands:**

```bash
# Bandit deep scan
bandit -r src/ app/ \
  -ll \
  -f json \
  --exclude=tests/ \
  > /tmp/bandit_scan.json

# Check for dangerous patterns
bandit -r src/ app/ -ll | grep -E "eval|exec|pickle|yaml.load"

# SonarQube full analysis
sonarqube-scanner \
  -Dsonar.projectKey=sin-solver \
  -Dsonar.sources=src/,app/ \
  -Dsonar.exclusions=tests/**,venv/** \
  -Dsonar.python.coverage.reportPaths=/tmp/coverage.xml

# pylint security checks
pylint src/ app/ \
  --disable=all \
  --enable=W0105,W0702,W0703,W0612 \
  --exit-zero \
  > /tmp/pylint_security.txt
```

**Phase 1a Target (Code Fixes):**
- eval() calls: 0 (was: 3)
- Hardcoded credentials: 0 (was: 5)
- Pickle usage: 0 (was: 2)
- Bandit CRITICAL: 0 (was: 45+)

**Success Criteria:**
- All eval() replaced with json.loads() or ast.literal_eval()
- All hardcoded credentials moved to environment variables
- No pickle deserialization of untrusted data
- All dangerous patterns eliminated

---

### Category 3: Dependency Scanning

**Purpose:** Identify known vulnerabilities in third-party packages

**Tools:**
- pip-audit (official Python audit)
- Safety (vulnerability database)
- Snyk (supply chain security)

**Commands:**

```bash
# pip-audit - comprehensive scan
pip-audit \
  --format json \
  --output /tmp/pip_audit_report.json \
  > /tmp/pip_audit.txt

# Safety check with detailed report
safety check \
  --json \
  --output json \
  > /tmp/safety_report.json

# Generate requirements report
pip freeze > /tmp/requirements_current.txt
pip list --outdated > /tmp/outdated_packages.txt

# Specific PyYAML check
pip show PyYAML | grep Version
# Expected after Phase 2a: Version 6.0.1 or later
```

**Phase 2a Target (Dependency Updates):**
- PyYAML: 5.3.1 → 6.0.1+ (fixes CVE-2020-14343)
- Total CVEs: 8 → 0
- Known vulnerabilities: HIGH 7 → 0

**Success Criteria:**
```bash
# After upgrades, should show zero vulnerabilities
pip-audit 2>&1 | grep -i "found 0\|no known"
safety check 2>&1 | grep -i "passed\|no vulnerabilities"
```

---

### Category 4: Container Security Testing

**Purpose:** Verify container images are hardened and vulnerability-free

**Tools:**
- Trivy (container scanner)
- Clair (container analysis)
- Grype (vulnerability database)

**Commands:**

```bash
# Trivy image scan
trivy image \
  --severity CRITICAL,HIGH \
  --format json \
  --output /tmp/trivy_report.json \
  [image-name:tag]

# Trivy detailed scan
trivy image --severity HIGH,CRITICAL [image-name]

# Clair analysis
clair-scanner \
  -c http://clair:6060 \
  [image-name:tag]

# Grype scan
grype [image-name:tag] \
  -o json \
  > /tmp/grype_report.json

# Check image layers
docker inspect [image-id] | jq '.RootFS.Layers'

# Check image size
docker images [image-name] --format "{{.Size}}"
```

**Phase 1b Target (Container Hardening):**
- CRITICAL vulns in image: 0 (was: varies by base image)
- HIGH vulns in image: ≤2 (was: varies)
- Image size: <500MB
- Base image: Alpine 3.19 or similar (minimal)

**Success Criteria:**
```bash
# After hardening
trivy image --severity CRITICAL [image-name] | grep "found 0\|No vulnerabilities"
docker images [image-name] | awk '{print $7}' # Should be <500MB
```

---

### Category 5: Network Security Testing

**Purpose:** Verify network hardening and proper encryption

**Tools:**
- nmap (port scanning)
- netcat (connectivity testing)
- curl with SSL/TLS verification
- tcpdump (network packet capture)
- openssl (certificate validation)

**Commands:**

```bash
# Scan open ports
nmap -sV localhost
nmap -p 1-65535 localhost | grep open

# Test HTTP redirect to HTTPS
curl -v http://localhost:8000 2>&1 | grep -i "location\|301\|302"
# Expected: 301/302 redirect to https://

# Test HTTPS connection
curl -k https://localhost:8000/api/health -v 2>&1 | grep -i "TLS\|certificate\|200 OK"

# Check TLS version (should be 1.2+)
openssl s_client -connect localhost:8000 -tls1 < /dev/null 2>&1 | grep -i "version"

# Verify certificate
openssl x509 -in /path/to/cert.pem -text -noout | grep -E "Subject:|Issuer:|Not Before:|Not After:"

# Test with Vault
curl -k https://172.20.0.31:8000/v1/sys/health | jq .

# Network traffic capture (verify encryption)
tcpdump -i docker0 -A 'host 172.20.0.31' -w /tmp/vault_traffic.pcap
# Verify: No cleartext credentials in pcap
tcpdump -r /tmp/vault_traffic.pcap | grep -i "password\|token\|api_key"
# Expected: No matches (traffic is encrypted)

# SSL Labs test
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=[domain]
# Expected: Grade A or higher
```

**Phase 1c Target (Network Security):**
- HTTP → HTTPS redirect: Enabled (301/302)
- TLS version: 1.2 or higher
- Certificate validity: Not expired
- Cleartext credentials in traffic: 0
- SSL Labs grade: A or higher

**Success Criteria:**
```bash
# After HTTPS implementation
curl -I http://localhost:8000 2>&1 | grep -i "301\|302"  # Verify redirect
curl -k https://localhost:8000/api/health 2>&1 | grep "200\|healthy"  # Verify HTTPS works
```

---

### Category 6: Authentication & Authorization Testing

**Purpose:** Verify access controls are properly enforced

**Tests:**
1. Invalid token rejection
2. Expired token rejection
3. Scope/permission enforcement
4. Privilege boundary validation
5. Session management

**Commands:**

```bash
# Test 1: Invalid token rejection
curl -X GET http://localhost:8000/api/protected \
  -H "Authorization: Bearer invalid_token_xyz" \
  -w "\nStatus: %{http_code}\n"
# Expected: 401 Unauthorized

# Test 2: Missing token rejection
curl -X GET http://localhost:8000/api/protected \
  -w "\nStatus: %{http_code}\n"
# Expected: 401 Unauthorized

# Test 3: Expired token rejection
curl -X GET http://localhost:8000/api/protected \
  -H "Authorization: Bearer expired_token_2020_01_01" \
  -w "\nStatus: %{http_code}\n"
# Expected: 401 Unauthorized

# Test 4: Token with limited scope
ADMIN_TOKEN="[valid admin token]"
USER_TOKEN="[valid user token with limited scope]"

# Admin operation with admin token (should succeed)
curl -X POST http://localhost:8000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}' \
  -w "\nStatus: %{http_code}\n"
# Expected: 200 OK or 201 Created

# Admin operation with user token (should fail)
curl -X POST http://localhost:8000/api/admin/users \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}' \
  -w "\nStatus: %{http_code}\n"
# Expected: 403 Forbidden

# Test 5: Session timeout
curl -X GET http://localhost:8000/api/user/profile \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nStatus: %{http_code}\n"
# After session timeout, expected: 401 Unauthorized
```

**Success Criteria:**
- Invalid tokens: 100% rejected (401)
- Expired tokens: 100% rejected (401)
- Insufficient privileges: 100% rejected (403)
- Valid tokens: 100% accepted
- Session timeout: Works correctly

---

### Category 7: Infrastructure & Configuration Testing

**Purpose:** Verify infrastructure hardening (Docker, resource limits, etc.)

**Checks:**

```bash
# Check Docker security options
docker inspect [container-id] | jq '.HostConfig | {
  Privileged,
  CapAdd,
  CapDrop,
  ReadonlyRootfs,
  SecurityOpt,
  Memory,
  MemorySwap,
  CpuQuota,
  CpuShares
}'

# Expected:
# - Privileged: false
# - CapAdd: [] (no capability additions)
# - CapDrop: ["ALL"] or similar
# - ReadonlyRootfs: false (ok if not true)
# - Memory limits: set (e.g., 1073741824 = 1GB)
# - CPU limits: set

# Check resource limits
docker stats --no-stream [container-id]
# Expected: Memory <1GB, CPU <100%

# Check port mappings (no unnecessary ports exposed)
docker port [container-id]
# Expected: Only necessary ports (8000 for API, etc.)

# Check volume mounts (no host root access)
docker inspect [container-id] | jq '.Mounts'
# Expected: Isolated volumes, no /:/

# Check environment variables (no secrets)
docker inspect [container-id] | jq '.Config.Env'
# Expected: No API_KEY, PASSWORD, or DATABASE_URL values

# Check Docker Compose security
grep -E "privileged|cap_add|cap_drop|read_only|mem_limit|cpus" docker-compose.yml
# Expected: Proper security options present
```

**Phase 1b Target (Infrastructure):**
- Privileged containers: 0
- Exposed root filesystem: 0
- Exposed unnecessary ports: 0
- Memory limits: Enforced
- CPU limits: Enforced
- Secrets in environment: 0

**Success Criteria:**
```bash
# Security scoring script
PRIVCOUNT=$(docker inspect [container-id] | jq '.HostConfig.Privileged' | grep true | wc -l)
[ "$PRIVCOUNT" -eq 0 ] && echo "✓ No privileged containers" || echo "✗ Found privileged containers"
```

---

### Category 8: Compliance & Audit Logging Testing

**Purpose:** Verify logging, monitoring, and audit trails

**Tests:**

```bash
# Check audit logs exist
docker logs [container-id] 2>&1 | grep -i "audit\|access\|auth" | head -20

# Verify log format (structured logging)
docker logs [container-id] 2>&1 | head -5 | jq . 2>/dev/null || echo "Non-JSON logs"

# Check log retention
docker inspect [container-id] | jq '.LogDriver'
# Expected: "json-file" or similar

# Check log size limits
docker inspect [container-id] | jq '.HostConfig.LogConfig'
# Expected: max-size and max-file set

# Verify audit entries for sensitive operations
docker logs [container-id] 2>&1 | grep -i "vault\|secret\|key\|password" | grep -i "access\|read\|write"

# Test logging of failed auth attempts
# Make intentional failed auth attempts and verify logging
for i in {1..5}; do
  curl -X GET http://localhost:8000/api/protected \
    -H "Authorization: Bearer invalid_token_$i" \
    2>/dev/null
done

# Verify failed attempts logged
docker logs [container-id] 2>&1 | grep -i "invalid\|unauthorized\|401" | wc -l
# Expected: ≥5 entries

# Check monitoring integration
# Verify alerts are set up
docker logs monitoring-agent 2>&1 | grep -i "alert\|alarm\|threshold"

# Test monitoring trigger
# Intentionally cause an error and verify alert fires
curl -X GET http://localhost:8000/api/nonexistent
# Verify monitoring alert triggered within 30 seconds
```

**Phase 2c Target (Compliance & Monitoring):**
- All actions logged: ✓
- Audit trail immutable: ✓
- Log retention: 90 days minimum
- Failed auth attempts logged: 100%
- Monitoring alerts: Configured
- Alert response time: <1 minute

**Success Criteria:**
```bash
# Verify structured logging
docker logs [container-id] 2>&1 | head -1 | jq . && echo "✓ JSON logging" || echo "✗ Non-JSON logs"

# Verify failed auth logging
AUTH_FAILURES=$(docker logs [container-id] 2>&1 | grep -i "401\|unauthorized" | wc -l)
[ "$AUTH_FAILURES" -gt 0 ] && echo "✓ Auth failures logged" || echo "✗ No auth logs"
```

---

### Category 9: Load Testing & Performance Validation

**Purpose:** Verify security fixes don't cause excessive performance degradation

**Tools:**
- Apache Bench (ab)
- Locust (Python load testing)
- wrk (HTTP benchmarking)

**Baseline Test (Before Fixes):**

```bash
# Simple request baseline
ab -n 1000 -c 10 http://localhost:8000/api/health

# Expected baseline results:
# Requests per second: 250
# Mean time per request: 40ms
# 95th percentile (Time per request): 85ms
# 99th percentile (Time per request): 120ms

# Save baseline
ab -n 1000 -c 10 -g /tmp/baseline.tsv http://localhost:8000/api/health
```

**After-Fixes Test (Target: ≤5% degradation):**

```bash
# Same test after security fixes
ab -n 1000 -c 10 http://localhost:8000/api/health

# Expected results (≤5% slower than baseline):
# Requests per second: ≥240 (95% of 250)
# Mean time per request: ≤42ms (105% of 40ms)
# 95th percentile: ≤90ms (106% of 85ms)

# Save after-fix results
ab -n 1000 -c 10 -g /tmp/after_fixes.tsv http://localhost:8000/api/health

# Compare results
echo "Baseline RPS: 250, After-fix RPS: $(extract_rps_from_results)"
echo "Degradation: $(calculate_percentage_difference)"
```

**Locust Load Test (Concurrent Users):**

```python
# save as load_test.py
from locust import HttpUser, task, between
import time

class SINSolverUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def health_check(self):
        """Health check endpoint (common operation)"""
        self.client.get("/api/health")
    
    @task(2)
    def get_task(self):
        """Fetch task (common operation)"""
        self.client.get("/api/task/123")
    
    @task(1)
    def process_task(self):
        """Process task (heavier operation)"""
        self.client.post(
            "/api/task/123/process",
            json={
                "action": "process",
                "data": "x" * 10000  # 10KB payload
            }
        )
    
    def on_start(self):
        """Setup auth token"""
        response = self.client.post("/api/auth/token")
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.client.headers.update(
                {"Authorization": f"Bearer {self.token}"}
            )
```

**Run Locust Test:**

```bash
# Start with 100 users, ramp up by 10/second, run for 10 minutes
locust -f load_test.py \
  --host=http://localhost:8000 \
  --users=100 \
  --spawn-rate=10 \
  --run-time=10m \
  --headless \
  --csv=/tmp/locust_results

# Expected results:
# Average response time: <200ms
# 95th percentile: <500ms
# 99th percentile: <1000ms
# Error rate: <0.5%
# Throughput: ≥100 requests/second
```

**Performance Metrics Collection:**

```bash
# Monitor during load test
docker stats --no-stream [container-id] > /tmp/docker_stats_during_test.txt

# CPU and memory usage during 100 concurrent users
# Expected: CPU <80%, Memory <500MB

# After test, generate report
python3 << 'EOF'
import csv
import statistics

with open('/tmp/locust_results_stats.csv') as f:
    reader = csv.DictReader(f)
    response_times = [float(row['Average Response Time']) for row in reader]
    
print(f"Average Response Time: {statistics.mean(response_times):.0f}ms")
print(f"Median Response Time: {statistics.median(response_times):.0f}ms")
print(f"95th Percentile: {statistics.quantiles(response_times, n=20)[18]:.0f}ms")
EOF
```

**Phase 3 Target (Performance):**
- Degradation vs baseline: ≤5%
- P95 latency: <200ms
- P99 latency: <500ms
- Error rate: <0.5%
- CPU usage (100 users): <80%
- Memory usage (100 users): <500MB

**Success Criteria:**
```bash
# Calculate degradation percentage
BASELINE_RPS=250
AFTER_FIX_RPS=245  # Actual result
DEGRADATION=$(echo "scale=2; (($BASELINE_RPS - $AFTER_FIX_RPS) / $BASELINE_RPS) * 100" | bc)
[ $(echo "$DEGRADATION < 5" | bc) -eq 1 ] && echo "✓ Within 5% degradation" || echo "✗ Exceeds 5% degradation"
```

---

### Category 10: Penetration Testing

**Purpose:** Real-world attack scenarios to verify fix effectiveness

**Phase:** Week 4 (final penetration testing phase)

**Tests:**

#### Test 10a: RCE via eval() Vulnerability

**Vulnerability (Phase 1a should fix this):**
- File: `src/token_injector.py`
- Issue: `eval()` on untrusted token data

**Before Fix (Exploitable):**
```bash
# Payload that would execute OS commands
curl -X POST http://localhost:8000/api/token \
  -H "Content-Type: application/json" \
  -d '{"token": "__import__(\"os\").system(\"id\")"}'

# Expected (VULNERABLE): Executes "id" command
# Result: UID=0(root) GID=0(root) groups=0(root)
```

**After Fix (Protected):**
```bash
# Same payload after fix to json.loads()
curl -X POST http://localhost:8000/api/token \
  -H "Content-Type: application/json" \
  -d '{"token": "__import__(\"os\").system(\"id\")"}'

# Expected (FIXED): JSON parse error
# Result: {"error": "Invalid JSON format"}

# Valid token format should work
curl -X POST http://localhost:8000/api/token \
  -H "Content-Type: application/json" \
  -d '{"token": "{\"user_id\": 123, \"scope\": \"read:tasks\"}"}'

# Expected: {"status": "ok", "token_id": "..."}
```

#### Test 10b: Credential Exposure via HTTP

**Vulnerability (Phase 1c should fix this):**
- Vault exposed on HTTP without TLS
- Credentials transmitted in cleartext

**Before Fix (Vulnerable):**
```bash
# Vault accessible via HTTP (no encryption)
curl http://172.20.0.31:8000/v1/sys/health
# Expected (VULNERABLE): Returns sensitive health data unencrypted

# Capture network traffic
tcpdump -i docker0 -A 'host 172.20.0.31' -w /tmp/vault_http.pcap

# Examine cleartext credentials in traffic
strings /tmp/vault_http.pcap | grep -i "password\|token\|key"
# Expected (VULNERABLE): Finds credentials in plaintext
```

**After Fix (Protected):**
```bash
# HTTP redirects to HTTPS
curl -I http://172.20.0.31:8000/v1/sys/health 2>&1 | grep -i "301\|302"
# Expected (FIXED): 301 Moved Permanently to https://

# HTTPS access works
curl -k https://172.20.0.31:8000/v1/sys/health | jq .
# Expected: JSON response, connection encrypted

# Network traffic is encrypted
tcpdump -i docker0 -A 'host 172.20.0.31' -w /tmp/vault_https.pcap

# Verify no plaintext credentials
strings /tmp/vault_https.pcap | grep -i "password\|token\|Bearer"
# Expected (FIXED): No plaintext credentials found
```

#### Test 10c: Hardcoded Credentials Discovery

**Vulnerability (Phase 1a should fix this):**
- Credentials stored in source code
- Found in git history

**Before Fix (Vulnerable):**
```bash
# Search for hardcoded credentials in code
grep -r "password\|api_key\|secret" src/ app/ --include="*.py" | head -20
# Expected (VULNERABLE): Finds hardcoded values like:
# api_key = "sk-1234567890abcdef"
# database_password = "admin123"

# Search git history for removed credentials
git log -p --all -S "password =" -- src/
# Expected (VULNERABLE): Shows commits with hardcoded passwords

# Search recent commits
git show HEAD~5:src/database.py | grep -i "password"
# Expected (VULNERABLE): Shows hardcoded database password
```

**After Fix (Protected):**
```bash
# Search for hardcoded credentials (should find none in code)
grep -r "password\|api_key\|secret" src/ app/ --include="*.py" | grep -v "^#" | grep -v "test_" | wc -l
# Expected (FIXED): 0 lines (no credentials in code)

# Verify credentials use environment variables
grep -r "os.environ\|getenv" src/ app/ | grep -i "password\|api_key\|secret"
# Expected (FIXED): Shows environment variable access like:
# password = os.environ.get("DATABASE_PASSWORD")
# api_key = os.environ.get("API_KEY")

# Verify git history cleaned (requires git filter-branch or similar)
git log --all --source -- | wc -l
# After cleanup: Commits reduced (credentials removed from history)
```

#### Test 10d: PyYAML Deserialization RCE (CVE-2020-14343)

**Vulnerability (Phase 2a should fix this):**
- PyYAML 5.3.1 vulnerable to untrusted YAML deserialization
- Can execute arbitrary code

**Before Fix (Vulnerable):**
```bash
# Payload that exploits unsafe YAML loading
python3 << 'EOF'
import yaml

# Malicious YAML payload (RCE)
yaml_payload = """
!!python/object/apply:os.system
args: ['id > /tmp/rce_proof.txt']
"""

# Using unsafe YAML load (CVE-2020-14343)
try:
    yaml.load(yaml_payload, Loader=yaml.Loader)
    # Expected (VULNERABLE): Executes "id" command
    # /tmp/rce_proof_proof.txt created with command output
except Exception as e:
    print(f"Error: {e}")
EOF

# Verify RCE occurred
[ -f /tmp/rce_proof.txt ] && echo "✗ RCE SUCCESSFUL" || echo "✓ RCE FAILED (system protected)"
```

**After Fix (Protected):**
```bash
# Verify safe YAML loading
python3 << 'EOF'
import yaml

yaml_payload = """
!!python/object/apply:os.system
args: ['id > /tmp/rce_proof2.txt']
"""

# Using safe YAML loader
try:
    yaml.load(yaml_payload, Loader=yaml.SafeLoader)
    # Expected (FIXED): Raises exception, does not execute code
except yaml.YAMLError as e:
    print(f"✓ YAML parsing blocked: {type(e).__name__}")
EOF

# Verify RCE did NOT occur
[ ! -f /tmp/rce_proof2.txt ] && echo "✓ RCE BLOCKED (system protected)" || echo "✗ Still vulnerable"
```

#### Test 10e: Docker Privilege Escalation

**Vulnerability (Phase 1b should fix this):**
- Containers running as root
- Privileged mode enabled

**Before Fix (Vulnerable):**
```bash
# Check if container runs as root
docker exec [container-id] id
# Expected (VULNERABLE): uid=0(root) gid=0(root)

# Check privileged flag
docker inspect [container-id] | jq '.HostConfig.Privileged'
# Expected (VULNERABLE): true

# Attempt privilege escalation (POC)
docker exec [container-id] cap_get_proc
# Expected (VULNERABLE): Would show CAP_SYS_ADMIN and other dangerous capabilities
```

**After Fix (Protected):**
```bash
# Check user
docker exec [container-id] id
# Expected (FIXED): uid=1000(appuser) gid=1000(appuser)

# Check privileged flag
docker inspect [container-id] | jq '.HostConfig.Privileged'
# Expected (FIXED): false

# Verify dropped capabilities
docker inspect [container-id] | jq '.HostConfig.CapDrop'
# Expected (FIXED): ["ALL"] or similar

# Attempt privilege escalation (should fail)
docker exec [container-id] cap_get_proc
# Expected (FIXED): Permission denied or no capabilities
```

#### Test 10f: Vault Secret Leakage

**Vulnerability (Phase 1a should fix this):**
- Vault token/secrets exposed in error messages or logs

**Before Fix (Vulnerable):**
```bash
# Make request that causes error
curl -X GET http://localhost:8000/api/vault/secret \
  -H "Authorization: Bearer invalid_token"

# Check logs for exposed secrets
docker logs [container-id] 2>&1 | grep -i "vault\|token\|secret" | head -10
# Expected (VULNERABLE): May show vault tokens or API keys in error messages
```

**After Fix (Protected):**
```bash
# Make same request
curl -X GET http://localhost:8000/api/vault/secret \
  -H "Authorization: Bearer invalid_token"

# Check logs for secrets (should sanitize)
docker logs [container-id] 2>&1 | grep -i "vault\|token\|secret"
# Expected (FIXED): Logs sanitized, no actual secrets visible
# Example: "Failed to authenticate token: [REDACTED]"
```

---

## 3. Phase-by-Phase Testing Checklist

### Phase 0 Testing (Week 1, Day 1) - Immediate Actions

- [ ] API keys rotated successfully
- [ ] Old API keys revoked in all systems
- [ ] Vault logs reviewed for unauthorized access
- [ ] Deployment configs verified (no hardcoded secrets)
- [ ] Emergency contacts notified if breach detected
- [ ] Security baseline metrics captured

**Expected Time:** 1 hour  
**Success Criteria:** All checks pass, baseline established

---

### Phase 1a Testing (Week 1, Days 2-3) - Code Security Fixes

**Test Suite 1a-1: eval() Removal**
- [ ] All eval() calls identified (grep results saved)
- [ ] eval() -> json.loads() replacements verified
- [ ] Invalid tokens properly rejected (401 response)
- [ ] Valid tokens still accepted (200 response)
- [ ] RCE payload test fails safely
- [ ] Unit tests pass (>85% coverage)
- [ ] Bandit reports 0 CRITICAL for eval

**Test Suite 1a-2: Credential Removal**
- [ ] Hardcoded credentials removed from src/
- [ ] Credentials removed from app/
- [ ] No credentials in deployment configs
- [ ] All credentials use environment variables
- [ ] git-secrets scan passes (no credentials in history)
- [ ] Docker environment sanitized
- [ ] docker inspect shows no secrets

**Test Suite 1a-3: Code Quality**
- [ ] Bandit scan: 0 CRITICAL issues
- [ ] SonarQube: All CRITICAL rules pass
- [ ] pylint: 0 security issues
- [ ] Code coverage: ≥85%
- [ ] Unit test pass rate: 100%

**Expected Time:** 8 hours (split across days 2-3)  
**Success Criteria:** All test suites pass, 0 CRITICAL issues

---

### Phase 1b Testing (Week 1, Day 4) - Container Security

- [ ] Dockerfile uses non-root user
- [ ] Base image: Alpine 3.19 or minimal
- [ ] No privileged mode in docker-compose
- [ ] Resource limits enforced (memory, CPU)
- [ ] Trivy scan: 0 CRITICAL vulnerabilities
- [ ] Trivy scan: ≤2 HIGH vulnerabilities
- [ ] Image size: <500MB
- [ ] No unnecessary ports exposed
- [ ] No secrets in environment variables
- [ ] Security context enforced

**Expected Time:** 4 hours  
**Success Criteria:** All checks pass, Trivy clean scan

---

### Phase 1c Testing (Week 1, Day 5) - Network Security

- [ ] TLS certificate valid (not expired)
- [ ] TLS version: 1.2 or higher
- [ ] HTTP redirects to HTTPS (301/302)
- [ ] HTTPS connection works (200 response)
- [ ] Network traffic encrypted (tcpdump verification)
- [ ] No cleartext credentials in traffic
- [ ] SSL Labs grade: A or higher
- [ ] Vault TLS enforced
- [ ] All API endpoints HTTPS-only
- [ ] Certificate renewal automated

**Expected Time:** 4 hours  
**Success Criteria:** All endpoints HTTPS, TLS 1.2+, no cleartext data

---

### Phase 2a Testing (Week 2, Day 1) - Dependency Updates

- [ ] PyYAML upgraded to 6.0.1+
- [ ] All dependency CVEs resolved
- [ ] pip-audit: 0 known vulnerabilities
- [ ] Safety check: passes (0 issues)
- [ ] pip freeze: no vulnerable versions
- [ ] YAML deserialization safe (SafeLoader)
- [ ] RCE CVE-2020-14343 fixed
- [ ] No performance regression (≤5%)
- [ ] Unit tests pass with new versions
- [ ] Integration tests pass

**Expected Time:** 3 hours  
**Success Criteria:** All dependencies updated, CVEs resolved

---

### Phase 2b Testing (Week 2, Day 3) - Container Hardening

- [ ] Security policies applied (SELinux/AppArmor)
- [ ] Network policies restrict traffic
- [ ] Container-to-container communication limited
- [ ] Registry scanning enabled
- [ ] Image signing implemented (if applicable)
- [ ] No privileged containers
- [ ] Resource limits enforced
- [ ] Read-only root filesystem (if applicable)
- [ ] Capability dropping configured
- [ ] Security logs generated

**Expected Time:** 5 hours  
**Success Criteria:** All hardening measures implemented

---

### Phase 2c Testing (Week 2, Day 5) - Logging & Monitoring

- [ ] All actions logged
- [ ] Failed auth attempts logged
- [ ] Audit trail immutable
- [ ] Log retention: 90 days minimum
- [ ] Log format: Structured (JSON)
- [ ] Monitoring alerts configured
- [ ] Alert response time: <1 minute
- [ ] SIEM integration working
- [ ] Log analysis dashboards created
- [ ] Compliance reporting automated

**Expected Time:** 5 hours  
**Success Criteria:** Complete logging/monitoring infrastructure

---

### Phase 3 Testing (Week 3-4, Days 1-4) - Advanced Security

- [ ] Secrets management: Vault integration
- [ ] RBAC: All access controls enforced
- [ ] Encryption: Data in transit (TLS)
- [ ] Encryption: Data at rest (if applicable)
- [ ] Backup security: Encrypted backups
- [ ] Backup recovery tested (successful restore)
- [ ] Key rotation: Automated
- [ ] Access logs: Complete and auditable
- [ ] Incident response: Playbook documented
- [ ] Security training: Team updated

**Expected Time:** 20 hours (parallel work)  
**Success Criteria:** All advanced features implemented

---

### Phase 4 Testing (Week 4, Days 1-5) - Compliance & Final Testing

**Penetration Testing (Days 1-3):**
- [ ] RCE via eval() blocked
- [ ] Credential exposure prevented
- [ ] Hardcoded credentials eliminated
- [ ] YAML RCE (CVE-2020-14343) blocked
- [ ] Docker privilege escalation prevented
- [ ] Secret leakage prevented
- [ ] 0 critical findings
- [ ] ≤2 high findings
- [ ] All fixes validated in real-world scenarios

**Compliance & Documentation (Days 4-5):**
- [ ] Internal security audit passed
- [ ] SECURITY.md documentation updated
- [ ] Runbooks created for incident response
- [ ] Security baseline documented (2/10 → 9/10)
- [ ] Final security score: 9/10
- [ ] All vulnerabilities: 0 CRITICAL, ≤2 HIGH
- [ ] Load test: ≥1000 concurrent users
- [ ] Performance: ≤5% degradation
- [ ] All tests automated in CI/CD
- [ ] Sign-off from security team

**Expected Time:** 8 hours  
**Success Criteria:** 0 critical findings, final score 9/10

---

## 4. Success Metrics & Acceptance Criteria

| Metric | Current | Target | Success? |
|--------|---------|--------|----------|
| **Security Score** | 2/10 | 9/10 | ✓ when ≥9 |
| **CRITICAL Vulnerabilities** | 13 | 0 | ✓ when 0 |
| **HIGH Vulnerabilities** | 14 | ≤2 | ✓ when ≤2 |
| **Code Coverage** | 60% | ≥85% | ✓ when ≥85% |
| **Bandit CRITICAL Issues** | 45+ | 0 | ✓ when 0 |
| **CVSS Score Average** | 8.2 | <4.0 | ✓ when <4.0 |
| **Performance Degradation** | Baseline | ≤5% | ✓ when ≤5% |
| **Test Pass Rate** | 92% | 100% | ✓ when 100% |
| **Penetration Test Findings** | Unknown | 0 CRITICAL | ✓ when 0 CRITICAL |
| **Load Test (P95 Latency)** | Unknown | <200ms | ✓ when <200ms |

---

## 5. Tool Installation & Setup

### Install Security Scanning Tools

```bash
# Bandit - Python security linter
pip install bandit
bandit --version

# Safety - Dependency vulnerability checker
pip install safety
safety --version

# pip-audit - PyPI audit tool
pip install pip-audit
pip-audit --version

# SonarQube - Code quality & security (Docker)
docker run -d --name sonarqube \
  -e SONAR_JDBC_URL="jdbc:postgresql://localhost:5432/sonarqube" \
  -e SONAR_JDBC_USERNAME=sonar \
  -e SONAR_JDBC_PASSWORD=sonar \
  -p 9000:9000 \
  sonarqube:latest

# Trivy - Container & image scanning
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
trivy --version

# Apache Bench - Simple load testing
# Already installed on macOS
ab -h | head -5

# Locust - Python load testing framework
pip install locust
locust --version

# OWASP ZAP - Web application security testing (Docker)
docker run --rm -v $(pwd):/zap/wrk:rw -t owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:8000
```

---

## 6. Testing Timeline (4 Weeks)

### Week 1: Phase 0 + Phase 1 Testing
- **Day 1:** Phase 0 execution + verification (1h)
- **Days 2-3:** Phase 1a code fixes testing (8h)
- **Day 4:** Phase 1b container hardening (4h)
- **Day 5:** Phase 1c network security (4h)
- **Total Week 1:** 17 hours

### Week 2: Phase 2 Testing
- **Days 1-2:** Phase 2a dependency updates (3h)
- **Days 3-4:** Phase 2b/2c container + logging (10h)
- **Day 5:** Integration testing (4h)
- **Total Week 2:** 17 hours

### Week 3: Phase 3 Testing
- **Days 1-4:** Advanced security features (20h parallel)
- **Day 5:** Load testing + performance (4h)
- **Total Week 3:** 24 hours

### Week 4: Phase 4 Testing
- **Days 1-3:** Penetration testing (12h)
- **Days 4-5:** Compliance audit + documentation (8h)
- **Total Week 4:** 20 hours

**Total Testing Effort:** ~78 hours (4 weeks, full parallel execution)

---

## 7. Critical Success Factors

✓ **Automated Testing:** All tests must be runnable in CI/CD  
✓ **Clear Success Criteria:** Pass/fail metrics defined  
✓ **Real-World Payloads:** Penetration tests use actual exploit code  
✓ **Performance Monitoring:** Measure before and after each phase  
✓ **Documentation:** Every test result documented  
✓ **Repeatability:** All tests must produce consistent results  
✓ **Security Review:** Independent review of all fixes  

---

## 8. References & Resources

**Security Testing Frameworks:**
- OWASP Testing Guide: https://owasp.org/www-project-web-security-testing-guide/
- NIST SP 800-115: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-115.pdf
- CWE Top 25: https://cwe.mitre.org/top25/

**Tools Documentation:**
- Bandit: https://bandit.readthedocs.io/
- Trivy: https://github.com/aquasecurity/trivy
- SonarQube: https://docs.sonarqube.org/
- Locust: https://locust.io/

**Standards & Compliance:**
- CVSS Calculator: https://www.first.org/cvss/calculator/3.1
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP API Top 10: https://owasp.org/www-project-api-security/

---

**Document Created:** 2026-01-29  
**Version:** 1.0  
**Status:** Complete and Ready for Testing Execution
