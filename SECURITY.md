# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.0.x   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security issues via one of these methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to [Security Advisories](https://github.com/Delqhi/Delqhi-Platform/security/advisories)
   - Click "New draft security advisory"
   - Fill in the vulnerability details

2. **Email**
   - Send details to: security@delqhi-platform.io
   - Include "SECURITY" in the subject line
   - Use our PGP key for sensitive information (available on request)

### What to Include

Please include as much of the following information as possible:

- **Type of vulnerability** (e.g., SQL injection, XSS, authentication bypass)
- **Affected component** (e.g., API, Dashboard, Docker service)
- **Version affected** (e.g., 2.0.0)
- **Steps to reproduce** the vulnerability
- **Proof of concept** code or screenshots (if applicable)
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Initial Response | Within 48 hours |
| Vulnerability Confirmation | Within 7 days |
| Fix Development | Within 30 days (critical) / 90 days (non-critical) |
| Public Disclosure | After fix is released and users have time to update |

### What to Expect

1. **Acknowledgment**: We'll confirm receipt of your report within 48 hours
2. **Assessment**: We'll investigate and assess the severity
3. **Updates**: We'll keep you informed of our progress
4. **Credit**: With your permission, we'll credit you in our security advisory

## Security Best Practices

When deploying Delqhi-Platform, follow these security guidelines:

### Environment Configuration

```bash
# NEVER use default credentials in production
POSTGRES_PASSWORD=<use-strong-random-password>
REDIS_PASSWORD=<use-strong-random-password>
SECRET_KEY=<use-cryptographically-secure-key>

# Disable debug mode in production
DEBUG=false
ENVIRONMENT=production

# Restrict API access
API_RATE_LIMIT=100
ALLOWED_ORIGINS=https://yourdomain.com
```

### Network Security

```yaml
# docker-compose.yml - Production example
services:
  room-03-postgres-master:
    # Don't expose database ports externally
    expose:
      - "5432"
    # Use internal network only
    networks:
      - sin-internal
    # Never use ports: - "5432:5432" in production!
```

### Authentication

- **API Keys**: Rotate API keys regularly (every 90 days)
- **JWT Tokens**: Use short expiration times (15 minutes for access tokens)
- **Admin Access**: Use strong passwords and enable 2FA if available

### Docker Security

```bash
# Run containers as non-root user
docker run --user 1000:1000 delqhi-platform

# Use read-only filesystem where possible
docker run --read-only delqhi-platform

# Limit container resources
docker run --memory=512m --cpus=1 delqhi-platform
```

### Database Security

- Enable SSL for database connections
- Use separate database users with minimal privileges
- Regularly backup and encrypt sensitive data
- Enable audit logging for compliance

### Secrets Management

```bash
# Use environment variables or Docker secrets
# NEVER commit secrets to git

# Good: Use Docker secrets
docker secret create postgres_password ./postgres_password.txt

# Good: Use environment files (not committed)
docker compose --env-file .env.production up

# Bad: Hardcoded in docker-compose.yml
# environment:
#   - POSTGRES_PASSWORD=mysecretpassword  # DON'T DO THIS
```

## Known Security Considerations

### By Design

1. **Steel Browser Fingerprinting**: The stealth browser is designed to evade detection, which could be misused. Use responsibly and in compliance with target site ToS.

2. **API Rate Limiting**: Default rate limits are generous for development. Tighten them in production.

3. **Container Networking**: By default, containers can communicate freely within the Docker network. Implement network policies for sensitive deployments.

### Mitigations in Place

| Risk | Mitigation |
|------|------------|
| SQL Injection | Parameterized queries via SQLAlchemy |
| XSS | React's built-in escaping + Content-Security-Policy |
| CSRF | SameSite cookies + token validation |
| DoS | Rate limiting + request size limits |
| Data Exposure | Environment-based config + no secrets in code |

## Compliance

Delqhi-Platform is designed to help meet compliance requirements, but deployment configuration is your responsibility:

- **GDPR**: No personal data collection by default; configure logging appropriately
- **SOC 2**: Audit logging available; configure retention policies
- **HIPAA**: Not recommended for healthcare data without additional hardening

## Security Updates

Stay informed about security updates:

1. **Watch this repository** for security advisories
2. **Enable Dependabot alerts** for dependency vulnerabilities
3. **Subscribe to our mailing list** (coming soon)

## Bug Bounty

We currently do not have a formal bug bounty program, but we deeply appreciate security researchers who help us improve.

For significant vulnerabilities, we offer:
- Public recognition (with permission)
- Delqhi-Platform swag (t-shirts, stickers)
- Pro tier access for personal use

---

## Contact

- **Security Issues**: security@delqhi-platform.io
- **General Support**: support@delqhi-platform.io
- **GitHub**: [Delqhi/Delqhi-Platform](https://github.com/Delqhi/Delqhi-Platform)

---

*Last updated: 2026-01-28*
