# Security Vulnerability Issue Template

## Overview

This template standardizes how security vulnerabilities are reported, tracked, and resolved in the SIN-Solver project. All security issues must follow this format to ensure consistent triage, remediation, and documentation.

---

## Issue Title Format

Use the following format for all security issue titles:

```
[SEVERITY] Component: Brief Description
```

### Examples

- `[CRITICAL] token_injector.py: Remote Code Execution via eval()`
- `[HIGH] docker-compose.yml: Vault Service Exposed on HTTP (No TLS)`
- `[CRITICAL] init_master_user.py: Hardcoded Master Database Password`
- `[HIGH] requirements.txt: PyYAML 5.3.1 Contains Known CVE-2020-14343`

---

## Required Fields (Complete All)

### 1. Severity Level

**Options:** CRITICAL | HIGH | MEDIUM | LOW

| Level | CVSS Score | Impact | Resolution Time |
|-------|-----------|--------|-----------------|
| CRITICAL | 9.0-10.0 | System compromise, data breach, RCE | Immediate (< 1 hour) |
| HIGH | 7.0-8.9 | Significant security risk, bypass | Same day (< 8 hours) |
| MEDIUM | 4.0-6.9 | Moderate security issue | Within 1 week |
| LOW | 0.1-3.9 | Minor security concern | Within 2 weeks |

**Instructions:** Select the appropriate level based on CVSS score (see field #2).

---

### 2. CVSS Score

**Calculate at:** https://www.first.org/cvss/calculator/3.1

**Example CVSS String:**
```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Score: 9.8 (CRITICAL)
```

**Components to Assess:**
- **AV (Attack Vector):** N=Network, A=Adjacent, L=Local, P=Physical
- **AC (Attack Complexity):** L=Low, H=High
- **PR (Privileges Required):** N=None, L=Low, H=High
- **UI (User Interaction):** N=None, R=Required
- **S (Scope):** U=Unchanged, C=Changed
- **C (Confidentiality):** N=None, L=Low, H=High
- **I (Integrity):** N=None, L=Low, H=High
- **A (Availability):** N=None, L=Low, H=High

---

### 3. Component

**Select one:**
- `Code` - Python/JavaScript source code
- `Container` - Docker container configuration
- `Docker` - Docker image or docker-compose
- `Dependencies` - Third-party libraries/packages
- `Network` - Network exposure, firewall rules
- `Infrastructure` - Server configuration, access controls
- `Configuration` - Config files, environment variables

---

### 4. Vulnerability Type

**Select one (primary type):**

| Type | Description | Examples |
|------|-------------|----------|
| RCE | Remote Code Execution | eval(), exec(), arbitrary command execution |
| Auth | Authentication/Authorization bypass | Weak password, no authentication, privilege escalation |
| Data Exposure | Sensitive data leak | Credentials in logs, unencrypted storage, exposed APIs |
| Crypto | Cryptography weakness | Weak algorithms, hardcoded keys, predictable randomness |
| Config | Configuration issue | Exposed ports, missing security headers, verbose error messages |
| Container | Container security issue | Privileged containers, no resource limits, vulnerable base images |
| Network | Network/Transport security | HTTP instead of HTTPS, no encryption, open ports |
| Supply Chain | Dependency vulnerability | Outdated packages with known CVEs, malicious packages |
| Access Control | Insufficient access controls | Missing input validation, no rate limiting, directory traversal |
| Secrets | Hardcoded secrets | API keys, passwords, tokens in code or config |

---

### 5. Affected Files/Lines

**List all affected files with line numbers:**

```
File: src/core/token_injector.py
  - Line 45-50: Vulnerable eval() call
  - Line 100-105: Unsafe pickle deserialization
  
File: docker-compose.yml
  - Line 12: Vault service without TLS
  - Line 25: Redis without password
  
File: app/config/init_master_user.py
  - Line 8: Hardcoded database password
  - Line 15: Hardcoded API key
```

---

### 6. Detailed Description

Provide a clear, technical explanation of the vulnerability:

```markdown
## What is the vulnerability?

[Explain the security flaw in clear terms]

## Why is it a problem?

[Describe the potential impact]

## Who could exploit it?

[Explain the attack surface and threat actors]

## What is the root cause?

[Technical explanation of why the vulnerability exists]
```

---

### 7. Proof of Concept (POC)

**Demonstrate the vulnerability with executable code or commands:**

#### Example 1: RCE via eval()

```python
# Vulnerable code (token_injector.py, line 45)
def parse_token(token_string):
    data = eval(token_string)  # VULNERABLE!
    return data

# POC Exploit
malicious_token = "__import__('os').system('whoami')"
parse_token(malicious_token)  # Executes arbitrary command
```

**To verify:**
```bash
cd /Users/jeremy/dev/SIN-Solver
python3 -c "
import sys
sys.path.insert(0, 'src')
from core.token_injector import parse_token
malicious_token = \"__import__('os').system('id')\"
parse_token(malicious_token)
"
```

#### Example 2: Vault HTTP Exposure

```bash
# Verify vulnerability
curl -v http://172.20.0.31:8000/v1/secret/list 2>&1 | grep -i "protocol"
# Expected: HTTP/1.1 (no TLS/SSL)

# Capture traffic
tcpdump -i docker0 -A 'host 172.20.0.31 and port 8000' | grep -i "bearer"
# Shows tokens in plaintext
```

#### Example 3: Hardcoded Credentials

```bash
# Search for hardcoded secrets
grep -r "password\|api_key\|token" app/config/init_master_user.py

# Find in git history
git log -p --all -S "password=" -- app/config/init_master_user.py

# Examine specific line
sed -n '8p;15p' app/config/init_master_user.py
```

#### Example 4: Vulnerable Dependency

```bash
# Check PyYAML version
pip show PyYAML | grep Version
# Output: Version: 5.3.1

# Verify CVE
pip install safety
safety check --json | grep -i "pyyaml"

# Or using pip audit
pip-audit --desc | grep -i "pyyaml"

# POC for CVE-2020-14343 (YAML deserialization)
python3 -c "
import yaml
malicious_yaml = '!!python/object/apply:os.system [\"whoami\"]'
yaml.load(malicious_yaml, Loader=yaml.FullLoader)  # RCE!
"
```

---

### 8. Fix Instructions

**Provide step-by-step remediation with code examples:**

#### Fix for RCE (eval() vulnerability)

```python
# BEFORE (Vulnerable)
def parse_token(token_string):
    data = eval(token_string)
    return data

# AFTER (Fixed)
import json
from jsonschema import validate

TOKEN_SCHEMA = {
    "type": "object",
    "properties": {
        "user_id": {"type": "integer"},
        "timestamp": {"type": "string"},
        "signature": {"type": "string"}
    },
    "required": ["user_id", "timestamp", "signature"]
}

def parse_token(token_string):
    try:
        data = json.loads(token_string)
        validate(instance=data, schema=TOKEN_SCHEMA)
        return data
    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(f"Invalid token format: {e}")
```

**Test the fix:**
```bash
python3 -c "
import json
# This will fail safely (as intended)
malicious = '__import__(\"os\").system(\"whoami\")'
try:
    json.loads(malicious)
except json.JSONDecodeError as e:
    print(f'Protected: {e}')
"
```

#### Fix for Vault HTTP Exposure

```yaml
# BEFORE (Vulnerable - docker-compose.yml, line 12)
  vault:
    image: vault:latest
    ports:
      - "8000:8200"  # HTTP only!
    environment:
      VAULT_ADDR: http://0.0.0.0:8200

# AFTER (Fixed - with TLS)
  vault:
    image: vault:latest
    ports:
      - "8000:8200"
    environment:
      VAULT_ADDR: https://0.0.0.0:8200
      VAULT_CONFIG: /vault/config/vault.hcl
    volumes:
      - ./certs:/vault/certs:ro
      - ./config:/vault/config:ro
    command: vault server -config=/vault/config/vault.hcl
```

**Vault configuration file (vault.hcl):**
```hcl
storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/vault/certs/tls.crt"
  tls_key_file  = "/vault/certs/tls.key"
  tls_min_version = "tls12"
}

api_addr = "https://127.0.0.1:8200"
ui = true
```

**Test the fix:**
```bash
# Generate self-signed cert
openssl req -x509 -newkey rsa:4096 -keyout certs/tls.key -out certs/tls.crt -days 365 -nodes

# Restart Vault with TLS
docker-compose restart vault

# Verify TLS is enabled
curl -k -v https://172.20.0.31:8000/v1/sys/health 2>&1 | grep -i "tls\|ssl"
# Expected: "SSL/TLS connection established"
```

#### Fix for Hardcoded Credentials

```python
# BEFORE (Vulnerable - init_master_user.py)
import os
DATABASE_PASSWORD = "SuperSecretPassword123!"
API_KEY = "sk-1234567890abcdef"

def initialize():
    connection = db.connect(
        host="localhost",
        password=DATABASE_PASSWORD,  # Hardcoded!
        database="vault"
    )

# AFTER (Fixed - using environment variables)
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD')
API_KEY = os.getenv('API_KEY')

if not DATABASE_PASSWORD or not API_KEY:
    raise ValueError("Required environment variables not set: DATABASE_PASSWORD, API_KEY")

def initialize():
    connection = db.connect(
        host=os.getenv('DATABASE_HOST', 'localhost'),
        password=DATABASE_PASSWORD,
        database=os.getenv('DATABASE_NAME', 'vault')
    )
    if not connection:
        raise ConnectionError("Failed to establish database connection")
    return connection
```

**.env file (add to .gitignore):**
```bash
DATABASE_PASSWORD=secure_password_123
API_KEY=sk-real_api_key_123
DATABASE_HOST=localhost
DATABASE_NAME=vault
```

**.gitignore update:**
```bash
echo ".env" >> .gitignore
echo "*.env.local" >> .gitignore
git rm --cached .env  # Remove from git history if committed
```

**Test the fix:**
```bash
# Verify no secrets in code
grep -r "password\|api_key\|token" app/config/init_master_user.py
# Should return no hardcoded values

# Verify environment variables work
export DATABASE_PASSWORD="test"
export API_KEY="test-key"
python3 -c "from app.config.init_master_user import initialize; initialize()"
```

#### Fix for Vulnerable Dependencies

```bash
# BEFORE: requirements.txt with vulnerable PyYAML
PyYAML==5.3.1  # Contains CVE-2020-14343

# AFTER: Upgrade to patched version
PyYAML==6.0.1  # Fixed: CVE-2020-14343

# Apply the fix
pip install --upgrade PyYAML==6.0.1

# Update requirements.txt
pip freeze > requirements.txt

# Verify the fix
pip show PyYAML | grep Version
# Expected: Version: 6.0.1

# Run security audit
pip-audit
# Should show: No known security vulnerabilities found
```

**Additional safety checks:**
```bash
# Check for other vulnerable packages
safety check

# Use requirements-audit if pip-audit unavailable
pip install pip-audit
pip-audit --desc | head -20

# Compare before/after CVSS scores
bandit -r src/ -f json > /tmp/bandit_after.json
```

---

### 9. Acceptance Criteria

**Vulnerability is considered FIXED when:**

```markdown
- [ ] Code changes applied and tested
- [ ] All related files updated
- [ ] No hardcoded secrets remain (grep search confirms)
- [ ] Environment variables properly configured
- [ ] Unit tests pass (pytest --cov ≥ 85%)
- [ ] Integration tests pass against fixed code
- [ ] Security scan shows vulnerability resolved
  - Bandit: No critical issues in affected code
  - Safety/pip-audit: No known CVEs in dependencies
- [ ] Code reviewed by at least 1 security team member
- [ ] Changes committed with security audit reference
- [ ] Documentation updated (SECURITY.md)
- [ ] Vulnerability marked as "Resolved" in issue tracker
- [ ] No performance regression (< 5% latency increase)
- [ ] Monitoring/alerts configured for this vulnerability type
```

---

### 10. Dependencies

**List which tasks must be completed before this issue:**

```markdown
## Blocking Issues
- None (if independent)

## Related Issues
- [ ] Issue #001: Security audit completion
- [ ] Issue #002: Code review infrastructure setup
- [ ] Issue #003: CI/CD security scanning integration

## Phase Dependencies (from PHASE-7-REMEDIATION-ROADMAP.md)
- Phase: Phase 1a (Code Security Fixes)
- Task: Task 1.1 (Remove eval() calls)
- Effort: 2 hours
- Cost: $300
- Timeline: Week 1

## Blocked By
- [ ] None
```

---

### 11. Effort Estimate

**Time and cost estimation:**

```markdown
## Development Time
- Code changes: 1 hour
- Testing: 30 minutes
- Code review: 30 minutes
- Documentation: 15 minutes
**Total: 2.25 hours**

## Cost Estimation
- Rate: $150/hour (security engineer)
- Cost: $337.50
- Budget allocation: Phase 1a, Category: Code Security

## Dependencies on Other Issues
- Must wait for: None
- Can proceed in parallel with: RCE vulnerability fixes

## Critical Path
- Is this on critical path? YES
- Blocks deployment? YES (CRITICAL vulnerability)
- Must be resolved before Phase 2 starts? YES
```

---

### 12. Additional Context

**Provide any relevant background information:**

```markdown
## First Discovered
- Date: [when found]
- Method: [security audit, bug report, code review]
- Discovered By: [team member or tool]

## Similar Vulnerabilities
- CVE-2016-3945: Similar RCE in older versions
- CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code

## References
- OWASP A04:2021 - Insecure Deserialization
- CWE-95: https://cwe.mitre.org/data/definitions/95.html
- CVSS Calculator: https://www.first.org/cvss/calculator/3.1
- Vulnerable Code Pattern: https://owasp.org/www-community/Code_Injection

## Business Impact
- Risk to users: [High/Medium/Low]
- Data at risk: [types of data]
- Service impact: [which services affected]
- Potential breach cost: [estimated $]
```

---

## Real-World Examples

### EXAMPLE 1: CRITICAL - Remote Code Execution in token_injector.py

```
Title: [CRITICAL] token_injector.py: Remote Code Execution via eval()

Severity Level: CRITICAL
CVSS Score: 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
Component: Code
Vulnerability Type: RCE

Affected Files/Lines:
  - src/core/token_injector.py (lines 45-50)
  - src/core/token_injector.py (lines 100-105)

Description:
The token_injector module uses eval() to parse incoming token data without
validation. This allows attackers to execute arbitrary Python code on the
server. Any external input that reaches parse_token() can trigger RCE.

POC:
def parse_token(token_string):
    data = eval(token_string)  # VULNERABLE
    return data

# Attack
malicious = "__import__('os').system('rm -rf /')"
parse_token(malicious)

Acceptance Criteria:
  - [ ] eval() call replaced with json.loads()
  - [ ] Input validation schema implemented
  - [ ] Unit tests pass (no bypasses possible)
  - [ ] Bandit scan shows 0 critical issues
  - [ ] Security review approved

Phase: Phase 1a
Effort: 2 hours
Cost: $300
Timeline: Week 1
```

---

### EXAMPLE 2: HIGH - Vault Service Exposed on HTTP

```
Title: [HIGH] docker-compose.yml: Vault Service Exposed on HTTP (No TLS)

Severity Level: HIGH
CVSS Score: 8.1 (CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H)
Component: Container
Vulnerability Type: Network

Affected Files/Lines:
  - docker-compose.yml (lines 12-20)
  - infrastructure/vault-config.hcl (missing TLS settings)

Description:
Vault API is exposed on HTTP without TLS encryption on the internal network.
Tokens and secrets transmitted over HTTP can be intercepted by network attackers
on the same network segment (172.20.0.0/16).

POC:
# Verify HTTP exposure
curl -v http://172.20.0.31:8000/v1/sys/health

# Capture unencrypted token
tcpdump -i docker0 -A 'host 172.20.0.31' | grep "X-Vault-Token"

Acceptance Criteria:
  - [ ] Vault listens on HTTPS only (port 8200)
  - [ ] TLS certificates installed and valid
  - [ ] HTTP redirects to HTTPS
  - [ ] curl -k https://... returns 200 OK
  - [ ] No sensitive data in logs

Phase: Phase 1c
Effort: 3 hours
Cost: $450
Timeline: Week 1
```

---

### EXAMPLE 3: CRITICAL - Hardcoded Master Database Password

```
Title: [CRITICAL] init_master_user.py: Hardcoded Master Database Password

Severity Level: CRITICAL
CVSS Score: 9.1 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
Component: Code
Vulnerability Type: Secrets

Affected Files/Lines:
  - app/config/init_master_user.py (line 8)
  - app/config/init_master_user.py (line 15)

Description:
Master database password and API keys are hardcoded in source code. These
credentials grant full access to the database and external APIs. Exposed in:
- GitHub repository (if public)
- Docker images (layered, visible with docker history)
- Deployment logs
- Developer machine backups

POC:
grep "password" app/config/init_master_user.py
# Returns: DATABASE_PASSWORD = "SuperSecretPassword123!"

# Extract from Docker image
docker run --rm [image] cat app/config/init_master_user.py | grep password

Acceptance Criteria:
  - [ ] All hardcoded credentials removed
  - [ ] Credentials moved to environment variables
  - [ ] .env added to .gitignore
  - [ ] Credentials rotated in all systems
  - [ ] No passwords in git history (git log search)
  - [ ] Secret scanning passed (git secrets, TruffleHog)

Phase: Phase 1a
Effort: 2 hours
Cost: $300
Timeline: Week 1
```

---

### EXAMPLE 4: HIGH - PyYAML Contains Known CVE-2020-14343

```
Title: [HIGH] requirements.txt: PyYAML 5.3.1 Contains Known CVE-2020-14343

Severity Level: HIGH
CVSS Score: 7.8 (CVSS:3.1/AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H)
Component: Dependencies
Vulnerability Type: Supply Chain

Affected Files/Lines:
  - requirements.txt (line with PyYAML==5.3.1)
  - All code that calls yaml.load() with FullLoader
  - Docker images built with this requirements.txt

Description:
PyYAML 5.3.1 allows arbitrary code execution through YAML deserialization
when using yaml.load() with FullLoader. Attackers can craft malicious YAML
files that execute arbitrary Python code.

CVE: CVE-2020-14343
CWE: CWE-502 (Deserialization of Untrusted Data)
Base Score: 7.8
Vector: CVSS:3.1/AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H

POC:
import yaml
malicious_yaml = '''
!!python/object/apply:os.system
args: ["whoami"]
'''
yaml.load(malicious_yaml, Loader=yaml.FullLoader)  # RCE!

Affected Code Pattern:
data = yaml.load(user_input)  # VULNERABLE if input is malicious

Acceptance Criteria:
  - [ ] PyYAML upgraded to 6.0.1 or later
  - [ ] requirements.txt updated
  - [ ] pip-audit shows no CVEs
  - [ ] All yaml.load() uses safe_load or explicit Loader=yaml.SafeLoader
  - [ ] No YAML files loaded from untrusted sources
  - [ ] Docker image rebuilt with new requirements
  - [ ] pip show PyYAML confirms version 6.0.1+

Phase: Phase 2a
Effort: 1.5 hours
Cost: $225
Timeline: Week 2

Verification Commands:
pip install PyYAML==6.0.1
pip audit
pip show PyYAML
grep -r "yaml.load(" src/ --include="*.py"
```

---

## GitHub Labels Configuration

**Add these labels to your GitHub repository:**

### Severity Labels
```
severity:critical    - Color: #d73a49 (red)
severity:high        - Color: #f34235 (orange-red)
severity:medium      - Color: #ffc107 (orange)
severity:low         - Color: #4caf50 (green)
```

### Type Labels
```
type:rce             - Color: #d73a49 (Remote Code Execution)
type:auth            - Color: #e91e63 (Authentication/Authorization)
type:data-exposure   - Color: #9c27b0 (Data exposure)
type:crypto          - Color: #673ab7 (Cryptography)
type:config          - Color: #3f51b5 (Configuration)
type:container       - Color: #2196f3 (Container security)
type:network         - Color: #00bcd4 (Network/Transport)
type:supply-chain    - Color: #009688 (Dependencies)
type:access-control  - Color: #4caf50 (Access control)
type:secrets         - Color: #ff5722 (Hardcoded secrets)
```

### Status Labels
```
status:open          - Color: #ffffff (Open/Unresolved)
status:in-progress   - Color: #fdd835 (Being worked on)
status:review        - Color: #4fc3f7 (Code review)
status:done          - Color: #66bb6a (Resolved)
```

### Phase Labels
```
phase:0              - Phase 0 (Immediate)
phase:1a             - Phase 1a (Code fixes)
phase:1b             - Phase 1b (Container)
phase:1c             - Phase 1c (Network)
phase:2a             - Phase 2a (Dependencies)
phase:2b             - Phase 2b (Hardening)
phase:2c             - Phase 2c (Logging)
phase:3              - Phase 3 (Advanced)
phase:4              - Phase 4 (Compliance)
```

### Priority Labels
```
priority:p0          - Color: #d73a49 (Highest - Security critical)
priority:p1          - Color: #f34235 (High - Block release)
priority:p2          - Color: #ffc107 (Medium - Should fix)
priority:p3          - Color: #4caf50 (Low - Nice to have)
```

---

## Workflow & Process

### Step 1: Create Issue
1. Click "New Issue" on GitHub
2. Copy this template
3. Fill in all required fields
4. Add appropriate labels (severity, type, phase)
5. Assign to security team member

### Step 2: Triage
1. Security lead reviews within 24 hours
2. Sets severity and CVSS score
3. Estimates effort and assigns to Phase
4. Updates timeline
5. Moves to "In Progress"

### Step 3: Development
1. Developer follows "Fix Instructions" section
2. Creates feature branch: `fix/security-[issue-number]`
3. Implements all code changes
4. Adds/updates unit tests
5. Updates documentation

### Step 4: Testing
1. Run security scans (Bandit, Safety, pip-audit)
2. Execute integration tests
3. Performance testing (< 5% regression)
4. Verify all acceptance criteria met
5. Move to "Review"

### Step 5: Code Review
1. At least 1 security team member reviews
2. Verifies all acceptance criteria
3. Approves and merges to main
4. Closes issue
5. Documents in SECURITY.md

### Step 6: Verification
1. Security scan passes in CI/CD
2. No new CVEs introduced
3. Performance baseline maintained
4. Documentation updated

---

## Reference Links

### CVSS & Scoring
- **CVSS Calculator:** https://www.first.org/cvss/calculator/3.1
- **CVSS Specification:** https://www.first.org/cvss/v3.1/specification-document
- **CVSS Examples:** https://www.first.org/cvss/examples

### Security Resources
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **CWE List:** https://cwe.mitre.org/
- **NIST Framework:** https://www.nist.gov/cyberframework
- **SANS Top 25:** https://www.sans.org/top25-software-errors/

### Tools
- **Bandit (Python security):** https://bandit.readthedocs.io/
- **Safety (Dependency audit):** https://safety.readthedocs.io/
- **pip-audit (Pip package audit):** https://github.com/pypa/pip-audit
- **Trivy (Container scanning):** https://github.com/aquasecurity/trivy
- **Snyk (Vulnerability scanning):** https://snyk.io/

### Remediation
- **OWASP Remediation Guide:** https://owasp.org/www-project-web-security-testing-guide/
- **Python Security Best Practices:** https://python.readthedocs.io/en/latest/library/security_warnings.html
- **Docker Security:** https://docs.docker.com/engine/security/

---

## Document Metadata

```
Document Version: 1.0
Last Updated: 2026-01-29
Author: Security Team
Related Documents: PHASE-7-REMEDIATION-ROADMAP.md, PHASE-7-SECURITY-TESTING.md
Repository: https://github.com/[username]/SIN-Solver
Template Location: docs/SECURITY-ISSUE-TEMPLATE.md
```
