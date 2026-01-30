# PHASE D: PRODUCTION ROCKET.CHAT INTEGRATION
**Status**: Ready to Execute  
**Estimated Duration**: 30-40 minutes  
**Date**: 2026-01-30  

---

## 📋 OVERVIEW

Phase D transitions the alerting system from **test mode** (localhost:9999) to **production mode** (real Rocket.Chat webhooks). This document provides step-by-step instructions for setting up production webhook integration.

---

## ✅ PRE-REQUISITES

- [ ] Rocket.Chat admin access (https://delqhi.chat/admin)
- [ ] Services running: alertmanager (9093), webhook adapter (8093)
- [ ] Current .env file exists with test URLs
- [ ] Git branch: `feature/security-hardening-2026-01-30`

---

## 🚀 STEP-BY-STEP EXECUTION

### STEP 1: Create Three Webhook URLs in Rocket.Chat (10 min)

**Location**: https://delqhi.chat/admin

**Webhook 1: Critical Alerts**

```
1. Administration → Workspace → Integrations
2. Click "New Integration"
3. Select "Incoming Webhook"
4. Fill Form:
   - Name: "Alertmanager Critical"
   - Description: "Critical P1 alerts from monitoring system"
   - Channel: #alerts-critical
   - Post As: alertmanager (or service account)
   - Script Enabled: OFF (we format in Python adapter)
   - Active: ON
5. Click "Save"
6. COPY WEBHOOK URL (will look like):
   https://delqhi.chat/hooks/incoming/abc123def456ghi789jkl012mno345
```

**Expected Output**:
```
Integration created successfully
Webhook URL: https://delqhi.chat/hooks/incoming/[CRITICAL_ID]
```

**Webhook 2: Warning Alerts**

Repeat above with:
- Name: "Alertmanager Warning"
- Channel: #alerts-warning
- Copy webhook URL → COPY THIS URL

**Webhook 3: Info Alerts**

Repeat above with:
- Name: "Alertmanager Info"  
- Channel: #alerts-info
- Copy webhook URL → COPY THIS URL

**After Step 1**:
You should have 3 webhook URLs:
```
🔴 CRITICAL: https://delqhi.chat/hooks/incoming/[CRITICAL_ID]
🟡 WARNING:  https://delqhi.chat/hooks/incoming/[WARNING_ID]
🔵 INFO:     https://delqhi.chat/hooks/incoming/[INFO_ID]
```

---

### STEP 2: Update .env with Production URLs (5 min)

```bash
# Navigate to monitoring directory
cd /Users/jeremy/dev/SIN-Solver/Docker/builders/builder-1.1-captcha-worker/monitoring

# Edit .env file
nano .env

# REPLACE test URLs with real ones:
# FROM:
ROCKETCHAT_WEBHOOK_CRITICAL=http://localhost:9999/hooks/incoming/test-critical
ROCKETCHAT_WEBHOOK_WARNING=http://localhost:9999/hooks/incoming/test-warning
ROCKETCHAT_WEBHOOK_INFO=http://localhost:9999/hooks/incoming/test-info

# TO:
ROCKETCHAT_WEBHOOK_CRITICAL=https://delqhi.chat/hooks/incoming/[CRITICAL_ID]
ROCKETCHAT_WEBHOOK_WARNING=https://delqhi.chat/hooks/incoming/[WARNING_ID]
ROCKETCHAT_WEBHOOK_INFO=https://delqhi.chat/hooks/incoming/[INFO_ID]

# Save: Ctrl+X, Y, Enter
```

**Verification**:
```bash
# Verify .env was updated
cat .env | grep ROCKETCHAT

# Should show 3 lines with delqhi.chat URLs (not localhost)
```

---

### STEP 3: Restart Webhook Adapter with New Configuration (3 min)

```bash
# In the monitoring directory
cd /Users/jeremy/dev/SIN-Solver/Docker/builders/builder-1.1-captcha-worker/monitoring

# Reload environment and restart the adapter
docker-compose down rocketchat-webhook-adapter
docker-compose up -d rocketchat-webhook-adapter

# Verify it's healthy
sleep 2
curl http://localhost:8093/health | jq .

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-01-30T13:45:00Z",
  "version": "1.0.0"
}

# Check logs for any startup errors
docker-compose logs rocketchat-webhook-adapter --tail 30
```

**If restart fails**:
```bash
# Check error logs
docker-compose logs rocketchat-webhook-adapter | tail -50 | grep -E "ERROR|WARN"

# Verify .env is correct
cat .env

# Restart with debug output
docker-compose up rocketchat-webhook-adapter
# (Ctrl+C to stop)
```

---

### STEP 4: Send Test Critical Alert to Production Rocket.Chat (5 min)

```bash
# Create test payload
cat > /tmp/test-critical-production.json << 'EOF'
{
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "severity": "critical",
        "alertname": "CaptchaServiceDown"
      },
      "annotations": {
        "summary": "Captcha Service is DOWN - P1 CRITICAL",
        "description": "The captcha solving service has been unreachable for more than 1 minute. All captcha solving operations are failing."
      },
      "startsAt": "2026-01-30T13:45:00Z",
      "endsAt": "0001-01-01T00:00:00Z"
    }
  ]
}
EOF

# Send to webhook adapter
curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d @/tmp/test-critical-production.json -v

# Expected HTTP response: 200 OK
# Check webhook adapter logs
docker-compose logs rocketchat-webhook-adapter --tail 5
```

**At this point, check Rocket.Chat**:

```
1. Open Rocket.Chat: https://delqhi.chat
2. Navigate to #alerts-critical channel
3. Look for alert message:

   🔴 CRITICAL: CaptchaServiceDown
   Service is DOWN - P1 CRITICAL
   
   The captcha solving service has been unreachable for more than 1 minute.
   All captcha solving operations are failing.
   
   [Started: 2026-01-30 13:45:00 UTC]
```

If message appears → ✅ SUCCESS! Production integration working.

---

### STEP 5: Test All Three Severity Levels (5 min)

**Test Warning Alert**:
```bash
cat > /tmp/test-warning-production.json << 'EOF'
{
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "severity": "warning",
        "alertname": "CaptchaHighLatency"
      },
      "annotations": {
        "summary": "Captcha solving latency is HIGH - P2 WARNING",
        "description": "Average captcha solving time exceeded 5 seconds threshold"
      },
      "startsAt": "2026-01-30T13:47:00Z",
      "endsAt": "0001-01-01T00:00:00Z"
    }
  ]
}
EOF

curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d @/tmp/test-warning-production.json

# Check #alerts-warning in Rocket.Chat
```

**Test Info Alert**:
```bash
cat > /tmp/test-info-production.json << 'EOF'
{
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "severity": "info",
        "alertname": "CaptchaMetricsUpdated"
      },
      "annotations": {
        "summary": "Captcha metrics updated - P3 INFO",
        "description": "Daily captcha solving metrics have been computed"
      },
      "startsAt": "2026-01-30T13:48:00Z",
      "endsAt": "0001-01-01T00:00:00Z"
    }
  ]
}
EOF

curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d @/tmp/test-info-production.json

# Check #alerts-info in Rocket.Chat
```

**Expected Results**:

| Channel | Alert Type | Status | Evidence |
|---------|-----------|--------|----------|
| #alerts-critical | CaptchaServiceDown | ✅ PASS | Message appears immediately |
| #alerts-warning | CaptchaHighLatency | ✅ PASS | Message appears (batched) |
| #alerts-info | CaptchaMetricsUpdated | ✅ PASS | Message appears (batched) |

---

### STEP 6: Verify Alert Recovery (Resolved) Notifications (3 min)

Send a "resolved" alert to verify the system also handles alert recovery:

```bash
cat > /tmp/test-resolved.json << 'EOF'
{
  "status": "firing",
  "alerts": [
    {
      "status": "resolved",
      "labels": {
        "severity": "critical",
        "alertname": "CaptchaServiceDown"
      },
      "annotations": {
        "summary": "Captcha Service is BACK ONLINE - RESOLVED",
        "description": "The captcha solving service has recovered and is now operational"
      },
      "startsAt": "2026-01-30T13:45:00Z",
      "endsAt": "2026-01-30T13:50:00Z"
    }
  ]
}
EOF

curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d @/tmp/test-resolved.json

# Check #alerts-critical for recovery message
# Should show: ✅ RESOLVED: CaptchaServiceDown
```

---

## 🎯 PHASE D SUCCESS CRITERIA

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 3 webhooks created in Rocket.Chat | ✅ | Admin panel shows 3 integrations |
| .env updated with real URLs | ✅ | `cat .env \| grep delqhi.chat` shows 3 URLs |
| Webhook adapter restarted | ✅ | `curl http://localhost:8093/health` returns 200 |
| Critical alert delivers to #alerts-critical | ✅ | Message visible in channel |
| Warning alert delivers to #alerts-warning | ✅ | Message visible in channel |
| Info alert delivers to #alerts-info | ✅ | Message visible in channel |
| Alert recovery (resolved) notifications work | ✅ | Recovery message appears |
| No errors in webhook adapter logs | ✅ | `docker logs` shows no ERROR entries |

---

## 🔧 TROUBLESHOOTING PHASE D

### Issue: Webhook Adapter Won't Restart

```bash
# Check for startup errors
docker-compose logs rocketchat-webhook-adapter | grep -E "ERROR|WARN"

# Check if port 8093 is in use
lsof -i :8093

# Verify .env syntax
cat .env

# Check if Flask is installed
docker-compose exec rocketchat-webhook-adapter pip list | grep -i flask
```

**Solution**: Verify .env has valid URLs and no special characters.

### Issue: Alerts Not Appearing in Rocket.Chat

```bash
# 1. Test webhook URL directly
curl -X POST https://delqhi.chat/hooks/incoming/[YOUR_WEBHOOK_ID] \
  -H "Content-Type: application/json" \
  -d '{"text":"Test message"}'

# 2. Check webhook is active in Rocket.Chat admin
# Administration → Integrations → Click webhook → Check "Active" box

# 3. Verify correct channel was selected
# Administration → Integrations → Click webhook → Channel should show #alerts-critical

# 4. Check adapter logs
docker-compose logs rocketchat-webhook-adapter | tail -20
```

**Solution**: Verify webhook exists, is active, and correct channel is selected.

### Issue: 500 Error When Sending Alert

```bash
# Check webhook adapter error details
docker-compose logs rocketchat-webhook-adapter --tail 50 | grep -A 5 "500"

# Verify Rocket.Chat is accessible
curl https://delqhi.chat/api/v1/info

# Check .env has valid HTTPS URLs
cat .env | grep ROCKETCHAT
```

**Solution**: Verify Rocket.Chat is accessible and webhook URL is valid.

---

## 📊 PHASE D DELIVERABLES

### Files Created/Modified

| File | Change | Status |
|------|--------|--------|
| **.env** | Updated with production URLs | ✅ MODIFIED |
| **alertmanager.yml** | Already configured, no change needed | ✅ OK |
| **rocketchat-webhook.py** | Already running, no change needed | ✅ OK |
| **.env.production** | Template for future setups | ✅ CREATED |

### Git Changes (To be committed in Phase E)

```bash
# Modified files
.env (not committed - keep local)
.env.production (NEW - to be committed)
PHASE-D-COMPLETION.md (NEW - this file, to be committed)

# Webhook URLs stored in Rocket.Chat, not in git
```

---

## ✨ NEXT STEPS (Phase E: Documentation & Completion)

Once Phase D is complete and verified:

1. **Update LASTCHANGES.md** - Record what was done in Phase D
2. **Create SESSION-COMPLETION-2026-01-30.md** - Summary of entire session
3. **Commit all changes** - Phase D production integration complete
4. **Push to remote** - Backup to GitHub

---

## 📝 QUICK REFERENCE

### Health Checks
```bash
# All services healthy?
docker-compose ps

# Webhook adapter responding?
curl http://localhost:8093/health

# Alertmanager running?
curl http://localhost:9093/-/healthy
```

### Send Test Alert
```bash
curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d '{"status":"firing","alerts":[{"labels":{"severity":"critical","alertname":"TEST"},"annotations":{"summary":"Test alert"}}]}'
```

### View Logs
```bash
docker-compose logs -f rocketchat-webhook-adapter
```

### Check Webhook URLs
```bash
cat .env | grep ROCKETCHAT
```

---

**Phase D Status**: ✅ READY TO EXECUTE  
**Estimated Completion**: ~30-40 minutes  
**Next Phase**: Phase E (Documentation & Session Completion)

---

*Generated: 2026-01-30 13:15 UTC+1*
