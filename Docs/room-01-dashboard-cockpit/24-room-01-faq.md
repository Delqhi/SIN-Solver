# Room-01 Dashboard Cockpit - FAQ

## Frequently Asked Questions

---

## General Questions

### What is Room-01 Dashboard Cockpit?

Room-01 Dashboard Cockpit is the central mission control interface for the Delqhi-Platform 26-Room Empire. It provides real-time monitoring and control of all Docker containers, services, and AI workers.

### What can I do with the dashboard?

- Monitor all 26 containers in real-time
- View CPU and memory usage
- Start, stop, and restart containers
- View live logs
- Access embedded tools (n8n, Steel, Skyvern)
- Browse documentation (AGENTS.md, lastchanges.md)

### Is it free to use?

Yes, the Room-01 Dashboard Cockpit is open-source and free to use under the Apache 2.0 license.

---

## Installation

### What are the system requirements?

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 10GB disk space

### How do I install it?

```bash
git clone https://github.com/Delqhi/Delqhi-Platform.git
cd Delqhi-Platform
docker compose up -d room-01-dashboard-cockpit
```

Then access http://localhost:3011

### Can I run it without Docker?

Yes, but Docker is recommended. See [07-deployment.md](./07-room-01-deployment.md) for alternative deployment methods.

---

## Usage

### How do I view container logs?

1. Click on any container card
2. Click the "Logs" tab
3. Logs will stream in real-time

### How do I start/stop a container?

1. Find the container in the sidebar
2. Click the three dots menu
3. Select "Start", "Stop", or "Restart"

### Can I access n8n from the dashboard?

Yes, click on "n8n Orchestrator" in the sidebar to open the embedded n8n interface.

---

## Troubleshooting

### Why can't I see any containers?

Check that:
1. Docker daemon is running
2. Docker socket is mounted correctly
3. You have permissions to access Docker

See [03-troubleshooting.md](./03-room-01-troubleshooting.md) for more help.

### The dashboard is slow, what can I do?

- Reduce polling interval in settings
- Enable caching
- Check system resources
- See [09-performance.md](./09-room-01-performance.md)

### How do I reset my password?

```bash
docker exec room-01-dashboard-cockpit npm run reset-password
```

---

## Security

### Is the dashboard secure?

Yes, it includes:
- JWT authentication
- Role-based access control
- HTTPS support
- Rate limiting
- Input validation

See [08-security.md](./08-room-01-security.md) for details.

### Can I use it in production?

Yes, but ensure you:
- Enable HTTPS
- Set strong passwords
- Configure firewall rules
- Enable audit logging

---

## Contributing

### How can I contribute?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

### Where can I report bugs?

GitHub Issues: https://github.com/Delqhi/Delqhi-Platform/issues

---

## Related Documentation

- [21-support.md](./21-room-01-support.md) - Support
- [03-troubleshooting.md](./03-room-01-troubleshooting.md) - Troubleshooting
