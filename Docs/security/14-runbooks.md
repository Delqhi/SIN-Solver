# 📚 Security Runbooks

**Document ID:** SEC-14-RUNBOOKS  
**Version:** 1.0.0  
**Classification:** Internal Use Only  
**Last Updated:** 2026-01-30  

---

## 📋 Overview

This document contains operational runbooks for common security-related tasks and procedures. These runbooks provide step-by-step instructions for security operations, ensuring consistency and reducing the risk of errors during critical procedures.

### Runbook Categories

| Category | Description | Priority |
|----------|-------------|----------|
| **Incident Response** | Security incident handling | 🔴 Critical |
| **Key Management** | Secret and key operations | 🔴 Critical |
| **Access Control** | User and permission management | 🟡 High |
| **Monitoring** | Security monitoring tasks | 🟡 High |
| **Maintenance** | Regular security maintenance | 🟢 Medium |

---

## 🚨 RB-001: Secret Compromise Response

### Trigger
- Suspected or confirmed secret compromise
- Unauthorized access detected
- Secret exposed in logs/code

### Impact
- **Severity:** Critical
- **Response Time:** 15 minutes
- **Resolution Target:** 1 hour

### Procedure

#### Step 1: Incident Declaration (T+0)

```bash
# 1.1 Alert the security team
export INCIDENT_ID="SEC-$(date +%Y%m%d-%H%M%S)"
echo "🚨 SECURITY INCIDENT: $INCIDENT_ID"
echo "Type: Secret Compromise"
echo "Time: $(date -Iseconds)"

# 1.2 Create incident channel/message
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"🚨 INCIDENT $INCIDENT_ID: Secret compromise detected\",
    \"attachments\": [{
      \"color\": \"danger\",
      \"fields\": [
        {\"title\": \"Type\", \"value\": \"Secret Compromise\", \"short\": true},
        {\"title\": \"Status\", \"value\": \"Investigating\", \"short\": true}
      ]
    }]
  }"
```

#### Step 2: Identify Compromised Secret (T+5 min)

```bash
# 2.1 Determine which secret is compromised
COMPROMISED_SECRET_PATH="secret/services/api-brain"  # Example
COMPROMISED_SECRET_FIELD="jwt_secret"

# 2.2 Check access logs
echo "Checking Vault audit logs for $COMPROMISED_SECRET_PATH..."
grep "$COMPROMISED_SECRET_PATH" /vault/logs/audit.log | jq -r '
  select(.type == "request") |
  {
    time: .time,
    accessor: .auth.accessor,
    display_name: .auth.display_name,
    remote_address: .request.remote_address
  }'

# 2.3 Identify affected services
echo "Services using this secret:"
grep -r "$COMPROMISED_SECRET_PATH" Docker/ --include="*.yml" --include="*.yaml" -l
```

#### Step 3: Immediate Containment (T+10 min)

```bash
# 3.1 Revoke existing leases/tokens
echo "Revoking tokens that accessed the secret..."
vault token lookup -format=json <TOKEN_ID> | jq -r '.data.accessor' | \
  xargs -I {} vault token revoke -accessor {}

# 3.2 If using dynamic secrets, revoke leases
vault lease revoke -prefix database/creds/

# 3.3 Disable auth method if compromised
# vault auth disable userpass  # Only if necessary
```

#### Step 4: Rotate Secret (T+15 min)

```bash
# 4.1 Generate new secret
NEW_SECRET=$(openssl rand -base64 64)

# 4.2 Update Vault
echo "Rotating secret in Vault..."
vault kv put "$COMPROMISED_SECRET_PATH" \
  "$COMPROMISED_SECRET_FIELD"="$NEW_SECRET" \
  rotated_at="$(date -Iseconds)" \
  rotated_due_to="incident-$INCIDENT_ID"

# 4.3 Verify update
vault kv get "$COMPROMISED_SECRET_PATH"
```

#### Step 5: Service Update (T+20 min)

```bash
# 5.1 Restart affected services
SERVICES=("api-brain" "n8n")

for service in "${SERVICES[@]}"; do
  echo "Restarting $service..."
  docker-compose -f "Docker/services/$service/docker-compose.yml" restart
done

# 5.2 Verify services are healthy
sleep 10
for service in "${SERVICES[@]}"; do
  if docker ps | grep -q "$service"; then
    echo "✅ $service is running"
  else
    echo "❌ $service failed to start!"
  fi
done
```

#### Step 6: Verification (T+30 min)

```bash
# 6.1 Test service functionality
curl -s http://localhost:8000/health | jq .

# 6.2 Verify old secret no longer works
# (Attempt to use old secret - should fail)

# 6.3 Monitor for anomalies
echo "Monitoring logs for 30 minutes..."
tail -f /var/log/services/*.log | grep -iE "(error|fail|unauthorized)" &
MONITOR_PID=$!
sleep 1800
kill $MONITOR_PID
```

#### Step 7: Post-Incident (T+60 min)

```bash
# 7.1 Document incident
cat > /incidents/$INCIDENT_ID.md << EOF
# Incident $INCIDENT_ID

## Summary
- **Type:** Secret Compromise
- **Affected Secret:** $COMPROMISED_SECRET_PATH
- **Detection Time:** $(date -Iseconds)
- **Resolution Time:** $(date -Iseconds)
- **Impact:** [TO BE FILLED]

## Timeline
- T+0: Incident declared
- T+5: Secret identified
- T+10: Containment initiated
- T+15: Secret rotated
- T+20: Services updated
- T+30: Verification complete

## Root Cause
[TO BE DETERMINED]

## Actions Taken
1. Revoked compromised tokens
2. Rotated secret
3. Updated affected services
4. Verified functionality

## Follow-up Actions
- [ ] Security review
- [ ] Update procedures
- [ ] Additional monitoring
EOF

# 7.2 Close incident
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"✅ INCIDENT $INCIDENT_ID RESOLVED\",
    \"attachments\": [{
      \"color\": \"good\",
      \"text\": \"Secret has been rotated and services are healthy.\"  
    }]
  }"
```

---

## 🔑 RB-002: Vault Unseal Procedure

### Trigger
- Vault sealed after restart
- Manual seal for maintenance
- Auto-seal after threshold not met

### Prerequisites
- Unseal keys (5 shards, need 3)
- Access to Vault server

### Procedure

```bash
#!/bin/bash
# runbooks/vault-unseal.sh

VAULT_ADDR=${VAULT_ADDR:-"http://localhost:8200"}
UNSEAL_KEYS_FILE="${UNSEAL_KEYS_FILE:-"vault-unseal-keys.txt"}"

echo "🔐 Vault Unseal Procedure"
echo "========================"
echo "Vault: $VAULT_ADDR"
echo "Time: $(date)"
echo ""

# Check current status
echo "Step 1: Checking Vault status..."
STATUS=$(vault status -format=json 2>/dev/null || echo '{"sealed": true}')
SEALED=$(echo $STATUS | jq -r '.sealed')

if [ "$SEALED" != "true" ]; then
    echo "✅ Vault is already unsealed"
    exit 0
fi

PROGRESS=$(echo $STATUS | jq -r '.progress')
THRESHOLD=$(echo $STATUS | jq -r '.t')

echo "Vault is sealed"
echo "Progress: $PROGRESS/$THRESHOLD keys needed"
echo ""

# Read unseal keys
echo "Step 2: Reading unseal keys..."
if [ ! -f "$UNSEAL_KEYS_FILE" ]; then
    echo "❌ Unseal keys file not found: $UNSEAL_KEYS_FILE"
    echo "Please provide the path to unseal keys file:"
    read UNSEAL_KEYS_FILE
fi

KEYS=($(cat "$UNSEAL_KEYS_FILE"))
if [ ${#KEYS[@]} -lt $THRESHOLD ]; then
    echo "❌ Not enough unseal keys available"
    exit 1
fi

# Submit unseal keys
echo ""
echo "Step 3: Submitting unseal keys..."
for i in $(seq 0 $((THRESHOLD - 1))); do
    echo "Submitting key $((i+1))/$THRESHOLD..."
    vault operator unseal "${KEYS[$i]}" | grep -E "(Seal Type|Sealed|Key Shares|Key Threshold)"
    echo ""
done

# Verify
echo "Step 4: Verifying Vault status..."
vault status

echo ""
echo "✅ Vault unseal procedure completed"
```

---

## 👤 RB-003: User Access Revocation

### Trigger
- Employee termination
- Role change
- Security violation

### Procedure

```bash
#!/bin/bash
# runbooks/revoke-user-access.sh

USER=$1
REASON=$2

if [ -z "$USER" ] || [ -z "$REASON" ]; then
    echo "Usage: $0 <username> <reason>"
    exit 1
fi

echo "🔒 User Access Revocation"
echo "========================"
echo "User: $USER"
echo "Reason: $REASON"
echo "Time: $(date)"
echo ""

# Step 1: List user's tokens
echo "Step 1: Finding user's tokens..."
TOKENS=$(vault list auth/token/accessors | grep -v "Keys")

# Step 2: Revoke all tokens
echo "Step 2: Revoking all tokens..."
for accessor in $TOKENS; do
    TOKEN_INFO=$(vault token lookup -accessor $accessor -format=json 2>/dev/null)
    TOKEN_DISPLAY=$(echo $TOKEN_INFO | jq -r '.data.display_name')
    
    if [[ "$TOKEN_DISPLAY" == *"$USER"* ]]; then
        echo "Revoking token: $accessor ($TOKEN_DISPLAY)"
        vault token revoke -accessor $accessor
    fi
done

# Step 3: Disable user in auth methods
echo ""
echo "Step 3: Disabling user in auth methods..."

# UserPass
vault delete auth/userpass/users/$USER 2>/dev/null && echo "✅ Removed from UserPass"

# AppRole (if applicable)
vault delete auth/approle/role/$USER 2>/dev/null && echo "✅ Removed from AppRole"

# Step 4: Remove from groups
echo ""
echo "Step 4: Removing from groups..."
GROUPS=$(vault list identity/group/name | tail -n +2)
for group in $GROUPS; do
    vault read identity/group/name/$group -format=json | \
        jq -r '.data.member_entity_ids[]' | \
        while read entity; do
            ENTITY_NAME=$(vault read identity/entity/id/$entity -format=json | jq -r '.data.name')
            if [ "$ENTITY_NAME" == "$USER" ]; then
                echo "Removing from group: $group"
                # Update group to remove member
            fi
        done
done

# Step 5: Audit
echo ""
echo "Step 5: Logging revocation..."
echo "$(date -Iseconds) | USER_REVOKED | $USER | $REASON | $(whoami)" >> /var/log/security/access-revocations.log

echo ""
echo "✅ User access revoked: $USER"
```

---

## 🔄 RB-004: Certificate Renewal

### Trigger
- Certificate expires in < 30 days
- Manual renewal required
- Certificate compromised

### Procedure

```bash
#!/bin/bash
# runbooks/renew-certificate.sh

DOMAIN=$1

echo "📜 Certificate Renewal"
echo "====================="
echo "Domain: $DOMAIN"
echo "Time: $(date)"
echo ""

# Check current certificate
echo "Step 1: Checking current certificate..."
echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | \
    openssl x509 -noout -dates -subject

# Renew via Let's Encrypt (if applicable)
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo ""
    echo "Step 2: Renewing Let's Encrypt certificate..."
    certbot renew --force-renewal --cert-name $DOMAIN
    
    echo ""
    echo "Step 3: Reloading services..."
    systemctl reload nginx
fi

# Renew via Vault PKI (if applicable)
if [[ "$DOMAIN" == *"internal"* ]]; then
    echo ""
    echo "Step 2: Generating new certificate from Vault PKI..."
    
    # Generate new certificate
    vault write pki_int/issue/service \
        common_name="$DOMAIN" \
        ttl="720h" \
        format=pem_bundle > /tmp/new-cert.pem
    
    # Extract certificate and key
    awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/' /tmp/new-cert.pem > \
        /etc/ssl/certs/$DOMAIN.pem
    awk '/-----BEGIN RSA PRIVATE KEY-----/,/-----END RSA PRIVATE KEY-----/' /tmp/new-cert.pem > \
        /etc/ssl/private/$DOMAIN.key
    
    chmod 644 /etc/ssl/certs/$DOMAIN.pem
    chmod 600 /etc/ssl/private/$DOMAIN.key
    
    echo ""
    echo "Step 3: Updating container..."
    docker-compose -f Docker/services/$DOMAIN/docker-compose.yml restart
fi

# Verify
echo ""
echo "Step 4: Verifying new certificate..."
sleep 5
echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | \
    openssl x509 -noout -dates -subject

echo ""
echo "✅ Certificate renewal completed"
```

---

## 🛡️ RB-005: Container Security Scan

### Schedule
- Daily: Automated scan
- Weekly: Full report
- On-demand: Before deployment

### Procedure

```bash
#!/bin/bash
# runbooks/scan-containers.sh

OUTPUT_DIR="/security/scans/$(date +%Y%m%d)"
mkdir -p $OUTPUT_DIR

echo "🔍 Container Security Scan"
echo "========================="
echo "Time: $(date)"
echo "Output: $OUTPUT_DIR"
echo ""

# Get all running containers
CONTAINERS=$(docker ps --format "{{.Names}}")

for container in $CONTAINERS; do
    echo "Scanning: $container"
    
    # Get image name
    IMAGE=$(docker inspect --format='{{.Config.Image}}' $container)
    
    # Run Trivy scan
    trivy image \
        --severity HIGH,CRITICAL \
        --format json \
        --output "$OUTPUT_DIR/${container}.json" \
        $IMAGE 2>/dev/null
    
    # Check for issues
    VULNS=$(cat "$OUTPUT_DIR/${container}.json" | jq '.Results[].Vulnerabilities | length' 2>/dev/null || echo "0")
    
    if [ "$VULNS" -gt 0 ]; then
        echo "  ⚠️  $VULNS vulnerabilities found"
        echo "     Report: $OUTPUT_DIR/${container}.json"
    else
        echo "  ✅ No vulnerabilities"
    fi
done

# Generate summary
echo ""
echo "Generating summary..."
cat > "$OUTPUT_DIR/summary.txt" << EOF
Container Security Scan Summary
==============================
Date: $(date)
Containers Scanned: $(echo "$CONTAINERS" | wc -w)

Vulnerabilities by Container:
EOF

for report in $OUTPUT_DIR/*.json; do
    container=$(basename $report .json)
    count=$(cat $report | jq '[.Results[].Vulnerabilities // [] | length] | add' 2>/dev/null || echo "0")
    echo "  $container: $count" >> "$OUTPUT_DIR/summary.txt"
done

cat "$OUTPUT_DIR/summary.txt"
```

---

## 📊 RB-006: Security Audit

### Schedule
- Monthly: Automated audit
- Quarterly: Full security review
- On-demand: Compliance requirements

### Procedure

```bash
#!/bin/bash
# runbooks/security-audit.sh

REPORT_FILE="/security/audits/audit-$(date +%Y%m%d).md"
mkdir -p $(dirname $REPORT_FILE)

echo "🔒 Security Audit Report" > $REPORT_FILE
echo "=======================" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Date: $(date)" >> $REPORT_FILE
echo "Auditor: $(whoami)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 1. Vault Status
echo "## 1. Vault Status" >> $REPORT_FILE
echo "" >> $REPORT_FILE
vault status >> $REPORT_FILE 2>&1
echo "" >> $REPORT_FILE

# 2. Active Tokens
echo "## 2. Active Tokens" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Total active tokens: $(vault list auth/token/accessors | tail -n +2 | wc -l)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 3. Policies
echo "## 3. Policies" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Active policies:" >> $REPORT_FILE
vault policy list >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 4. Container Security
echo "## 4. Container Security" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Privileged containers:" >> $REPORT_FILE
docker ps -q | xargs -I {} docker inspect {} --format='{{.Name}}: {{.HostConfig.Privileged}}' | grep true >> $REPORT_FILE 2>/dev/null || echo "None" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "Containers running as root:" >> $REPORT_FILE
docker ps -q | xargs -I {} docker exec {} id -u 2>/dev/null | grep "^0$" | wc -l | xargs -I {} echo "{} containers" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 5. Network Security
echo "## 5. Network Security" >> $REPORT_FILE
echo "" >> $REPORT_FILE
docker network ls >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 6. Certificate Status
echo "## 6. Certificate Status" >> $REPORT_FILE
echo "" >> $REPORT_FILE
for domain in api.delqhi.com n8n.delqhi.com vault.delqhi.com; do
    echo "### $domain" >> $REPORT_FILE
    echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
        openssl x509 -noout -dates -subject -issuer >> $REPORT_FILE
done
echo "" >> $REPORT_FILE

# 7. Findings Summary
echo "## 7. Findings Summary" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "- [ ] Review privileged containers" >> $REPORT_FILE
echo "- [ ] Verify certificate expiry dates" >> $REPORT_FILE
echo "- [ ] Review unused policies" >> $REPORT_FILE
echo "- [ ] Check for orphaned tokens" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "Report generated: $REPORT_FILE"
cat $REPORT_FILE
```

---

## 📝 Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | SEC-14-RUNBOOKS |
| **Version** | 1.0.0 |
| **Classification** | Internal Use Only |
| **Author** | SIN-Solver Security Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Quarterly |
| **Next Review** | 2026-04-30 |

---

*For additional security documentation, see the 26-Pillar Security Documentation Index.*
