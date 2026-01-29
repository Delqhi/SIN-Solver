# Room-01 Dashboard Cockpit - Troubleshooting

## Common Issues and Solutions

This document provides solutions to common problems encountered when using the Room-01 Dashboard Cockpit.

---

## Installation & Setup Issues

### Issue: Docker Socket Permission Denied

**Symptoms:**
```
Error: connect EACCES /var/run/docker.sock
```

**Solution:**
1. Add your user to the docker group:
   ```bash
   sudo usermod -aG docker $USER
   ```
2. Log out and log back in
3. Verify permissions:
   ```bash
   ls -la /var/run/docker.sock
   ```

**Alternative (Development Only):**
```bash
sudo chmod 666 /var/run/docker.sock
```

---

### Issue: Container Won't Start

**Symptoms:**
- Dashboard container exits immediately
- Port already in use errors

**Solution:**
1. Check if port 3011 is already in use:
   ```bash
   lsof -i :3011
   ```
2. Stop conflicting service or change port in docker-compose.yml
3. Check container logs:
   ```bash
   docker logs room-01-dashboard-cockpit
   ```

---

### Issue: Missing Environment Variables

**Symptoms:**
```
Error: Required environment variable DOCKER_HOST is not set
```

**Solution:**
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Fill in required values:
   ```bash
   DOCKER_HOST=unix:///var/run/docker.sock
   API_BRAIN_URL=http://room-13-vault-api:8000
   ```
3. Restart the container

---

## Runtime Issues

### Issue: Dashboard Not Loading

**Symptoms:**
- Blank page in browser
- 404 errors in console

**Solution:**
1. Check if the container is running:
   ```bash
   docker ps | grep room-01
   ```
2. Verify network connectivity:
   ```bash
   curl http://localhost:3011/api/health
   ```
3. Check for build errors:
   ```bash
   docker logs room-01-dashboard-cockpit
   ```

---

### Issue: Container List Empty

**Symptoms:**
- No containers shown in sidebar
- "No containers found" message

**Solution:**
1. Verify Docker socket is mounted:
   ```bash
   docker inspect room-01-dashboard-cockpit | grep -A 5 "Mounts"
   ```
2. Check Docker daemon is running:
   ```bash
   docker info
   ```
3. Verify the dashboard can access Docker:
   ```bash
   docker exec -it room-01-dashboard-cockpit sh
   curl --unix-socket /var/run/docker.sock http://localhost/containers/json
   ```

---

### Issue: High CPU Usage

**Symptoms:**
- Dashboard consuming excessive CPU
- System slowdown

**Solution:**
1. Reduce polling frequency in settings
2. Disable real-time metrics for unused containers
3. Check for memory leaks:
   ```bash
   docker stats room-01-dashboard-cockpit
   ```

---

### Issue: Iframe Content Not Loading

**Symptoms:**
- External tools (n8n, Steel) show blank iframes
- X-Frame-Options errors in console

**Solution:**
1. Check CORS configuration in target service
2. Use proxy/rewrite configuration in next.config.js
3. For services with X-Frame-Options: DENY, use "Open in New Tab" option

---

## API Issues

### Issue: API Endpoints Returning 500

**Symptoms:**
- Internal Server Error on API calls
- Container actions failing

**Solution:**
1. Check API logs:
   ```bash
   docker logs room-01-dashboard-cockpit 2>&1 | grep ERROR
   ```
2. Verify API Brain is accessible:
   ```bash
   curl http://room-13-vault-api:8000/health
   ```
3. Check network connectivity between containers:
   ```bash
   docker network inspect delqhi-platform_default
   ```

---

### Issue: File Access Denied

**Symptoms:**
- Cannot view AGENTS.md or lastchanges.md
- 403 Forbidden errors

**Solution:**
1. Verify file whitelist configuration
2. Check file permissions:
   ```bash
   ls -la /app/docs/
   ```
3. Ensure files are mounted as volumes in docker-compose.yml

---

## Performance Issues

### Issue: Slow Page Load

**Symptoms:**
- Dashboard takes > 5 seconds to load
- Laggy UI interactions

**Solution:**
1. Enable production build:
   ```bash
   NODE_ENV=production npm run build
   ```
2. Enable caching:
   - Redis for session storage
   - Browser caching for static assets
3. Optimize images and assets
4. Use CDN for external resources

---

### Issue: Memory Leaks

**Symptoms:**
- Memory usage grows over time
- Container OOM killed

**Solution:**
1. Set memory limits:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512M
   ```
2. Enable garbage collection logging
3. Profile memory usage:
   ```bash
   docker exec -it room-01-dashboard-cockpit sh
   node --inspect=0.0.0.0:9229 server.js
   ```

---

## Network Issues

### Issue: Cannot Connect to Other Services

**Symptoms:**
- Timeout errors when connecting to n8n, Steel, etc.
- Network errors in logs

**Solution:**
1. Verify all services are on the same Docker network:
   ```bash
   docker network ls
   docker network inspect delqhi-platform_default
   ```
2. Check service discovery:
   ```bash
   docker exec -it room-01-dashboard-cockpit sh
   nslookup agent-01-n8n-manager
   ```
3. Verify firewall rules

---

### Issue: Cloudflare Tunnel Not Working

**Symptoms:**
- Cannot access dashboard via public URL
- Connection timeout

**Solution:**
1. Check Cloudflare tunnel status:
   ```bash
   docker logs cloudflared-tunnel
   ```
2. Verify tunnel credentials are valid
3. Check DNS records in Cloudflare dashboard

---

## UI/UX Issues

### Issue: Dark Mode Not Working

**Symptoms:**
- Light mode showing despite dark mode preference
- Theme toggle not responding

**Solution:**
1. Clear browser localStorage:
   ```javascript
   localStorage.removeItem('theme')
   ```
2. Check Tailwind dark mode configuration
3. Verify className includes 'dark' class

---

### Issue: Responsive Layout Broken

**Symptoms:**
- Layout issues on mobile devices
- Sidebar overlapping content

**Solution:**
1. Check viewport meta tag
2. Verify Tailwind responsive classes
3. Test on actual devices, not just browser resize

---

## Log Analysis

### Where to Find Logs

| Component | Log Location |
|-----------|--------------|
| Dashboard | `docker logs room-01-dashboard-cockpit` |
| Next.js | `/app/.next/logs/` |
| Nginx (if used) | `/var/log/nginx/` |
| System | `journalctl -u docker` |

### Common Log Patterns

**Healthy Startup:**
```
✓ Starting Room-01 Dashboard Cockpit
✓ Connected to Docker daemon
✓ API Brain reachable
✓ Server ready on port 3011
```

**Warning Signs:**
```
⚠ High memory usage detected: 85%
⚠ Slow API response: 5.2s
⚠ Docker socket latency: 2.1s
```

**Error Patterns:**
```
✗ Docker connection failed
✗ API Brain unreachable
✗ File permission denied
```

---

## Debug Mode

### Enable Debug Logging

Set environment variable:
```bash
DEBUG=room-01:*
LOG_LEVEL=debug
```

### Enable React DevTools

```bash
NODE_ENV=development
REACT_DEVTOOLS=true
```

### Docker Debug Mode

```bash
docker run -it --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 3011:3011 \
  -e DEBUG=* \
  room-01-dashboard-cockpit:latest
```

---

## Getting Help

If the issue persists:

1. **Check Documentation:**
   - [01-overview.md](./01-room-01-overview.md)
   - [04-architecture.md](./04-room-01-architecture.md)
   - [05-api-reference.md](./05-room-01-api-reference.md)

2. **Review Logs:**
   - Container logs
   - Browser console
   - Network tab

3. **Contact Support:**
   - GitHub Issues: [Delqhi-Platform Issues](https://github.com/Delqhi/Delqhi-Platform/issues)
   - Email: support@delqhi-platform.io

4. **Reference Tickets:**
   - See [troubleshooting/](../../troubleshooting/) directory for detailed ticket files

---

## Quick Fixes Checklist

- [ ] Restart the container
- [ ] Check Docker daemon is running
- [ ] Verify environment variables
- [ ] Clear browser cache
- [ ] Check network connectivity
- [ ] Review recent changes
- [ ] Check disk space
- [ ] Verify file permissions
