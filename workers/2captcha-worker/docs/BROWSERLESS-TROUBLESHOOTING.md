# Browserless Infrastructure Troubleshooting Guide

**Version:** 1.0  
**Last Updated:** 2026-01-31  
**Scope:** SIN-Solver 2Captcha Worker Infrastructure  
**Audience:** DevOps Engineers, SREs, Backend Developers

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Reference](#quick-reference)
3. [CDP Connection Issues](#cdp-connection-issues)
4. [Session Timeouts](#session-timeouts)
5. [Resource Exhaustion](#resource-exhaustion)
6. [Load Balancer Failures](#load-balancer-failures)
7. [Connection Pool Exhaustion](#connection-pool-exhaustion)
8. [Emergency Procedures](#emergency-procedures)
9. [Diagnostic Commands](#diagnostic-commands)
10. [Appendix](#appendix)

---

## Overview

Browserless is a critical infrastructure component for the SIN-Solver 2Captcha Worker, providing headless Chrome instances via Chrome DevTools Protocol (CDP). This guide covers common failure modes, diagnostic procedures, and resolution steps for production incidents.

### Architecture Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BROWSERLESS INFRASTRUCTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Load Balancer (HAProxy)                       │   │
│  │                    Port: 3000 (Internal: 172.20.0.20)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                        │
│                    │               │               │                        │
│                    ▼               ▼               ▼                        │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐   │
│  │   Browserless Node 1 │ │   Browserless Node 2 │ │   Browserless Node N │   │
│  │   Port: 3001        │ │   Port: 3002        │ │   Port: 300N        │   │
│  │   Chrome Pool: 10   │ │   Chrome Pool: 10   │ │   Chrome Pool: 10   │   │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Redis Session Store                          │   │
│  │                    Port: 6379 (Internal: 172.20.0.21)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Active Sessions | > 80% of pool | > 95% of pool |
| Connection Errors | > 5/min | > 20/min |
| Session Duration | > 5 min | > 10 min |
| Memory Usage | > 80% | > 95% |
| CPU Usage | > 70% | > 90% |
| Response Time | > 2s | > 5s |

---

## Quick Reference

### Common Error Messages

| Error Message | Category | Severity | Quick Fix |
|--------------|----------|----------|-----------|
| `TimeoutError: Navigation timeout of 30000 ms exceeded` | Session Timeout | Medium | Increase timeout or check target URL |
| `WebSocket was closed before the connection was established` | CDP Connection | High | Check network, restart Chrome |
| `net::ERR_CONNECTION_REFUSED` | CDP Connection | High | Verify Browserless is running |
| `Protocol error (Runtime.callFunctionOn): Target closed` | Session Timeout | Medium | Session expired, create new one |
| `Error: Page crashed!` | Resource Exhaustion | Critical | Restart Chrome, check memory |
| `ECONNREFUSED 172.20.0.20:3000` | Load Balancer | Critical | Check HAProxy status |
| `Timeout acquiring connection from pool` | Pool Exhaustion | Critical | Scale up or reduce concurrency |
| `Browserless is at capacity` | Pool Exhaustion | Critical | Add more nodes or reduce load |

### Health Check Commands

```bash
# Check Browserless health
curl -s http://172.20.0.20:3000/json/version | jq .

# Check active sessions
curl -s http://172.20.0.20:3000/json/list | jq length

# Check HAProxy stats
curl -s http://172.20.0.20:8404/stats | grep -E "(svname|status)"

# Check Redis connection
redis-cli -h 172.20.0.21 -p 6379 ping

# Check Docker container status
docker ps --filter "name=browserless" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## CDP Connection Issues

### Problem Description

Chrome DevTools Protocol (CDP) connection failures prevent the 2Captcha Worker from communicating with headless Chrome instances. These issues manifest as WebSocket errors, connection timeouts, or protocol errors.

### Symptoms

- **WebSocket handshake failures**: `WebSocket was closed before the connection was established`
- **Connection refused**: `net::ERR_CONNECTION_REFUSED`
- **Protocol errors**: `Protocol error (Runtime.callFunctionOn): Session closed`
- **Timeout errors**: `TimeoutError: waiting for target failed`
- **Intermittent disconnects**: Sessions drop unexpectedly during execution

### Root Causes

#### 1. Network Connectivity Issues

**Cause:** Network partitioning, firewall rules, or DNS resolution failures between the worker and Browserless nodes.

**Diagnosis:**
```bash
# Test connectivity to Browserless
ping -c 3 172.20.0.20

# Test port connectivity
nc -zv 172.20.0.20 3000

# Check network routes
ip route get 172.20.0.20

# Verify DNS resolution
nslookup browserless.delqhi.com
```

**Solution:**
1. Verify network connectivity between containers
2. Check Docker network configuration
3. Ensure no firewall rules block port 3000
4. Verify DNS resolution is working

#### 2. Chrome Process Crashes

**Cause:** Chrome instances crash due to memory pressure, JavaScript errors, or resource limits.

**Diagnosis:**
```bash
# Check Chrome process status
docker exec browserless-node-1 ps aux | grep chrome

# Check for crash dumps
docker exec browserless-node-1 ls -la /tmp/crash*.dmp 2>/dev/null

# Check Chrome logs
docker logs browserless-node-1 --tail 100 | grep -i "crash\|error\|fatal"

# Check system resources
docker stats browserless-node-1 --no-stream
```

**Solution:**
1. Restart the affected Chrome instance
2. Check memory limits and increase if necessary
3. Review Chrome flags for stability
4. Enable crash reporting for analysis

#### 3. WebSocket Protocol Mismatch

**Cause:** Client and server WebSocket protocol versions are incompatible.

**Diagnosis:**
```bash
# Check WebSocket handshake
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  http://172.20.0.20:3000/

# Check Browserless version
curl -s http://172.20.0.20:3000/json/version | jq -r '.Browser'
```

**Solution:**
1. Update Browserless to latest version
2. Ensure client library compatibility
3. Check WebSocket client configuration

#### 4. SSL/TLS Certificate Issues

**Cause:** Certificate validation failures when connecting via HTTPS.

**Diagnosis:**
```bash
# Test SSL connection
openssl s_client -connect browserless.delqhi.com:443 -servername browserless.delqhi.com

# Check certificate expiration
echo | openssl s_client -servername browserless.delqhi.com -connect browserless.delqhi.com:443 2>/dev/null | openssl x509 -noout -dates

# Verify certificate chain
echo | openssl s_client -connect browserless.delqhi.com:443 2>/dev/null | openssl x509 -noout -text | grep -A2 "Subject Alternative Name"
```

**Solution:**
1. Renew expired certificates
2. Update CA certificates on client
3. Configure certificate verification properly

### Resolution Steps

**Step 1: Verify Service Availability**
```bash
# Check if Browserless is responding
curl -s http://172.20.0.20:3000/json/version

# Expected output:
# {
#   "Browser": "Chrome/120.0.6099.109",
#   "Protocol-Version": "1.3",
#   "User-Agent": "Mozilla/5.0...",
#   "V8-Version": "12.0.267.10",
#   "WebKit-Version": "537.36 (@...)"
# }
```

**Step 2: Check Active Sessions**
```bash
# List active debugging sessions
curl -s http://172.20.0.20:3000/json/list | jq '.[] | {id: .id, url: .url, type: .type}'

# Count active sessions
curl -s http://172.20.0.20:3000/json/list | jq length
```

**Step 3: Restart Affected Chrome Instance**
```bash
# Gracefully restart Chrome
docker exec browserless-node-1 pkill -f "chrome" || true

# Wait for restart
sleep 5

# Verify Chrome is running
docker exec browserless-node-1 pgrep -f "chrome"
```

**Step 4: Verify Connection from Worker**
```bash
# Test from 2captcha-worker container
docker exec 2captcha-worker curl -s http://172.20.0.20:3000/json/version

# Test WebSocket connection
docker exec 2captcha-worker wscat -c ws://172.20.0.20:3000/
```

### Prevention

1. **Implement Connection Retries**: Use exponential backoff for connection attempts
2. **Health Checks**: Regularly poll `/json/version` endpoint
3. **Circuit Breaker**: Fail fast when connections repeatedly fail
4. **Monitoring**: Alert on connection error rates
5. **Resource Limits**: Set appropriate memory and CPU limits

---

## Session Timeouts

### Problem Description

Browserless sessions expire or timeout before completing their intended operations, causing task failures and requiring re-authentication or re-execution.

### Symptoms

- `TimeoutError: Navigation timeout of 30000 ms exceeded`
- `Protocol error (Runtime.callFunctionOn): Target closed`
- `Error: Protocol error (Page.navigate): Session closed`
- Sessions disappear from `/json/list` unexpectedly
- Tasks fail mid-execution with session errors

### Root Causes

#### 1. Default Timeout Exceeded

**Cause:** Operations take longer than the default timeout (30 seconds for navigation).

**Diagnosis:**
```bash
# Check session duration in logs
docker logs browserless-node-1 --tail 500 | grep -E "session|timeout|duration"

# Monitor session lifecycle
curl -s http://172.20.0.20:3000/json/list | jq -r '.[] | "\(.id): \(.url)"'
```

**Solution:**
```javascript
// Increase timeout in client code
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://172.20.0.20:3000',
  defaultViewport: null,
});

const page = await browser.newPage();

// Set longer navigation timeout
page.setDefaultNavigationTimeout(60000); // 60 seconds
page.setDefaultTimeout(60000);

// Or per-operation timeout
await page.goto('https://example.com', {
  waitUntil: 'networkidle2',
  timeout: 120000, // 2 minutes
});
```

#### 2. Idle Session Timeout

**Cause:** Sessions are closed after a period of inactivity (default: 5 minutes).

**Diagnosis:**
```bash
# Check Browserless configuration
docker exec browserless-node-1 env | grep -i timeout

# Check for idle session cleanup
docker logs browserless-node-1 --tail 1000 | grep -i "idle\|cleanup\|expired"
```

**Solution:**
```yaml
# docker-compose.yml - Increase idle timeout
services:
  browserless-node-1:
    image: browserless/chrome:latest
    environment:
      - CONNECTION_TIMEOUT=600000  # 10 minutes in ms
      - MAX_CONCURRENT_SESSIONS=10
      - MAX_QUEUE_LENGTH=100
```

#### 3. Chrome Process Timeout

**Cause:** Chrome processes are killed after a maximum lifetime to prevent resource leaks.

**Diagnosis:**
```bash
# Check Chrome process uptime
docker exec browserless-node-1 ps -eo pid,etime,comm | grep chrome

# Check for process restarts
docker logs browserless-node-1 | grep -i "restart\|spawn\|kill"
```

**Solution:**
```yaml
# docker-compose.yml - Adjust Chrome lifecycle
services:
  browserless-node-1:
    environment:
      - CHROME_REFRESH_TIME=3600000  # 1 hour in ms
      - KEEP_ALIVE=true
```

#### 4. Long-Running Operations

**Cause:** CAPTCHA solving, file downloads, or complex page interactions exceed timeouts.

**Diagnosis:**
```bash
# Monitor operation duration in application logs
docker logs 2captcha-worker --tail 1000 | grep -E "duration|elapsed|took"

# Check for stuck operations
docker exec browserless-node-1 ps aux | grep chrome
```

**Solution:**
```javascript
// Implement progress tracking and keepalive
async function solveCaptchaWithKeepalive(page, maxDuration = 300000) {
  const startTime = Date.now();
  const keepaliveInterval = setInterval(async () => {
    if (Date.now() - startTime > maxDuration) {
      clearInterval(keepaliveInterval);
      throw new Error('CAPTCHA solving timeout');
    }
    // Keep session alive with a no-op
    try {
      await page.evaluate(() => document.title);
    } catch (e) {
      clearInterval(keepaliveInterval);
    }
  }, 30000); // Every 30 seconds

  try {
    // Your CAPTCHA solving logic here
    const result = await solveCaptcha(page);
    return result;
  } finally {
    clearInterval(keepaliveInterval);
  }
}
```

### Resolution Steps

**Step 1: Identify Timeout Type**
```bash
# Check if it's a navigation timeout
docker logs 2captcha-worker --tail 100 | grep -i "navigation timeout"

# Check if it's a session timeout
docker logs 2captcha-worker --tail 100 | grep -i "session closed\|target closed"
```

**Step 2: Adjust Timeouts**
```javascript
// In your worker code
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://172.20.0.20:3000',
});

const page = await browser.newPage();

// Global timeout settings
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(120000);

// For specific operations
await page.goto(url, { timeout: 180000 });
await page.waitForSelector('.captcha', { timeout: 60000 });
```

**Step 3: Implement Retry Logic**
```javascript
async function withRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (!error.message.includes('timeout')) throw error;
      
      console.log(`Timeout, retrying (${i + 1}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}
```

### Prevention

1. **Set Appropriate Timeouts**: Base timeouts on expected operation duration
2. **Monitor Session Health**: Regular health checks during long operations
3. **Implement Keepalive**: Prevent idle timeout during long operations
4. **Graceful Degradation**: Handle timeouts without crashing
5. **Logging**: Log all timeout events for analysis

---

## Resource Exhaustion

### Problem Description

Browserless nodes run out of system resources (memory, CPU, disk space, file descriptors), causing degraded performance or complete failure.

### Symptoms

- `Error: Page crashed!`
- `Error: Protocol error (Target.createTarget): Target creation failed`
- `ENOMEM: memory allocation failed`
- `ENOSPC: no space left on device`
- `EMFILE: too many open files`
- High CPU usage (>90% sustained)
- Slow response times
- Chrome processes being killed by OOM killer

### Root Causes

#### 1. Memory Exhaustion

**Cause:** Chrome instances consume excessive memory due to memory leaks, large pages, or too many concurrent sessions.

**Diagnosis:**
```bash
# Check memory usage
docker stats browserless-node-1 --no-stream

# Check system memory
free -h

# Check Chrome memory usage
docker exec browserless-node-1 ps aux --sort=-%mem | head -20

# Check for memory leaks (increasing over time)
watch -n 5 'docker stats browserless-node-1 --no-stream'

# Check OOM killer logs
dmesg | grep -i "killed process\|out of memory"
```

**Solution:**
```yaml
# docker-compose.yml - Memory limits
services:
  browserless-node-1:
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
    environment:
      - MAX_CONCURRENT_SESSIONS=5  # Reduce if memory constrained
      - CHROME_FLAGS="--max_old_space_size=2048 --disable-dev-shm-usage"
```

```javascript
// Client-side memory management
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://172.20.0.20:3000',
});

// Close pages when done
const page = await browser.newPage();
try {
  await performOperation(page);
} finally {
  await page.close(); // Important: Release memory
}
```

#### 2. CPU Exhaustion

**Cause:** Complex JavaScript execution, heavy DOM manipulation, or too many concurrent operations.

**Diagnosis:**
```bash
# Check CPU usage
docker stats browserless-node-1 --no-stream

# Check per-process CPU
docker exec browserless-node-1 ps aux --sort=-%cpu | head -20

# Check load average
uptime

# Monitor over time
sar -u 1 10
```

**Solution:**
```yaml
# docker-compose.yml - CPU limits
services:
  browserless-node-1:
    deploy:
      resources:
        limits:
          cpus: '2.0'
        reservations:
          cpus: '1.0'
```

```javascript
// Throttle operations
const pLimit = require('p-limit');
const limit = pLimit(3); // Max 3 concurrent operations

const results = await Promise.all(
  urls.map(url => limit(() => processUrl(url)))
);
```

#### 3. Disk Space Exhaustion

**Cause:** Chrome profiles, downloads, logs, or core dumps filling up disk.

**Diagnosis:**
```bash
# Check disk usage
df -h

# Check Docker volume usage
docker system df -v

# Find large files
docker exec browserless-node-1 du -sh /tmp/* 2>/dev/null | sort -hr | head -10
docker exec browserless-node-1 du -sh /home/chromium/* 2>/dev/null | sort -hr | head -10

# Check for core dumps
docker exec browserless-node-1 find /tmp -name "*.dmp" -size +10M

# Check log sizes
docker logs browserless-node-1 --tail 0 2>&1 | wc -c
```

**Solution:**
```bash
# Clean up core dumps
docker exec browserless-node-1 find /tmp -name "*.dmp" -delete

# Clean up old profiles
docker exec browserless-node-1 find /tmp -type d -name "puppeteer_dev_chrome_profile*" -mtime +1 -exec rm -rf {} + 2>/dev/null

# Prune Docker logs
docker system prune -f
docker volume prune -f
```

```yaml
# docker-compose.yml - Log rotation
services:
  browserless-node-1:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"
```

#### 4. File Descriptor Exhaustion

**Cause:** Too many open files (sockets, pipes, files) without proper cleanup.

**Diagnosis:**
```bash
# Check open file descriptors
docker exec browserless-node-1 cat /proc/sys/fs/file-nr

# Check per-process limits
docker exec browserless-node-1 cat /proc/$(pgrep chrome | head -1)/limits | grep "Max open files"

# Count open files by process
docker exec browserless-node-1 lsof | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
```

**Solution:**
```yaml
# docker-compose.yml - Increase file limits
services:
  browserless-node-1:
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
```

```javascript
// Ensure proper cleanup
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://172.20.0.20:3000',
});

try {
  const page = await browser.newPage();
  // ... operations ...
  await page.close();
} finally {
  await browser.disconnect(); // Important: Close WebSocket
}
```

### Resolution Steps

**Step 1: Identify Resource Type**
```bash
# Check all resources
docker stats browserless-node-1 --no-stream
df -h
free -h
```

**Step 2: Immediate Relief**
```bash
# Restart container to free resources
docker restart browserless-node-1

# Or scale up temporarily
docker-compose up -d --scale browserless-node=5
```

**Step 3: Implement Limits**
```yaml
# docker-compose.yml
services:
  browserless-node-1:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"
```

**Step 4: Monitor and Alert**
```bash
# Set up monitoring script
#!/bin/bash
# monitor-resources.sh

CONTAINER="browserless-node-1"
MEMORY_THRESHOLD=80
CPU_THRESHOLD=80

while true; do
  STATS=$(docker stats $CONTAINER --no-stream --format "{{.MemPerc}},{{.CPUPerc}}")
  MEM=$(echo $STATS | cut -d',' -f1 | tr -d '%')
  CPU=$(echo $STATS | cut -d',' -f2 | tr -d '%')
  
  if (( $(echo "$MEM > $MEMORY_THRESHOLD" | bc -l) )); then
    echo "$(date): WARNING: Memory usage at ${MEM}%" >&2
  fi
  
  if (( $(echo "$CPU > $CPU_THRESHOLD" | bc -l) )); then
    echo "$(date): WARNING: CPU usage at ${CPU}%" >&2
  fi
  
  sleep 30
done
```

### Prevention

1. **Resource Limits**: Set hard limits on CPU, memory, and disk
2. **Auto-scaling**: Scale horizontally when resources are constrained
3. **Monitoring**: Real-time alerts on resource usage
4. **Cleanup**: Regular cleanup of temporary files and old sessions
5. **Circuit Breaker**: Stop accepting new sessions when resources are low

---

## Load Balancer Failures

### Problem Description

HAProxy load balancer fails to distribute traffic correctly, causing uneven load distribution, dropped connections, or complete service unavailability.

### Symptoms

- `ECONNREFUSED 172.20.0.20:3000`
- `Error: connect ECONNREFUSED`
- Uneven load across nodes (some nodes at 100%, others idle)
- Requests timing out at load balancer
- Health check failures
- SSL/TLS handshake errors

### Root Causes

#### 1. HAProxy Configuration Errors

**Cause:** Misconfigured backends, incorrect health checks, or wrong port mappings.

**Diagnosis:**
```bash
# Check HAProxy configuration
haproxy -c -f /etc/haproxy/haproxy.cfg

# Check HAProxy logs
docker logs haproxy --tail 100

# Check HAProxy stats
curl -s http://172.20.0.20:8404/stats | grep -E "(svname|status|check_status)"

# Check backend status
echo "show stat" | docker exec -i haproxy socat stdio /var/run/haproxy.sock
```

**Solution:**
```haproxy
# /etc/haproxy/haproxy.cfg
global
    maxconn 4096
    stats socket /var/run/haproxy.sock mode 600 expose-fd listeners level user

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httpchk GET /json/version
    http-check expect status 200

frontend browserless_frontend
    bind *:3000
    default_backend browserless_backend

backend browserless_backend
    balance roundrobin
    option httpchk GET /json/version
    http-check expect status 200
    server node1 172.20.0.21:3001 check inter 5s rise 2 fall 3
    server node2 172.20.0.22:3002 check inter 5s rise 2 fall 3
    server node3 172.20.0.23:3003 check inter 5s rise 2 fall 3 backup
```

#### 2. Backend Node Failures

**Cause:** Browserless nodes are down or unresponsive.

**Diagnosis:**
```bash
# Check individual nodes
curl -s http://172.20.0.21:3001/json/version
curl -s http://172.20.0.22:3002/json/version
curl -s http://172.20.0.23:3003/json/version

# Check Docker container status
docker ps --filter "name=browserless-node" --format "table {{.Names}}\t{{.Status}}"

# Check node logs
docker logs browserless-node-1 --tail 50
```

**Solution:**
```bash
# Restart failed nodes
docker restart browserless-node-1
docker restart browserless-node-2

# Verify nodes are healthy before adding back to pool
until curl -s http://172.20.0.21:3001/json/version > /dev/null; do
  echo "Waiting for node1..."
  sleep 2
done
```

#### 3. Health Check Failures

**Cause:** Health checks are too aggressive, wrong endpoint, or nodes are temporarily overloaded.

**Diagnosis:**
```bash
# Check health check logs
docker logs haproxy --tail 200 | grep -i "health\|check"

# Manually test health check endpoint
curl -v http://172.20.0.21:3001/json/version

# Check response time
time curl -s http://172.20.0.21:3001/json/version
```

**Solution:**
```haproxy
# Adjust health check parameters
backend browserless_backend
    balance roundrobin
    option httpchk GET /json/version
    http-check expect status 200
    # Less aggressive checks
    server node1 172.20.0.21:3001 check inter 10s rise 3 fall 5
    # Longer timeout for overloaded nodes
    timeout check 10s
```

#### 4. SSL/TLS Termination Issues

**Cause:** Certificate problems, cipher mismatches, or protocol version issues.

**Diagnosis:**
```bash
# Test SSL connection
openssl s_client -connect browserless.delqhi.com:443 -servername browserless.delqhi.com

# Check certificate
echo | openssl s_client -servername browserless.delqhi.com -connect browserless.delqhi.com:443 2>/dev/null | openssl x509 -noout -text

# Check HAProxy SSL configuration
docker exec haproxy cat /etc/haproxy/haproxy.cfg | grep -A10 "bind.*ssl"
```

**Solution:**
```haproxy
frontend browserless_ssl
    bind *:443 ssl crt /etc/ssl/certs/browserless.pem alpn h2,http/1.1
    
    # Modern TLS configuration
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
    
    default_backend browserless_backend
```

#### 5. Connection Limit Exceeded

**Cause:** HAProxy `maxconn` limit reached, rejecting new connections.

**Diagnosis:**
```bash
# Check current connections
echo "show info" | docker exec -i haproxy socat stdio /var/run/haproxy.sock | grep -E "(CurrConns|MaxConn)"

# Check connection rate
echo "show stat" | docker exec -i haproxy socat stdio /var/run/haproxy.sock | grep browserless_backend
```

**Solution:**
```haproxy
global
    # Increase connection limits
    maxconn 8192
    
defaults
    # Connection limits per backend
    maxconn 1000
```

### Resolution Steps

**Step 1: Verify HAProxy Status**
```bash
# Check if HAProxy is running
docker ps --filter "name=haproxy"

# Check HAProxy logs
docker logs haproxy --tail 100

# Check HAProxy stats page
curl -s http://172.20.0.20:8404/stats
```

**Step 2: Test Backend Nodes Directly**
```bash
# Test each node bypassing load balancer
curl -s http://172.20.0.21:3001/json/version
curl -s http://172.20.0.22:3002/json/version

# If direct connection works, problem is with HAProxy
# If direct connection fails, problem is with nodes
```

**Step 3: Reload HAProxy Configuration**
```bash
# Test configuration first
docker exec haproxy haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload gracefully
docker exec haproxy kill -HUP 1

# Or restart if necessary
docker restart haproxy
```

**Step 4: Verify Load Distribution**
```bash
# Monitor load distribution
watch -n 2 'curl -s http://172.20.0.20:8404/stats | grep -E "(svname|status|lastchg)"'
```

### Prevention

1. **Health Checks**: Configure appropriate health check intervals and thresholds
2. **Monitoring**: Alert on backend failures and uneven load distribution
3. **Graceful Shutdown**: Implement graceful shutdown for backend nodes
4. **Backup Nodes**: Configure backup nodes for failover
5. **Rate Limiting**: Protect against connection floods

---

## Connection Pool Exhaustion

### Problem Description

All available Chrome sessions are in use, and new requests cannot be served, causing queue buildup and request timeouts.

### Symptoms

- `Timeout acquiring connection from pool`
- `Browserless is at capacity`
- Long queue times before session acquisition
- `ECONNREFUSED` or connection timeouts
- Increasing request latency
- Queue length growing continuously

### Root Causes

#### 1. Insufficient Pool Size

**Cause:** Pool size is too small for the current workload.

**Diagnosis:**
```bash
# Check current pool usage
curl -s http://172.20.0.20:3000/json/list | jq length

# Check queue length
curl -s http://172.20.0.20:3000/metrics | grep -i "queue"

# Monitor over time
watch -n 1 'curl -s http://172.20.0.20:3000/json/list | jq length'
```

**Solution:**
```yaml
# docker-compose.yml - Increase pool size
services:
  browserless-node-1:
    environment:
      - MAX_CONCURRENT_SESSIONS=20
      - MAX_QUEUE_LENGTH=100
```

#### 2. Session Leaks

**Cause:** Sessions are not being properly closed after use.

**Diagnosis:**
```bash
# Check for stale sessions
curl -s http://172.20.0.20:3000/json/list | jq -r '.[] | "\(.id): \(.url)"'

# Check session age
curl -s http://172.20.0.20:3000/json/list | jq '.[] | select(.url | contains("about:blank"))'

# Monitor session count over time
while true; do
  echo "$(date): $(curl -s http://172.20.0.20:3000/json/list | jq length) sessions"
  sleep 5
done
```

**Solution:**
```javascript
// Ensure proper session cleanup
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://172.20.0.20:3000',
});

try {
  const page = await browser.newPage();
  await performOperation(page);
  await page.close();
} catch (error) {
  console.error('Operation failed:', error);
  throw error;
} finally {
  // Always disconnect to release session
  await browser.disconnect();
}
```

#### 3. Long-Running Sessions

**Cause:** Sessions are held open for too long, preventing reuse.

**Diagnosis:**
```bash
# Check session duration
curl -s http://172.20.0.20:3000/json/list | jq '.[] | {id: .id, url: .url}'

# Check for sessions stuck on specific pages
curl -s http://172.20.0.20:3000/json/list | jq '.[] | select(.url | contains("captcha"))'
```

**Solution:**
```javascript
// Implement session timeout
async function withSessionTimeout(operation, maxDuration = 120000) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'ws://172.20.0.20:3000',
  });
  
  const timeout = setTimeout(async () => {
    console.error('Session timeout, forcing close');
    await browser.disconnect();
  }, maxDuration);
  
  try {
    const result = await operation(browser);
    return result;
  } finally {
    clearTimeout(timeout);
    await browser.disconnect();
  }
}
```

#### 4. Uneven Load Distribution

**Cause:** Load balancer is not distributing sessions evenly across nodes.

**Diagnosis:**
```bash
# Check load on each node
curl -s http://172.20.0.21:3001/json/list | jq length
curl -s http://172.20.0.22:3002/json/list | jq length
curl -s http://172.20.0.23:3003/json/list | jq length

# Check HAProxy stats
curl -s http://172.20.0.20:8404/stats | grep -E "(svname|scur|smax)"
```

**Solution:**
```haproxy
# Use leastconn for better distribution
backend browserless_backend
    balance leastconn
    # or use consistent hashing for session affinity
    # balance source
```

#### 5. Sudden Traffic Spikes

**Cause:** Unexpected increase in request volume exceeds pool capacity.

**Diagnosis:**
```bash
# Monitor request rate
docker logs haproxy --tail 1000 | grep -c "HTTP"

# Check queue metrics
curl -s http://172.20.0.20:3000/metrics
```

**Solution:**
```yaml
# docker-compose.yml - Auto-scaling configuration
services:
  browserless-node-1:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 4G
    environment:
      - MAX_CONCURRENT_SESSIONS=15
      - MAX_QUEUE_LENGTH=200
      - CONNECTION_TIMEOUT=60000
```

```bash
# Manual scaling during spikes
docker-compose up -d --scale browserless-node=5
```

### Resolution Steps

**Step 1: Check Current Pool Status**
```bash
# Get pool metrics
echo "Active sessions: $(curl -s http://172.20.0.20:3000/json/list | jq length)"
echo "Queue length: $(curl -s http://172.20.0.20:3000/metrics | grep queue_length | awk '{print $2}')"
```

**Step 2: Identify Stuck Sessions**
```bash
# List all active sessions
curl -s http://172.20.0.20:3000/json/list | jq -r '.[] | "\(.id) | \(.url) | \(.type)"'

# Force close stale sessions (if necessary)
# Note: This should be done carefully in production
for id in $(curl -s http://172.20.0.20:3000/json/list | jq -r '.[].id'); do
  curl -X DELETE "http://172.20.0.20:3000/json/close/$id"
done
```

**Step 3: Scale Up**
```bash
# Quick scale up
docker-compose up -d --scale browserless-node=5

# Or add new nodes
docker-compose up -d browserless-node-4 browserless-node-5

# Update HAProxy to include new nodes
# Edit haproxy.cfg and reload
docker exec haproxy kill -HUP 1
```

**Step 4: Implement Circuit Breaker**
```javascript
// Client-side circuit breaker
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

const breaker = new CircuitBreaker(5, 60000);

// Usage
const result = await breaker.execute(() => getBrowserlessSession());
```

### Prevention

1. **Right-Size Pools**: Size pools based on peak load + buffer
2. **Session Timeouts**: Enforce maximum session duration
3. **Leak Detection**: Monitor for sessions that don't close
4. **Auto-Scaling**: Scale up automatically when pool is near capacity
5. **Queue Limits**: Set reasonable queue limits to fail fast
6. **Circuit Breaker**: Prevent cascading failures

---

## Emergency Procedures

### Critical Incident Response

When Browserless infrastructure is completely down or severely degraded:

#### P0 - Complete Outage

**Symptoms:**
- All requests failing
- No healthy nodes
- Load balancer down

**Immediate Actions:**

1. **Assess Scope** (0-2 minutes)
```bash
# Check all components
docker ps --filter "name=browserless\|haproxy" --format "table {{.Names}}\t{{.Status}}"

# Check network connectivity
ping -c 3 172.20.0.20

# Check if it's a network partition
ip addr show
```

2. **Restart All Services** (2-5 minutes)
```bash
# Emergency restart
docker-compose restart

# Or full recreation
docker-compose down
docker-compose up -d

# Verify recovery
sleep 10
curl -s http://172.20.0.20:3000/json/version
```

3. **Enable Fallback Mode** (5-10 minutes)
```javascript
// In 2captcha-worker: Enable fallback to direct Chrome
const USE_DIRECT_CHROME = true;

if (USE_DIRECT_CHROME) {
  // Launch local Chrome instance
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  return browser;
}
```

4. **Communicate** (Throughout)
- Post incident in #incidents channel
- Update status page
- Notify stakeholders

#### P1 - Severe Degradation

**Symptoms:**
- >50% error rate
- Response times >10s
- Pool exhaustion

**Immediate Actions:**

1. **Scale Up** (Immediate)
```bash
# Emergency scaling
docker-compose up -d --scale browserless-node=10

# Verify new nodes
docker ps --filter "name=browserless-node"
```

2. **Drain and Restart** (5 minutes)
```bash
# Mark nodes for maintenance
docker exec haproxy bash -c 'echo "set server browserless_backend/node1 state drain" | socat stdio /var/run/haproxy.sock'

# Wait for connections to drain
sleep 30

# Restart drained node
docker restart browserless-node-1

# Bring back online
docker exec haproxy bash -c 'echo "set server browserless_backend/node1 state ready" | socat stdio /var/run/haproxy.sock'
```

3. **Enable Queue Buffering**
```javascript
// Implement request queueing with Redis
const Queue = require('bull');
const browserlessQueue = new Queue('browserless', 'redis://172.20.0.21:6379');

// Add job to queue instead of direct execution
await browserlessQueue.add('solve-captcha', {
  imageData: captchaImage,
  type: 'recaptcha',
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
});
```

#### P2 - Partial Degradation

**Symptoms:**
- <50% error rate
- Some nodes unhealthy
- Elevated latency

**Immediate Actions:**

1. **Identify and Isolate**
```bash
# Find unhealthy nodes
curl -s http://172.20.0.20:8404/stats | grep -E "(DOWN|MAINT)"

# Remove from pool
docker exec haproxy bash -c 'echo "set server browserless_backend/node2 state maint" | socat stdio /var/run/haproxy.sock'
```

2. **Diagnose**
```bash
# Check logs of affected node
docker logs browserless-node-2 --tail 500

# Check resources
docker stats browserless-node-2 --no-stream
```

3. **Repair**
```bash
# Restart affected node
docker restart browserless-node-2

# Verify health
until curl -s http://172.20.0.22:3002/json/version > /dev/null; do
  sleep 2
done

# Bring back online
docker exec haproxy bash -c 'echo "set server browserless_backend/node2 state ready" | socat stdio /var/run/haproxy.sock'
```

### Rollback Procedures

#### Configuration Rollback

```bash
# Restore previous configuration
cp /etc/haproxy/haproxy.cfg.bak /etc/haproxy/haproxy.cfg

# Validate and reload
haproxy -c -f /etc/haproxy/haproxy.cfg
docker exec haproxy kill -HUP 1
```

#### Docker Image Rollback

```bash
# Use previous image version
docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or pin specific version
sed -i 's/browserless\/chrome:latest/browserless\/chrome:1.59.0/' docker-compose.yml
docker-compose up -d
```

### Data Recovery

#### Session State Recovery

```bash
# If using Redis for session persistence
# Check Redis for active sessions
redis-cli -h 172.20.0.21 -p 6379 keys "session:*"

# Restore from backup if available
redis-cli -h 172.20.0.21 -p 6379 --pipe < session_backup.redis
```

### Communication Templates

#### Incident Notification

```
🚨 INCIDENT: Browserless Infrastructure

Status: [INVESTIGATING|IDENTIFIED|MONITORING|RESOLVED]
Severity: [P0|P1|P2]
Impact: [Description of user impact]

Start Time: [Timestamp]
Detected By: [Monitoring/Alert/User Report]

Actions Taken:
- [Action 1]
- [Action 2]

Next Update: [Time]
Incident Commander: [Name]
```

#### Status Update

```
📊 UPDATE: Browserless Infrastructure Incident

Status: [Current status]
Elapsed Time: [Duration]

Progress:
✅ [Completed action]
🔄 [In-progress action]
⏳ [Pending action]

Current Metrics:
- Error Rate: [X%]
- Response Time: [Xms]
- Available Nodes: [X/Y]

ETA Resolution: [Time/Unknown]
```

#### Resolution Summary

```
✅ RESOLVED: Browserless Infrastructure Incident

Duration: [X minutes]
Severity: [P0|P1|P2]

Root Cause: [Brief description]

Resolution: [What fixed it]

Follow-up Actions:
- [ ] [Action item 1]
- [ ] [Action item 2]

Post-mortem: [Link to document]
```

---

## Diagnostic Commands

### Quick Diagnostics

```bash
# Full health check script
#!/bin/bash
echo "=== Browserless Health Check ==="
echo ""

echo "1. Docker Containers:"
docker ps --filter "name=browserless\|haproxy" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2. Load Balancer Health:"
curl -s http://172.20.0.20:8404/stats | grep -E "(svname|status)" | head -20
echo ""

echo "3. Active Sessions per Node:"
for node in 172.20.0.21:3001 172.20.0.22:3002 172.20.0.23:3003; do
  count=$(curl -s http://$node/json/list 2>/dev/null | jq length)
  echo "  $node: $count sessions"
done
echo ""

echo "4. Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
echo ""

echo "5. Recent Errors:"
docker logs haproxy --tail 50 2>&1 | grep -i error | tail -5
echo ""

echo "6. Queue Status:"
curl -s http://172.20.0.20:3000/metrics 2>/dev/null | grep -E "(queue|pool)" | head -10
echo ""

echo "=== End Health Check ==="
```

### Deep Diagnostics

```bash
# Network diagnostics
#!/bin/bash
echo "=== Network Diagnostics ==="

# Test connectivity between containers
docker exec 2captcha-worker ping -c 3 172.20.0.20
docker exec 2captcha-worker ping -c 3 172.20.0.21

# Test ports
docker exec 2captcha-worker nc -zv 172.20.0.20 3000
docker exec 2captcha-worker nc -zv 172.20.0.21 3001

# Check DNS resolution
docker exec 2captcha-worker nslookup browserless.delqhi.com

# Trace route
docker exec 2captcha-worker traceroute -n 172.20.0.20

echo "=== End Network Diagnostics ==="
```

### Performance Diagnostics

```bash
# Performance profiling
#!/bin/bash
echo "=== Performance Diagnostics ==="

# Response time distribution
for i in {1..10}; do
  time curl -s http://172.20.0.20:3000/json/version > /dev/null
done

# Concurrent connection test
ab -n 100 -c 10 http://172.20.0.20:3000/json/version

# WebSocket latency test
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://172.20.0.20:3000');
const start = Date.now();
ws.on('open', () => {
  console.log('WebSocket connected in', Date.now() - start, 'ms');
  ws.close();
});
ws.on('error', (e) => console.error('Error:', e.message));
"

echo "=== End Performance Diagnostics ==="
```

---

## Appendix

### A. Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_CONCURRENT_SESSIONS` | 10 | Maximum concurrent Chrome sessions |
| `MAX_QUEUE_LENGTH` | 100 | Maximum queue length for pending sessions |
| `CONNECTION_TIMEOUT` | 30000 | Session timeout in milliseconds |
| `CHROME_REFRESH_TIME` | 3600000 | Chrome process restart interval |
| `KEEP_ALIVE` | false | Keep sessions alive indefinitely |
| `DEBUG` | false | Enable debug logging |
| `PREBOOT_CHROME` | false | Pre-start Chrome instances |
| `MAX_MEMORY_PERCENT` | 90 | Memory threshold for new sessions |
| `MAX_CPU_PERCENT` | 90 | CPU threshold for new sessions |

### B. Chrome Flags Reference

```bash
# Stability flags
--no-sandbox
--disable-setuid-sandbox
--disable-dev-shm-usage
--disable-accelerated-2d-canvas
--disable-gpu

# Memory optimization
--max_old_space_size=2048
--js-flags="--max-old-space-size=2048"

# Performance flags
--single-process
--no-zygote
--disable-features=site-per-process

# Security flags
--disable-web-security
--disable-features=IsolateOrigins,site-per-process
```

### C. Metrics and Monitoring

```bash
# Prometheus metrics endpoint
curl -s http://172.20.0.20:3000/metrics

# Key metrics to monitor:
# - browserless_sessions_active
# - browserless_sessions_total
# - browserless_queue_length
# - browserless_request_duration_seconds
# - browserless_errors_total
```

### D. Related Documentation

- [Browserless Official Docs](https://docs.browserless.io/)
- [HAProxy Documentation](http://cbonte.github.io/haproxy-dconv/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Puppeteer Documentation](https://pptr.dev/)

### E. Support Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-call Engineer | #incidents | P0-P1 |
| Infrastructure Team | #infrastructure | P1-P2 |
| Browserless Maintainers | @browserless-team | All |

---

## Document Information

**Author:** SIN-Solver Infrastructure Team  
**Reviewers:** DevOps, SRE, Backend Teams  
**Review Cycle:** Quarterly  
**Next Review:** 2026-04-30  
**Version History:**
- v1.0 (2026-01-31): Initial release

---

*This document is a living guide. Please update it with new issues and solutions as they are discovered.*
