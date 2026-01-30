# RB-003: SSL Certificate Renewal Runbook

**Purpose:** Manage SSL/TLS certificates for all public-facing services via Cloudflare.

**Scope:** All *.delqhi.com subdomains and Cloudflare-managed certificates

**Prerequisites:**
- Cloudflare account access
- Cloudflare API token with Zone:Edit permissions
- Valid Cloudflare tunnel configuration
- Access to Cloudflare Zero Trust dashboard

---

## Table of Contents

1. [SSL Architecture Overview](#1-ssl-architecture-overview)
2. [Certificate Status Check](#2-certificate-status-check)
3. [Automatic Certificate Renewal](#3-automatic-certificate-renewal)
4. [Manual Certificate Management](#4-manual-certificate-management)
5. [Certificate Deployment](#5-certificate-deployment)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. SSL Architecture Overview

### 1.1 Cloudflare SSL/TLS Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    SSL ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Browser                                                │
│       │                                                      │
│       ▼ HTTPS (Cloudflare Managed Certificate)              │
│  ┌──────────────────────────────────────┐                   │
│  │     Cloudflare Edge (SSL/TLS)        │                   │
│  │  - Certificate: *.delqhi.com         │                   │
│  │  - Encryption: Full (Strict)         │                   │
│  │  - TLS Version: 1.2+                 │                   │
│  └──────────────────────────────────────┘                   │
│       │                                                      │
│       ▼ HTTPS/HTTP (Cloudflare Tunnel)                      │
│  ┌──────────────────────────────────────┐                   │
│  │   room-00-cloudflared-tunnel         │                   │
│  │   (Internal Services)                │                   │
│  └──────────────────────────────────────┘                   │
│       │                                                      │
│       ▼ HTTP (Internal Network)                             │
│  ┌──────────────────────────────────────┐                   │
│  │   Internal Services                  │                   │
│  │   - room-13-api-brain:8000          │                   │
│  │   - room-01-dashboard:3011          │                   │
│  │   - agent-01-n8n:5678               │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Certificate Types

| Type | Provider | Auto-Renew | Used For |
|------|----------|------------|----------|
| Universal SSL | Cloudflare | Yes | *.delqhi.com |
| Advanced Certificate | Cloudflare | Yes | Custom domains |
| Origin CA | Cloudflare | No (1 year) | Origin server encryption |
| Custom Certificate | Let's Encrypt/Other | Manual | Special requirements |

### 1.3 SSL/TLS Mode

**Current Setting:** Full (Strict)

```
Full (Strict) Mode:
- Browser ↔ Cloudflare: HTTPS (Cloudflare cert)
- Cloudflare ↔ Origin: HTTPS (Origin cert validated)
- Requires valid origin certificate
```

---

## 2. Certificate Status Check

### 2.1 Check Certificate Expiry

```bash
# Check all delqhi.com certificates
for domain in api.delqhi.com dashboard.delqhi.com n8n.delqhi.com vault.delqhi.com; do
    echo "=== $domain ==="
    echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
        openssl x509 -noout -dates -subject
    echo ""
done

# Expected Output:
# === api.delqhi.com ===
# notBefore=Jan 15 00:00:00 2026 GMT
# notAfter=Apr 15 23:59:59 2026 GMT
# subject=CN = *.delqhi.com
```

### 2.2 Check Certificate Details

```bash
# Detailed certificate information
domain="api.delqhi.com"
echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
    openssl x509 -noout -text | grep -A2 "Subject:\|Issuer:\|Validity"

# Check TLS version and cipher
echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
    grep "Protocol\|Cipher"
```

### 2.3 SSL Labs Test

```bash
# Open in browser (automated check not available without API key)
open "https://www.ssllabs.com/ssltest/analyze.html?d=api.delqhi.com&latest"

# Expected Grade: A+
# - Certificate: Trusted
# - Protocol Support: TLS 1.2, TLS 1.3
# - Key Exchange: ECDHE
# - Cipher Strength: Strong
```

### 2.4 Cloudflare Dashboard Check

```bash
# Open Cloudflare SSL/TLS settings
open "https://dash.cloudflare.com/?to=/:account/:zone/ssl-tls"

# Check:
# 1. Overview tab - Certificate status
# 2. Edge Certificates - Expiry dates
# 3. Origin Server - Origin CA certificates
```

---

## 3. Automatic Certificate Renewal

### 3.1 Cloudflare Universal SSL

**Status:** ✅ Fully Automatic

```
Cloudflare Universal SSL:
- Auto-renews 30 days before expiry
- No action required
- Covers *.delqhi.com
- Validity: 3 months (auto-renewed)
```

### 3.2 Verify Auto-Renewal is Working

```bash
# Check certificate was recently renewed
domain="api.delqhi.com"
echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
    openssl x509 -noout -startdate

# Should show recent date if recently renewed
# notBefore=Jan 28 00:00:00 2026 GMT
```

### 3.3 Monitor Certificate Expiry

```bash
# Create certificate monitoring script
cat > /Users/jeremy/dev/SIN-Solver/scripts/check-ssl-expiry.sh << 'EOF'
#!/bin/bash

DOMAINS=(
    "api.delqhi.com"
    "dashboard.delqhi.com"
    "n8n.delqhi.com"
    "vault.delqhi.com"
    "plane.delqhi.com"
    "steel.delqhi.com"
    "skyvern.delqhi.com"
    "captcha.delqhi.com"
    "survey.delqhi.com"
    "scira.delqhi.com"
)

WARNING_DAYS=14
CRITICAL_DAYS=7

for domain in "${DOMAINS[@]}"; do
    # Get expiry date
    expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
        openssl x509 -noout -enddate | cut -d= -f2)
    
    # Convert to epoch
    expiry_epoch=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s 2>/dev/null || \
                   date -d "$expiry" +%s)
    
    current_epoch=$(date +%s)
    days_until=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ "$days_until" -lt "$CRITICAL_DAYS" ]; then
        echo "🔴 CRITICAL: $domain expires in $days_until days"
    elif [ "$days_until" -lt "$WARNING_DAYS" ]; then
        echo "🟡 WARNING: $domain expires in $days_until days"
    else
        echo "✅ OK: $domain expires in $days_until days"
    fi
done
EOF

chmod +x /Users/jeremy/dev/SIN-Solver/scripts/check-ssl-expiry.sh

# Run check
/Users/jeremy/dev/SIN-Solver/scripts/check-ssl-expiry.sh
```

### 3.4 Schedule Daily Certificate Check

```bash
# Add to crontab
crontab -e

# Add line for daily check at 9 AM
0 9 * * * /Users/jeremy/dev/SIN-Solver/scripts/check-ssl-expiry.sh >> /Users/jeremy/backups/sin-solver/logs/ssl-check.log 2>&1
```

---

## 4. Manual Certificate Management

### 4.1 Force Certificate Renewal (Cloudflare)

```bash
# Via Cloudflare API
# Get your Zone ID from Cloudflare dashboard
ZONE_ID="your-zone-id"
API_TOKEN="your-api-token"

# Request certificate renewal
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/ssl/certificate_packs" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "advanced",
        "hosts": ["*.delqhi.com", "delqhi.com"]
    }'

# Expected Response:
# {
#     "success": true,
#     "result": {
#         "id": "...",
#         "type": "advanced",
#         "hosts": ["*.delqhi.com", "delqhi.com"],
#         "status": "initializing"
#     }
# }
```

### 4.2 Generate Origin CA Certificate

```bash
# Generate new Origin CA certificate via Cloudflare API
ZONE_ID="your-zone-id"
API_TOKEN="your-api-token"

# Create certificate request
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/origin_ca_certificate" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "hostnames": ["*.delqhi.com", "delqhi.com"],
        "request_type": "origin-rsa",
        "requested_validity": 365
    }'

# Save the certificate and private key securely
# Store in Vault: secret/ssl/origin-ca
```

### 4.3 Upload Custom Certificate

```bash
# If using custom certificate (not recommended)
CERT_FILE="/path/to/certificate.crt"
KEY_FILE="/path/to/private.key"
BUNDLE_FILE="/path/to/ca-bundle.crt"

# Upload via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/custom_certificates" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"certificate\": \"$(cat "$CERT_FILE" | sed 's/$/\\n/' | tr -d '\n')\",
        \"private_key\": \"$(cat "$KEY_FILE" | sed 's/$/\\n/' | tr -d '\n')\",
        \"bundle_method\": \"force\",
        \"geo_restrictions\": {\"label\": \"us\"}
    }"
```

---

## 5. Certificate Deployment

### 5.1 Deploy Origin CA Certificate

```bash
# Store certificate in Vault
docker exec -i room-02-tresor-vault vault kv put secret/ssl/origin-ca \
    certificate=@/path/to/origin-ca.crt \
    private_key=@/path/to/origin-ca.key

# Verify storage
docker exec room-02-tresor-vault vault kv get secret/ssl/origin-ca
```

### 5.2 Update Cloudflared Tunnel

```bash
# Origin certificates are handled by Cloudflare automatically
# when using Cloudflare Tunnel (cloudflared)

# Verify tunnel configuration
cat /Users/jeremy/dev/SIN-Solver/infrastructure/cloudflare/config.yml

# Check tunnel is using correct SSL settings
docker exec room-00-cloudflared-tunnel cat /etc/cloudflared/config.yml | grep -A5 "ingress"

# Expected configuration:
# ingress:
#   - hostname: api.delqhi.com
#     service: http://room-13-api-brain:8000
#   - hostname: dashboard.delqhi.com
#     service: http://room-01-dashboard-cockpit:3011
#   ...
```

### 5.3 Force SSL/TLS Settings

```bash
# Set SSL/TLS mode to Full (Strict) via API
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/ssl" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"value": "strict"}'

# Enable Always Use HTTPS
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/always_use_https" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"value": "on"}'

# Set Minimum TLS Version to 1.2
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/min_tls_version" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"value": "1.2"}'
```

---

## 6. Troubleshooting

### 6.1 Certificate Expired

```bash
# Symptoms: Browser shows "Your connection is not private"
# Error: NET::ERR_CERT_DATE_INVALID

# Check certificate status
domain="api.delqhi.com"
echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
    openssl x509 -noout -dates

# If expired, force renewal via Cloudflare dashboard:
# 1. Go to SSL/TLS > Edge Certificates
# 2. Click "Renew" next to expired certificate
# 3. Wait 5-10 minutes for propagation

# Verify renewal
echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
    openssl x509 -noout -dates
```

### 6.2 Certificate Not Trusted

```bash
# Symptoms: Browser shows "NET::ERR_CERT_AUTHORITY_INVALID"

# Check certificate chain
domain="api.delqhi.com"
echo | openssl s_client -servername "$domain" -connect "$domain:443" -showcerts 2>/dev/null | \
    grep -E "s:\|i:"

# Verify with OpenSSL
echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
    openssl verify

# If failing, check:
# 1. Cloudflare Universal SSL is enabled
# 2. SSL/TLS encryption mode is set correctly
# 3. No conflicting page rules
```

### 6.3 Mixed Content Errors

```bash
# Symptoms: Browser console shows "Mixed Content" warnings
# HTTPS page loading HTTP resources

# Check for mixed content
curl -s "https://api.delqhi.com" | grep -i "http://" | head -10

# Enable Automatic HTTPS Rewrites
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/automatic_https_rewrites" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"value": "on"}'

# Or use Content Security Policy header
# Add in Cloudflare dashboard: Rules > Transform Rules
```

### 6.4 TLS Version Issues

```bash
# Check supported TLS versions
domain="api.delqhi.com"

for version in -tls1 -tls1_1 -tls1_2 -tls1_3; do
    result=$(echo | openssl s_client "$version" -connect "$domain:443" 2>&1 | grep -c "Protocol  :")
    if [ "$result" -gt 0 ]; then
        echo "✅ $version: Supported"
    else
        echo "❌ $version: Not supported"
    fi
done

# Force minimum TLS 1.2 if older versions are enabled
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/min_tls_version" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"value": "1.2"}'
```

### 6.5 Origin Certificate Errors

```bash
# Symptoms: 525 SSL Handshake Failed

# Check origin certificate
docker exec room-13-api-brain openssl s_client -connect localhost:8000 2>/dev/null | \
    openssl x509 -noout -dates

# If using self-signed certificate, install Origin CA certificate:
# 1. Generate new Origin CA certificate in Cloudflare dashboard
# 2. Download certificate and private key
# 3. Update service configuration to use new certificate
# 4. Restart service

# For testing only - bypass certificate validation (NOT FOR PRODUCTION)
# curl -k https://api.delqhi.com/health
```

### 6.6 Cloudflare Tunnel SSL Issues

```bash
# Check tunnel logs
docker logs room-00-cloudflared-tunnel --tail 100 | grep -i "error\|ssl\|cert"

# Verify tunnel status
docker exec room-00-cloudflared-tunnel cloudflared tunnel info

# Restart tunnel if needed
docker restart room-00-cloudflared-tunnel

# Check tunnel credentials are valid
docker exec room-00-cloudflared-tunnel cat /etc/cloudflared/credentials.json
```

---

## Quick Reference

### Certificate Commands

```bash
# Check certificate expiry
echo | openssl s_client -connect api.delqhi.com:443 2>/dev/null | openssl x509 -noout -dates

# Check certificate details
echo | openssl s_client -connect api.delqhi.com:443 2>/dev/null | openssl x509 -noout -text

# Test SSL connection
curl -v https://api.delqhi.com/health 2>&1 | grep -E "SSL|TLS|certificate"

# Check all domains
for d in api.delqhi.com dashboard.delqhi.com n8n.delqhi.com; do
    echo "$d: $(echo | openssl s_client -connect "$d:443" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)"
done
```

### Cloudflare API Commands

```bash
# Set environment variables
export CF_ZONE_ID="your-zone-id"
export CF_API_TOKEN="your-api-token"

# Get SSL settings
curl -s "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/settings/ssl" \
    -H "Authorization: Bearer $CF_API_TOKEN" | jq '.result.value'

# Get certificate packs
curl -s "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/ssl/certificate_packs" \
    -H "Authorization: Bearer $CF_API_TOKEN" | jq '.result[] | {id, status, hosts}'
```

### Emergency Procedures

```bash
# Emergency: Disable SSL (NOT RECOMMENDED)
# Only for debugging - re-enable immediately after
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/ssl" \
    -H "Authorization: Bearer $API_TOKEN" \
    -d '{"value": "off"}'

# Emergency: Purge cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $API_TOKEN" \
    -d '{"purge_everything": true}'

# Emergency: Restart all services
cd /Users/jeremy/dev/SIN-Solver
make restart-all
```

---

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Owner:** Infrastructure Team  
**Review Cycle:** Monthly
