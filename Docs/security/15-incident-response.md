# 🚨 Incident Response Plan

**Document ID:** SEC-15-INCIDENT-RESPONSE  
**Version:** 1.0.0  
**Classification:** CONFIDENTIAL  
**Last Updated:** 2026-01-30  

---

## 📋 Overview

This document outlines the comprehensive incident response plan for SIN-Solver security incidents. It defines procedures, roles, and communication protocols to ensure rapid and effective response to security events.

### Incident Response Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│           INCIDENT RESPONSE LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐         │
│  │Prepare  │ → │Detect   │ → │Analyze  │ → │Contain  │         │
│  │         │   │         │   │         │   │         │         │
│  │• Plans  │   │• Monitor│   │• Scope  │   │• Isolate│         │
│  │• Train  │   │• Alert  │   │• Impact │   │• Limit  │         │
│  │• Tools  │   │• Report │   │• Root   │   │• Prevent│         │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘         │
│       ↑                                          ↓              │
│       └──────────────┬───────────────────────────┘              │
│                      ▼                                          │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                       │
│  │Review   │ ← │Recover  │ ← │Eradicate│                       │
│  │         │   │         │   │         │                       │
│  │• Lessons│   │• Restore│   │• Remove │                       │
│  │• Update │   │• Verify │   │• Patch  │                       │
│  │• Improve│   │• Monitor│   │• Clean  │                       │
│  └─────────┘   └─────────┘   └─────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Incident Classification

### Severity Levels

| Level | Criteria | Response Time | Examples |
|-------|----------|---------------|----------|
| **Critical (P1)** | Active breach, data exfiltration, service down | 15 minutes | Ransomware, unauthorized admin access, data breach |
| **High (P2)** | Potential breach, significant vulnerability | 1 hour | Exploit attempt, malware detection, credential compromise |
| **Medium (P3)** | Suspicious activity, minor vulnerability | 4 hours | Failed login attempts, policy violation, port scan |
| **Low (P4)** | Informational, no immediate threat | 24 hours | Log anomaly, configuration drift, expired certificate |

### Incident Types

| Category | Description | Escalation Path |
|----------|-------------|-----------------|
| **Data Breach** | Unauthorized data access/exfiltration | Security Lead → CTO → Legal |
| **Malware** | Virus, ransomware, trojan detection | SOC → Security Lead → CTO |
| **DDoS** | Denial of service attack | NOC → Security Lead → Cloudflare |
| **Insider Threat** | Malicious insider activity | Security Lead → HR → Legal |
| **Vulnerability** | Critical vulnerability discovered | Security Lead → Engineering |
| **Policy Violation** | Security policy breach | Manager → Security Lead |

---

## 👥 Incident Response Team

### Roles and Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│              INCIDENT RESPONSE TEAM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Incident Commander (IC)                                        │
│  ├── Overall incident coordination                              │
│  ├── Resource allocation                                        │
│  ├── External communications approval                           │
│  └── Decision authority                                         │
│                                                                  │
│  Security Lead                                                  │
│  ├── Technical investigation                                    │
│  ├── Containment strategy                                       │
│  ├── Forensic analysis                                          │
│  └── Evidence preservation                                      │
│                                                                  │
│  Technical Lead                                                 │
│  ├── System recovery                                            │
│  ├── Patch deployment                                           │
│  ├── Service restoration                                        │
│  └── Technical documentation                                    │
│                                                                  │
│  Communications Lead                                            │
│  ├── Internal notifications                                     │
│  ├── External communications                                    │
│  ├── Status updates                                             │
│  └── Stakeholder management                                     │
│                                                                  │
│  Legal Counsel                                                  │
│  ├── Regulatory requirements                                    │
│  ├── Disclosure obligations                                     │
│  ├── Evidence handling                                          │
│  └── Liability assessment                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Contact Information

| Role | Primary | Backup | Contact Method |
|------|---------|--------|----------------|
| **Incident Commander** | CTO | VP Engineering | Phone + Slack |
| **Security Lead** | CISO | Security Manager | Phone + PagerDuty |
| **Technical Lead** | Principal Engineer | Senior SRE | Slack + Phone |
| **Communications** | PR Manager | CEO Office | Phone + Email |
| **Legal** | General Counsel | External Firm | Phone + Email |

### Escalation Matrix

| Time Elapsed | Action | Notify |
|--------------|--------|--------|
| T+15 min | Initial response | Security Lead, On-call Engineer |
| T+30 min | Escalate if not contained | Incident Commander |
| T+1 hour | Full team activation | All IR Team members |
| T+2 hours | Executive briefing | CEO, CTO, Legal |
| T+4 hours | External support | Cloudflare, AWS Support |
| T+24 hours | Post-incident review | All stakeholders |

---

## 🚨 Response Procedures

### Phase 1: Detection and Reporting

#### Automated Detection

```yaml
Detection Sources:
  SIEM:
    - Splunk alerts
    - Custom correlation rules
    - Anomaly detection
  
  Cloud Security:
    - Cloudflare WAF alerts
    - AWS GuardDuty
    - Docker security scanning
  
  Application:
    - Failed authentication spikes
    - Unusual API patterns
    - Error rate anomalies
  
  Infrastructure:
    - Resource utilization spikes
    - Network traffic anomalies
    - Container escape attempts
```

#### Manual Reporting

```bash
# Report security incident
# Usage: ./report-incident.sh "description" severity

INCIDENT_DESC="$1"
SEVERITY="${2:-P3}"
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"

curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"🚨 Security Incident Reported\",
    \"attachments\": [{
      \"color\": \"danger\",
      \"fields\": [
        {\"title\": \"Incident ID\", \"value\": \"$INCIDENT_ID\", \"short\": true},
        {\"title\": \"Severity\", \"value\": \"$SEVERITY\", \"short\": true},
        {\"title\": \"Description\", \"value\": \"$INCIDENT_DESC\", \"short\": false},
        {\"title\": \"Reporter\", \"value\": \"$(whoami)\", \"short\": true},
        {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": true}
      ]
    }]
  }"

# Create incident directory
mkdir -p /incidents/$INCIDENT_ID
echo "$INCIDENT_DESC" > /incidents/$INCIDENT_ID/description.txt
echo "$SEVERITY" > /incidents/$INCIDENT_ID/severity.txt
echo "$(date -Iseconds)" > /incidents/$INCIDENT_ID/created.txt

echo "Incident reported: $INCIDENT_ID"
```

### Phase 2: Triage and Analysis

#### Initial Assessment Checklist

- [ ] Confirm incident is genuine (not false positive)
- [ ] Determine incident type and category
- [ ] Assess scope and impact
- [ ] Identify affected systems/data
- [ ] Classify severity level
- [ ] Assign incident commander
- [ ] Notify response team
- [ ] Begin evidence collection

#### Analysis Questions

```markdown
## Incident Analysis Template

### Basic Information
- **Incident ID:** INC-YYYY-MM-DD-XXXXX
- **Detection Time:** 
- **Detection Method:** 
- **Reporter:** 

### Impact Assessment
- **Affected Systems:** 
- **Affected Data:** 
- **User Impact:** 
- **Business Impact:** 
- **Regulatory Impact:** 

### Technical Details
- **Attack Vector:** 
- **Indicators of Compromise (IOCs):**
  - IP addresses:
  - File hashes:
  - Domain names:
  - User accounts:
- **Log Evidence:** 
- **Forensic Artifacts:** 

### Timeline
- **First malicious activity:** 
- **Detection time:** 
- **Response start:** 
- **Containment time:** 
- **Resolution time:** 
```

### Phase 3: Containment

#### Short-term Containment (Immediate)

```bash
#!/bin/bash
# containment-procedures.sh

INCIDENT_ID=$1
TARGET=$2  # IP, container, or user

echo "🔒 Short-term Containment: $TARGET"
echo "Incident: $INCIDENT_ID"
echo "Time: $(date)"

# Option 1: Isolate container
if [[ "$TARGET" == *"container"* ]]; then
    CONTAINER=$(echo $TARGET | cut -d: -f2)
    echo "Isolating container: $CONTAINER"
    
    # Disconnect from all networks
    docker network ls --format "{{.Name}}" | while read network; do
        docker network disconnect $network $CONTAINER 2>/dev/null || true
    done
    
    # Stop but preserve for forensics
    docker stop $CONTAINER
    
    echo "✅ Container $CONTAINER isolated"
fi

# Option 2: Block IP address
if [[ "$TARGET" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Blocking IP: $TARGET"
    
    # Add to iptables
    iptables -A INPUT -s $TARGET -j DROP
    iptables -A FORWARD -s $TARGET -j DROP
    
    # Add to Cloudflare firewall
    curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/firewall/access_rules/rules" \
        -H "Authorization: Bearer $CF_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{
            "mode": "block",
            "configuration": {
                "target": "ip",
                "value": "'$TARGET'"
            },
            "notes": "Incident '$INCIDENT_ID'"
        }'
    
    echo "✅ IP $TARGET blocked"
fi

# Option 3: Disable user
if [[ "$TARGET" == *"user:"* ]]; then
    USER=$(echo $TARGET | cut -d: -f2)
    echo "Disabling user: $USER"
    
    # Revoke Vault tokens
    vault token lookup -format=json | jq -r '.data.accessor' | \
        xargs -I {} vault token revoke -accessor {}
    
    # Disable in auth methods
    vault delete auth/userpass/users/$USER 2>/dev/null || true
    
    echo "✅ User $USER disabled"
fi

# Log containment action
echo "$(date -Iseconds) | CONTAINMENT | $INCIDENT_ID | $TARGET | $(whoami)" >> /var/log/security/containment.log
```

#### Long-term Containment (Strategic)

- Implement network segmentation
- Deploy additional monitoring
- Enable enhanced logging
- Restrict access temporarily
- Activate disaster recovery site

### Phase 4: Eradication

#### Malware Removal

```bash
#!/bin/bash
# eradication-procedures.sh

# 1. Identify infected systems
INFECTED_CONTAINERS=$(docker ps -q | xargs -I {} docker exec {} sh -c 'clamscan -r /app 2>/dev/null | grep "Infected files: 1"' 2>/dev/null | cut -d: -f1)

# 2. Remove malware
for container in $INFECTED_CONTAINERS; do
    echo "Cleaning container: $container"
    
    # Stop container
    docker stop $container
    
    # Remove and recreate from clean image
    docker rm $container
    docker-compose up -d $container
    
    echo "✅ Container $container cleaned"
done

# 3. Patch vulnerabilities
# Update base images
# Apply security patches
# Rotate compromised credentials
```

#### Vulnerability Remediation

1. **Identify root cause**
   - Vulnerability exploited
   - Misconfiguration
   - Weak credentials
   - Social engineering

2. **Apply fixes**
   - Patch systems
   - Update configurations
   - Rotate credentials
   - Update policies

3. **Verify remediation**
   - Re-scan systems
   - Test fixes
   - Monitor for recurrence

### Phase 5: Recovery

#### Service Restoration

```bash
#!/bin/bash
# recovery-procedures.sh

SERVICES=("api-brain" "n8n" "vault" "postgres")

echo "🔄 Service Recovery"
echo "=================="

for service in "${SERVICES[@]}"; do
    echo "Restoring $service..."
    
    # Check service health
    if docker ps | grep -q "$service"; then
        echo "  $service is running"
        
        # Verify functionality
        case $service in
            api-brain)
                curl -s http://localhost:8000/health | grep -q "healthy" && echo "  ✅ Healthy"
                ;;
            n8n)
                curl -s http://localhost:5678/healthz | grep -q "OK" && echo "  ✅ Healthy"
                ;;
            vault)
                vault status | grep -q "Sealed.*false" && echo "  ✅ Unsealed"
                ;;
            postgres)
                docker exec room-03-postgres-master pg_isready | grep -q "accepting connections" && echo "  ✅ Ready"
                ;;
        esac
    else
        echo "  ❌ $service not running, starting..."
        docker-compose -f Docker/services/$service/docker-compose.yml up -d
    fi
done

echo ""
echo "✅ Recovery completed"
```

#### Monitoring Enhancement

- Increase log retention
- Enable additional monitoring
- Set up alerting rules
- Schedule security scans

### Phase 6: Post-Incident

#### Lessons Learned

```markdown
# Post-Incident Review Template

## Incident Summary
- **Incident ID:** 
- **Date:** 
- **Duration:** 
- **Severity:** 
- **Category:** 

## Timeline
| Time | Event | Action Taken |
|------|-------|--------------|
| | | |

## Root Cause Analysis
### 5 Whys
1. Why did the incident occur?
2. Why? 
3. Why?
4. Why?
5. Why? (Root cause)

## Impact Assessment
- **Systems Affected:**
- **Data Compromised:**
- **Users Affected:**
- **Financial Impact:**
- **Reputational Impact:**

## Response Effectiveness
### What Went Well
- 

### What Could Be Improved
- 

### Action Items
- [ ] 
- [ ] 
- [ ] 

## Preventive Measures
- 
```

#### Documentation Updates

- Update incident response plan
- Revise security procedures
- Update runbooks
- Train team on lessons learned

---

## 📢 Communication Plan

### Internal Communication

| Stakeholder | Notification | Updates | Resolution |
|-------------|--------------|---------|------------|
| **IR Team** | Immediate | Every 30 min | Immediate |
| **Engineering** | T+30 min | Every hour | T+resolution |
| **Executive** | T+1 hour | Every 2 hours | T+resolution |
| **All Staff** | As needed | Daily | T+24 hours |

### External Communication

| Audience | Timing | Channel | Owner |
|----------|--------|---------|-------|
| **Customers** | If data affected | Email + Status page | Communications |
| **Regulators** | Per legal requirements | Formal notification | Legal |
| **Media** | If public interest | Press release | Communications |
| **Partners** | If service affected | Direct contact | Account Manager |

### Communication Templates

#### Initial Notification (Internal)

```
Subject: [SECURITY] Incident INC-XXXXX - Initial Response

A security incident has been detected and is being investigated.

Incident ID: INC-XXXXX
Severity: [P1/P2/P3/P4]
Status: Under Investigation
Time Detected: [Timestamp]

Impact:
- [Brief description of impact]

Actions Taken:
- Incident response team activated
- Initial containment measures implemented
- Investigation underway

Next Update: [Time]

Do NOT discuss this incident externally.
Direct questions to: security@sin-solver.com
```

#### Customer Notification

```
Subject: Security Notice - SIN-Solver Platform

Dear Valued Customer,

We are writing to inform you of a security incident that may have affected your data.

What Happened:
[Brief, factual description]

What Information Was Involved:
[Specific data types]

What We Are Doing:
- Immediate containment measures
- Full investigation with external experts
- Enhanced security measures

What You Can Do:
- [Recommended actions]

We sincerely apologize for any inconvenience.

Contact: security@sin-solver.com
```

---

## 🛠️ Tools and Resources

### Incident Response Toolkit

| Tool | Purpose | Location |
|------|---------|----------|
| **Slack** | Communication | #security-incidents |
| **PagerDuty** | On-call alerting | Security Team |
| **Jira** | Incident tracking | SEC project |
| **Forensic Workstation** | Analysis | /forensics/ |
| **Vault** | Secret rotation | room-02-tresor-vault |
| **Cloudflare** | DDoS/WAF | Dashboard |

### Forensic Resources

- Memory dump tools
- Disk imaging tools
- Log analysis tools
- Network capture tools
- Malware analysis sandbox

---

## 📝 Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | SEC-15-INCIDENT-RESPONSE |
| **Version** | 1.0.0 |
| **Classification** | CONFIDENTIAL |
| **Author** | SIN-Solver Security Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Quarterly |
| **Next Review** | 2026-04-30 |
| **Drill Schedule** | Monthly table-top, Quarterly live |

---

*This document is CONFIDENTIAL and should only be shared with authorized personnel.*

*For additional security documentation, see the 26-Pillar Security Documentation Index.*
